# AreaCalc: A Web-Based Area Measurement Tool

This is a Next.js application built in Firebase Studio that allows users to measure the area of a geographical location using their device's GPS.

## Purpose

The primary goal of AreaCalc is to provide a simple, accessible tool for measuring land area on the go. Users can walk the perimeter of an area, and the application will track their path, visualize it on a map, and calculate the enclosed area in square meters. It is designed for use cases such as farming, landscaping, real estate assessment, or event planning.

## Key Features

- **Interactive Map:** Utilizes OpenStreetMap via `react-leaflet` to display the user's current location and the recorded area without requiring any API keys.
- **GPS Location Tracking:** Shows the user's real-time position on the map, along with a visual indicator of GPS accuracy (Good, Medium, Poor).
- **Manual & Automatic Point Recording:**
  - **Manual:** Users can tap a "Record Location" button to capture a specific point.
  - **Automatic:** A "Start Tracking" feature automatically records points at a user-configurable interval (defaulting to 5 seconds). This is ideal for walking or driving around a perimeter.
- **Dynamic Area Calculation:** As points are recorded, a polygon is drawn on the map. If three or more points exist, the enclosed area is calculated in real-time using the Shoelace formula.
- **Point Filtering:** Users can toggle the visibility of manual or automatic points, and the area calculation will update accordingly.
- **Collapsible Control Panel:** A floating panel on top of the map provides all controls and information. It can be expanded to show details or collapsed to a single button for a less obstructed map view.
- **Data Persistence:** All recorded points are saved in the browser's `localStorage`, ensuring data is not lost between sessions.
- **PDF Export:** Users can export a detailed report as a PDF. The export dialog allows for customization, including:
  - A report title.
  - Structured key-value notes.
  - A free-form text area for general notes.
  - An option to include the raw list of coordinates.
  - The generated PDF includes a snapshot of the map and all the user-provided information.

## Code Structure

The application is built with Next.js and TypeScript, following modern React best practices.

- **`src/app/page.tsx`**: The main entry point and component for the application. It manages all the application state, including the user's position, recorded points, tracking status, and UI state. It brings together the map and control panel.
- **`src/components/area-map.tsx`**: A client-side component responsible for rendering the `react-leaflet` map. It displays the user's current location marker, the recorded points (as squares or circles), and the calculated area polygon. It is dynamically imported with SSR disabled to avoid common issues with browser-only libraries.
- **`src/components/export-dialog.tsx`**: A dialog component for configuring and generating the PDF report. It uses `jspdf` to create the document and `html2canvas` to capture an image of the map for inclusion in the report.
- **`src/components/ui/`**: Contains reusable UI components built with **ShadCN UI**, such as `Button`, `Card`, `Dialog`, and `Input`. These provide a consistent and professional look and feel.
- **`src/lib/geo.ts`**: A utility file containing the `calculatePolygonArea` function, which performs the core area calculation.
- **`src/app/globals.css`**: Defines the global styles and Tailwind CSS theme variables, providing a consistent color palette and design system for the app.
- **`next.config.ts`**: The configuration file for Next.js.
- **`package.json`**: Lists all project dependencies, including `react`, `next`, `leaflet`, `react-leaflet`, `jspdf`, `html2canvas`, and various ShadCN UI and utility packages.