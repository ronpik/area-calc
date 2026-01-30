# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AreaCalc is a Next.js application for GPS-based geographical area measurement. Users walk a perimeter while the app tracks location via `navigator.geolocation`, visualizes it on OpenStreetMap (react-leaflet), and calculates enclosed area using the Shoelace formula. Target use cases: farming, landscaping, real estate assessment.

## Development Commands

```bash
npm run dev          # Development server on port 9002 (Turbopack)
npm run build        # Production build
npm run typecheck    # TypeScript checking
npm run lint         # ESLint
npm run clean        # Clear .next and cache
npm run clean:full   # Full clean including node_modules
```

## Architecture Overview

### Critical Constraint: Leaflet SSR

The map component (`area-map.tsx`) **must never be server-rendered** due to Leaflet's browser-only nature. It's loaded via `dynamic()` with `ssr: false` in `page.tsx`. The map instance is exposed globally as `window.leafletMap` for PDF export access.

### State Management

All state lives in `src/app/page.tsx`:
- GPS position + accuracy from `watchPosition`
- `TrackedPoint[]` array with `type: 'manual' | 'auto'`
- Persisted to `localStorage` under key `recordedPoints`
- Filter toggles for showing/hiding point types

### Core Components

| File | Responsibility |
|------|----------------|
| `src/app/page.tsx` | Main container: GPS tracking, point recording (manual/auto interval), filtering, state persistence |
| `src/components/area-map.tsx` | Leaflet map: markers (numbered), polygon, click selection. `ChangeView` component handles centering with zoom preservation |
| `src/components/export-dialog.tsx` | PDF generation via jsPDF + html2canvas. Hebrew RTL support via custom Rubik font |
| `src/lib/geo.ts` | `calculatePolygonArea()` using Shoelace formula on projected plane |
| `src/fonts/Rubik.ts` | Base64-encoded Rubik font loader for Hebrew PDF text |

### PDF Export Pipeline

The export process is complex and has been iteratively refined:

1. Dialog closes, map element resized to 1200x900px for consistent capture
2. Map view fitted to points bounds with padding
3. UI elements hidden before capture: zoom controls, attribution, location marker (identified by absence of `bg-transparent` class), marker shadows, and Leaflet's own polygon overlay
4. `html2canvas` captures the map tiles and custom numbered markers
5. Polygon drawn manually on canvas using `latLngToContainerPoint()` for pixel-perfect alignment
6. Original map state restored (dimensions, center, zoom)
7. jsPDF assembles document with RTL Hebrew support

### Point Visualization

- **Manual points**: Red rectangles with numbered markers
- **Auto points**: Gray circles with numbered markers
- Selected points: Enlarged with primary color highlight
- Polygon: Drawn when 3+ points exist

## Resolved Issues (Development History)

These issues have been addressed - preserved here for context if similar problems arise:

### Mobile Zoom Reset (Latest)
**Problem**: Map zoom reset to 18 on mobile due to frequent GPS updates triggering re-renders
**Solution**: `ChangeView` component wraps `map.setView()` in `useEffect` with ~10m movement threshold; preserves user's current zoom level instead of forcing default

### PDF Export Issues (Chronological)
1. **Duplicate polygon** - Leaflet's SVG polygon and manually-drawn polygon both appeared. Fixed by hiding `.leaflet-overlay-pane` before capture
2. **Polygon misalignment** - Used `latLngToContainerPoint()` for accurate coordinate projection
3. **Unwanted UI elements** - Hide zoom controls, attribution, location marker before capture
4. **Location marker shadow persisted** - Added explicit hiding of `.leaflet-marker-shadow` elements
5. **Invisible area value** - Hebrew RTL was breaking numeric rendering. Disabled RTL for numeric content
6. **Inconsistent capture dimensions** - Standardized to 1200x900px capture size regardless of device

### Map Zoom Limits
Extended `maxZoom: 22` with `maxNativeZoom: 19` to allow closer zoom (tiles auto-scale beyond native level 19)

## Known Patterns & Gotchas

### Marker Identification
Custom numbered markers have CSS class `bg-transparent border-0`. The default Leaflet location marker does not. This distinction is used in PDF export to hide only the location marker.

### Map Instance Access
The map instance is exposed via `window.leafletMap` by the `MapInstanceExposer` component. This is necessary for PDF export to access Leaflet's projection methods.

### localStorage
Points are auto-saved to `localStorage` on every change. The key is `recordedPoints`. Be aware of this when testing - data persists between sessions.

## UI Framework

- **ShadCN UI** components in `src/components/ui/`
- **Tailwind CSS** styling
- **Radix UI** primitives for accessibility
- Hebrew language support via Rubik font (PDF exports)

## Configuration Notes

- `next.config.ts`: `reactStrictMode: false`, ignores TS/ESLint errors during builds
- Path aliasing: `@/*` maps to `./src/*`
- Dev server runs on port 9002

## Maintenance Notes

When updating this file after resolving issues, add entries to "Resolved Issues" with:
- Brief problem description
- Solution summary
- Relevant files affected

This helps future sessions avoid re-investigating solved problems.
