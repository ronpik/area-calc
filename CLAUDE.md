# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AreaCalc is a Next.js application that allows users to measure geographical area using GPS. Users can walk a perimeter while the app tracks their location, visualizes it on a map (via OpenStreetMap and react-leaflet), and calculates the enclosed area in square meters. The app is designed for use cases like farming, landscaping, and real estate assessment.

## Development Commands

```bash
# Start development server (runs on port 9002 with Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type checking
npm run typecheck

# Genkit AI development (if using AI features)
npm run genkit:dev
npm run genkit:watch
```

## Architecture Overview

### State Management & Data Flow

- **Main State Container**: `src/app/page.tsx` manages all application state:
  - User's current GPS position and accuracy
  - Recorded points (both manual and automatic)
  - Tracking status and configuration
  - UI state (panel expansion, point selection)
  - All state is persisted to `localStorage` under the key `recordedPoints`

### Core Components

- **`src/app/page.tsx`**: Main application entry point. Orchestrates all functionality including GPS tracking, point recording (manual/automatic), area calculation, point filtering, and state persistence. Uses dynamic import for the map component with SSR disabled.

- **`src/components/area-map.tsx`**: Client-side Leaflet map component. Must remain SSR-disabled (loaded dynamically). Renders:
  - User's current location marker
  - Manual points as rectangles (red)
  - Auto points as circles (gray)
  - Polygon visualization when 3+ points exist
  - Point selection and click handlers

- **`src/components/export-dialog.tsx`**: PDF export functionality using `jspdf` and `html2canvas`. Features:
  - Hebrew RTL text support via custom Rubik font
  - Map snapshot capture
  - Structured key-value fields and free-form notes
  - Optional coordinate list inclusion

- **`src/lib/geo.ts`**: Area calculation using the Shoelace formula on a projected plane. Good approximation for small geographical areas.

### Point Types & Filtering

Points are tracked with a `type` field:
- `manual`: User-initiated point recording
- `auto`: Automatically recorded during tracking mode

Users can filter which point types are visible, and the area calculation updates accordingly.

### GPS & Tracking

- Uses `navigator.geolocation.watchPosition` with high accuracy enabled
- Accuracy thresholds (configurable): Good ≤ 5m, Medium ≤ 10m, Poor > 10m
- Automatic tracking interval defaults to 5 seconds (user-configurable)

## UI Framework

- Built with **ShadCN UI** components (`src/components/ui/`)
- Styled with **Tailwind CSS**
- Uses Radix UI primitives for accessibility
- Hebrew language support in PDF exports

## Configuration Notes

- `next.config.ts` has `reactStrictMode: false` and ignores TypeScript/ESLint errors during builds
- The app uses path aliasing: `@/*` maps to `./src/*`
- Leaflet CSS and icon compatibility must be imported in client components

## AI/Genkit Integration

Basic Genkit setup exists in `src/ai/genkit.ts` using Google AI with Gemini 2.0 Flash model. Use genkit commands for AI feature development.

## Important Constraints

- Map component (`area-map.tsx`) must never be rendered server-side due to Leaflet's browser-only nature
- All map-related interactions must occur client-side
- localStorage persistence is critical for data retention between sessions
