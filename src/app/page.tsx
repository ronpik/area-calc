
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapPin, Calculator, Trash2, Settings, Compass, List, ChevronsUp, ChevronsDown, Play, StopCircle, FileDown, X } from 'lucide-react';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { calculatePolygonArea, type Point } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportDialog, type KeyValue } from '@/components/export-dialog';
import { AuthButton } from '@/components/auth-button';
import type { CurrentSessionState, SessionData, SessionMeta } from '@/types/session';
import { generatePointsHash } from '@/lib/points-hash';
import { SessionIndicator } from '@/components/session-indicator';
import { useI18n } from '@/contexts/i18n-context';

const AreaMap = dynamic(() => import('@/components/area-map').then((mod) => mod.AreaMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted animate-pulse" />,
});

export type PointType = 'manual' | 'auto';

export interface TrackedPoint {
  point: Point;
  type: PointType;
  timestamp: number;
}

const LOCAL_STORAGE_KEY = 'recordedPoints';

// Export setCurrentSession type for use by other modules
export type SetCurrentSessionFn = React.Dispatch<React.SetStateAction<CurrentSessionState | null>>;

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ point: Point; accuracy: number } | null>(null);
  const [points, setPoints] = useState<TrackedPoint[]>([]);
  const [goodThreshold, setGoodThreshold] = useState(5);
  const [mediumThreshold, setMediumThreshold] = useState(10);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(5000); // 5 seconds default
  const trackingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filtering state
  const [showManual, setShowManual] = useState(true);
  const [showAuto, setShowAuto] = useState(true);

  // Selection and deletion state
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [deleteMode, setDeleteMode] = useState<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const coordinateRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [isExporting, setIsExporting] = useState(false);

  // Session state
  const [currentSession, setCurrentSession] = useState<CurrentSessionState | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load points from localStorage on initial render
  useEffect(() => {
    if (!isMounted) return;
    try {
      const storedPoints = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedPoints) {
        const parsedPoints = JSON.parse(storedPoints);
        if (Array.isArray(parsedPoints)) {
          setPoints(parsedPoints);
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error loading points',
        description: 'Could not load points from local storage.',
      });
    }
  }, [isMounted, toast]);

  // Save points to localStorage whenever they change
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(points));
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error saving points',
        description: 'Could not save points to local storage.',
      });
    }
  }, [points, toast, isMounted]);


  useEffect(() => {
    if (!isMounted) return;
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition({
          point: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        toast({
          variant: 'destructive',
          title: 'Location Error',
          description: error.message,
        });
        setCurrentPosition(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [toast, isMounted]);

  const accuracyStatus = useMemo(() => {
    if (!currentPosition) return 'unknown';
    if (currentPosition.accuracy <= goodThreshold) return 'good';
    if (currentPosition.accuracy <= mediumThreshold) return 'medium';
    return 'poor';
  }, [currentPosition, goodThreshold, mediumThreshold]);

  const recordPoint = useCallback((type: PointType) => {
    if (currentPosition) {
      const newPoint: TrackedPoint = {
        point: currentPosition.point,
        type: type,
        timestamp: Date.now(),
      };
      setPoints(prevPoints => [...prevPoints, newPoint]);
    }
  }, [currentPosition]);


  const handleRecordLocation = () => {
    recordPoint('manual');
  };

  const handleReset = () => {
    if(isTracking) {
        setIsTracking(false);
    }
    setPoints([]);
    setSelectedPointIndex(null);
    setDeleteMode(null);
  };

  // Tracking effect
  useEffect(() => {
    if (isTracking) {
      trackingTimerRef.current = setInterval(() => {
        recordPoint('auto');
      }, trackingInterval);
    } else {
      if (trackingTimerRef.current) {
        clearInterval(trackingTimerRef.current);
        trackingTimerRef.current = null;
      }
    }
    return () => {
      if (trackingTimerRef.current) {
        clearInterval(trackingTimerRef.current);
      }
    };
  }, [isTracking, trackingInterval, recordPoint]);

  const handleToggleTracking = () => {
    setIsTracking(prev => !prev);
  };

  const filteredPoints = useMemo(() => {
    return points
      .filter(p => {
        if (showManual && showAuto) return true;
        if (showManual) return p.type === 'manual';
        if (showAuto) return p.type === 'auto';
        return false;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [points, showManual, showAuto]);

  const calculatedArea = useMemo(() => {
    const geoPoints = filteredPoints.map(p => p.point);
    if (geoPoints.length < 3) {
      return 0;
    }
    return calculatePolygonArea(geoPoints);
  }, [filteredPoints]);

  // Compute unsaved changes - true if current points differ from saved state
  const hasUnsavedChanges = useMemo(() => {
    if (!currentSession) return false;
    return generatePointsHash(points) !== currentSession.pointsHashAtSave;
  }, [currentSession, points]);

  // Clear session and start new measurement
  const handleClearSession = useCallback(() => {
    if (isTracking) {
      setIsTracking(false);
    }
    setPoints([]);
    setCurrentSession(null);
    setSelectedPointIndex(null);
    setDeleteMode(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, [isTracking]);

  // Handle save complete - update currentSession and increment sessionCount
  const handleSaveComplete = useCallback((session: CurrentSessionState) => {
    setCurrentSession(session);
    setSessionCount(prev => prev + 1);
  }, []);

  // Handle loaded session - update points and currentSession
  const handleLoadSession = useCallback((session: SessionData, meta: SessionMeta) => {
    // Stop tracking if active
    if (isTracking) {
      setIsTracking(false);
    }

    // Update points
    setPoints(session.points);

    // Update current session state
    setCurrentSession({
      id: session.id,
      name: session.name,
      lastSavedAt: session.updatedAt,
      pointsHashAtSave: generatePointsHash(session.points)
    });

    // Update localStorage with loaded points
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session.points));

    // Clear selection state
    setSelectedPointIndex(null);
    setDeleteMode(null);

    // Show toast
    toast({
      title: t('sessions.sessionLoaded', { name: session.name })
    });
  }, [isTracking, toast, t]);

  // Handle point selection from list
  const handlePointClick = (index: number) => {
    setSelectedPointIndex(index);
    setDeleteMode(null); // Exit delete mode when selecting
  };

  // Handle point selection from map
  const handleMapPointClick = useCallback((index: number) => {
    setSelectedPointIndex(index);
    setDeleteMode(null);
    
    // Scroll to the coordinate in the list
    const element = coordinateRefs.current[index];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Long press handlers
  const handleLongPressStart = (index: number) => {
    longPressTimerRef.current = setTimeout(() => {
      setDeleteMode(index);
      // Provide haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Delete point handler
  const handleDeletePoint = (index: number) => {
    setPoints(prevPoints => prevPoints.filter((_, i) => i !== index));
    setDeleteMode(null);
    setSelectedPointIndex(null);
    
    toast({
      title: 'Point deleted',
      description: `Point ${index + 1} has been removed.`,
    });
  };

  const mapCenter = currentPosition?.point ?? (points.length > 0 ? points[0].point : { lat: 51.5074, lng: -0.1278 });
  const mapPoints = useMemo(() => filteredPoints, [filteredPoints]);

  return (
    <main className="h-full w-full relative overflow-hidden">
      {isMounted ? (
        <AreaMap
          currentPosition={currentPosition?.point ?? null}
          trackedPoints={mapPoints}
          center={mapCenter}
          zoom={18}
          selectedPointIndex={selectedPointIndex}
          onPointClick={handleMapPointClick}
        />
      ) : <div className="h-full w-full bg-muted animate-pulse" />}
      
      <ExportDialog open={isExporting} onOpenChange={setIsExporting} area={calculatedArea} points={filteredPoints} />

      <AuthButton
        className="absolute top-4 right-4 z-[1000]"
        points={points}
        area={calculatedArea}
        currentSession={currentSession}
        sessionCount={sessionCount}
        onSaveComplete={handleSaveComplete}
        onLoadSession={handleLoadSession}
      />

      <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:max-w-md z-[1000]">
        {!isPanelExpanded ? (
          <div className="flex justify-end">
            <Button
              onClick={handleRecordLocation}
              disabled={!currentPosition}
              className={cn('transition-all duration-300 shadow-2xl', {
                'bg-green-600 hover:bg-green-700 text-white': accuracyStatus === 'good',
                'bg-accent hover:bg-accent/90': accuracyStatus === 'medium',
                'bg-destructive hover:bg-destructive/90': accuracyStatus === 'poor',
                'bg-muted text-muted-foreground': accuracyStatus === 'unknown',
              })}
            >
              <MapPin className="mr-2" /> Record Location
            </Button>
             <Button size="icon" variant="secondary" onClick={() => setIsPanelExpanded(true)} className="ml-2 shadow-2xl">
              <ChevronsUp />
            </Button>
          </div>
        ) : (
          <Card className="shadow-2xl">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Compass /> AreaCalc
                    </CardTitle>
                    <CardDescription>
                      Location Accuracy:{' '}
                      <span className={cn(
                        'font-bold',
                        { 'text-green-600': accuracyStatus === 'good' },
                        { 'text-accent': accuracyStatus === 'medium' },
                        { 'text-destructive': accuracyStatus === 'poor' },
                        { 'text-muted-foreground': accuracyStatus === 'unknown' }
                      )}>
                        {currentPosition ? `${currentPosition.accuracy.toFixed(1)}m (${accuracyStatus})` : 'Acquiring...'}
                      </span>
                    </CardDescription>
                    <SessionIndicator
                      currentSession={currentSession}
                      hasUnsavedChanges={hasUnsavedChanges}
                      onClear={handleClearSession}
                    />
                  </div>
                   <Button size="icon" variant="ghost" onClick={() => setIsPanelExpanded(false)}>
                      <ChevronsDown />
                    </Button>
              </div>
            </CardHeader>
            <CardContent className="py-0">
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-medium text-sm text-muted-foreground">Points Recorded</h3>
                  <p className="font-bold text-lg">{filteredPoints.length} / {points.length}</p>
                </div>
                <div className="flex justify-between items-baseline">
                  <h3 className="font-medium text-sm text-muted-foreground">Calculated Area</h3>
                  <p className="text-2xl font-bold">
                    {calculatedArea.toFixed(2)} m²
                  </p>
                </div>
                 <div className="flex items-center space-x-4 justify-center pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-manual" checked={showManual} onCheckedChange={(checked) => setShowManual(!!checked)} />
                        <label htmlFor="show-manual" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Manual
                        </label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="show-auto" checked={showAuto} onCheckedChange={(checked) => setShowAuto(!!checked)} />
                        <label htmlFor="show-auto" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Auto
                        </label>
                    </div>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="coordinates">
                    <AccordionTrigger className="text-sm">
                      <List className="mr-2 h-4 w-4" /> Recorded Coordinates
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-32 w-full">
                        <div className="space-y-2 pr-4">
                          {points.length === 0 && <p className="text-sm text-muted-foreground">No points recorded yet.</p>}
                          {points.map((trackedPoint, index) => (
                            <div
                              key={trackedPoint.timestamp}
                              ref={(el) => { coordinateRefs.current[index] = el; }}
                              className={cn(
                                "relative flex justify-between items-center text-xs p-2 rounded-md transition-all duration-200 cursor-pointer select-none",
                                "active:scale-[0.98]", // Press feedback
                                {
                                  'bg-primary/20 ring-2 ring-primary shadow-md scale-105': selectedPointIndex === index,
                                  'bg-muted hover:bg-muted/80': selectedPointIndex !== index,
                                }
                              )}
                              onClick={() => handlePointClick(index)}
                              onTouchStart={() => handleLongPressStart(index)}
                              onTouchEnd={handleLongPressEnd}
                              onTouchCancel={handleLongPressEnd}
                              onMouseDown={() => handleLongPressStart(index)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              style={{ minHeight: '44px' }} // Minimum touch target
                            >
                              <span className="font-mono text-foreground">
                                {index + 1}.
                              </span>
                               <span className={cn("font-mono", {
                                 'text-primary': trackedPoint.type === 'manual',
                                 'text-accent-foreground bg-accent px-1 rounded-sm': trackedPoint.type === 'auto'
                               })}>
                                {trackedPoint.type}
                               </span>
                               <span className="font-mono text-muted-foreground">
                                Lat: {trackedPoint.point.lat.toFixed(6)}
                              </span>
                               <span className="font-mono text-muted-foreground">
                                Lng: {trackedPoint.point.lng.toFixed(6)}
                              </span>
                              
                              {/* Delete button - appears on long press */}
                              {deleteMode === index && (
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="absolute -right-2 -top-2 h-8 w-8 rounded-full shadow-lg animate-in zoom-in-50 duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePoint(index);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="settings">
                    <AccordionTrigger className="text-sm">
                      <Settings className="mr-2 h-4 w-4" /> Advanced Settings
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="good-threshold">Good Accuracy (&lt;= meters)</Label>
                        <Input
                          id="good-threshold"
                          type="number"
                          value={goodThreshold}
                          onChange={(e) => setGoodThreshold(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="medium-threshold">Medium Accuracy (&lt;= meters)</Label>
                        <Input
                          id="medium-threshold"
                          type="number"
                          value={mediumThreshold}
                          onChange={(e) => setMediumThreshold(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tracking-interval">Tracking Interval (seconds)</Label>
                        <Input
                          id="tracking-interval"
                          type="number"
                          value={trackingInterval / 1000}
                          onChange={(e) => setTrackingInterval(Number(e.target.value) * 1000)}
                          min="1"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2 pt-6">
               <Button
                onClick={handleToggleTracking}
                disabled={!currentPosition}
                className={cn('transition-colors', isTracking && 'bg-destructive hover:bg-destructive/90')}
              >
                {isTracking ? <StopCircle className="mr-2" /> : <Play className="mr-2" />}
                {isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </Button>
              <Button
                onClick={handleRecordLocation}
                disabled={!currentPosition}
                className={cn('transition-all duration-300', {
                  'bg-green-600 hover:bg-green-700 text-white': accuracyStatus === 'good',
                  'bg-accent hover:bg-accent/90': accuracyStatus === 'medium',
                  'bg-destructive/80 hover:bg-destructive/90': accuracyStatus === 'poor',
                  'bg-muted text-muted-foreground': accuracyStatus === 'unknown',
                })}
              >
                <MapPin className="mr-2" /> Record Manually
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsExporting(true)}
              >
                <FileDown className="mr-2" /> Export PDF
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={points.length === 0}>
                <Trash2 className="mr-2" /> Reset
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  );
}

    