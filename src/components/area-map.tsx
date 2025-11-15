"use client";

import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

import type { FC } from 'react';
import React, { memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, CircleMarker, Rectangle } from 'react-leaflet';
import type { Point } from '@/lib/geo';
import { LatLngExpression, LatLngBoundsExpression, divIcon } from 'leaflet';
import type { TrackedPoint } from '@/app/page';


interface AreaMapProps {
  currentPosition: Point | null;
  trackedPoints: TrackedPoint[];
  center: Point;
  zoom: number;
  selectedPointIndex?: number | null;
  onPointClick?: (index: number) => void;
}

const ChangeView: FC<{ center: LatLngExpression; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  const prevCenterRef = React.useRef<LatLngExpression | null>(null);

  React.useEffect(() => {
    // Only update the center if it has changed significantly
    // This prevents resetting zoom on every tiny GPS update
    const [newLat, newLng] = Array.isArray(center) ? center : [center.lat, center.lng];

    if (prevCenterRef.current) {
      const [prevLat, prevLng] = Array.isArray(prevCenterRef.current)
        ? prevCenterRef.current
        : [prevCenterRef.current.lat, prevCenterRef.current.lng];

      // Only update if the center moved more than ~10 meters (roughly 0.0001 degrees)
      const latDiff = Math.abs(newLat - prevLat);
      const lngDiff = Math.abs(newLng - prevLng);

      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        // Get the user's current zoom level and preserve it
        const currentZoom = map.getZoom();
        map.setView(center, currentZoom, { animate: false });
        prevCenterRef.current = center;
      }
    } else {
      // First render - set initial view with provided zoom
      map.setView(center, zoom, { animate: false });
      prevCenterRef.current = center;
    }
  }, [center, zoom, map]);

  return null;
}

const MapInstanceExposer: FC = () => {
  const map = useMap();

  React.useEffect(() => {
    // Expose map instance for PDF export functionality
    (window as any).leafletMap = map;

    return () => {
      // Cleanup on unmount
      delete (window as any).leafletMap;
    };
  }, [map]);

  return null;
}

const MapLayers: FC<Omit<AreaMapProps, 'center' | 'zoom'>> = ({ 
  currentPosition, 
  trackedPoints,
  selectedPointIndex,
  onPointClick 
}) => {
    const points = trackedPoints.map(p => p.point);
    const polygonPositions = points.map(p => [p.lat, p.lng] as [number, number]);

    return (
        <>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={22}
                maxNativeZoom={19}
            />
            {currentPosition && (
                <Marker position={[currentPosition.lat, currentPosition.lng]}>
                  <Popup>Your current location</Popup>
                </Marker>
            )}

            {trackedPoints.map((trackedPoint, index) => {
              const isSelected = selectedPointIndex === index;
              const numberIcon = divIcon({
                  html: `<div class="bg-white/80 backdrop-blur-sm w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-gray-700 shadow-md ring-1 ring-gray-300">${index + 1}</div>`,
                  className: 'bg-transparent border-0',
                  iconSize: [20, 20],
                  iconAnchor: [10, 25]
              });
              
              if (trackedPoint.type === 'manual') {
                  // Enlarge selected manual points
                  const size = isSelected ? 0.00004 : 0.00002;
                  const bounds: LatLngBoundsExpression = [
                      [trackedPoint.point.lat - size, trackedPoint.point.lng - size * 1.5],
                      [trackedPoint.point.lat + size, trackedPoint.point.lng + size * 1.5]
                  ];
                  
                  return (
                      <React.Fragment key={`point-${index}`}>
                        <Rectangle 
                          bounds={bounds} 
                          pathOptions={{ 
                            color: isSelected ? 'hsl(var(--primary))' : 'red',
                            weight: isSelected ? 3 : 1,
                            fillOpacity: isSelected ? 0.4 : 0.2
                          }}
                          eventHandlers={{
                            click: () => {
                              if (onPointClick) {
                                onPointClick(index);
                              }
                            }
                          }}
                        >
                            <Popup>
                              <div className="text-xs">
                                <strong>Manual Point {index + 1}</strong>
                                <br />
                                Lat: {trackedPoint.point.lat.toFixed(6)}
                                <br />
                                Lng: {trackedPoint.point.lng.toFixed(6)}
                              </div>
                            </Popup>
                        </Rectangle>
                         <Marker position={[trackedPoint.point.lat, trackedPoint.point.lng]} icon={numberIcon} />
                      </React.Fragment>
                  )
              }
              
              // Auto points - enlarge when selected
              return (
                <React.Fragment key={`point-${index}`}>
                  <CircleMarker 
                    center={[trackedPoint.point.lat, trackedPoint.point.lng]} 
                    radius={isSelected ? 6 : 3}
                    pathOptions={{
                      color: isSelected ? 'hsl(var(--primary))' : 'gray',
                      weight: isSelected ? 2 : 1,
                      fillOpacity: isSelected ? 0.6 : 0.4
                    }}
                    eventHandlers={{
                      click: () => {
                        if (onPointClick) {
                          onPointClick(index);
                        }
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong>Auto Point {index + 1}</strong>
                        <br />
                        Lat: {trackedPoint.point.lat.toFixed(6)}
                        <br />
                        Lng: {trackedPoint.point.lng.toFixed(6)}
                      </div>
                    </Popup>
                  </CircleMarker>
                  <Marker position={[trackedPoint.point.lat, trackedPoint.point.lng]} icon={numberIcon} />
                </React.Fragment>
              )
            })}

            {points.length > 2 && (
                <Polygon
                  positions={polygonPositions}
                  pathOptions={{
                    color: 'hsl(var(--primary))',
                    fillColor: 'hsl(var(--primary))',
                    fillOpacity: 0.3,
                    weight: 2
                  }}
                />
            )}
        </>
    );
}


const AreaMapComponent: FC<AreaMapProps> = ({ 
  currentPosition, 
  trackedPoints, 
  center, 
  zoom,
  selectedPointIndex,
  onPointClick 
}) => {
    return (
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <ChangeView center={[center.lat, center.lng]} zoom={zoom} />
          <MapInstanceExposer />
          <MapLayers
            currentPosition={currentPosition}
            trackedPoints={trackedPoints}
            selectedPointIndex={selectedPointIndex}
            onPointClick={onPointClick}
          />
        </MapContainer>
      );
}

export const AreaMap = memo(AreaMapComponent);
AreaMap.displayName = 'AreaMap';
