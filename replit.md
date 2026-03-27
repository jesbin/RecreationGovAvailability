# Recreation.gov Availability Tool

## Overview
A web app that fetches and displays campsite availability from Recreation.gov for a given campground ID, year, and selected months.

## Architecture
- **server.js** — Express 5 server that:
  - Serves static files (HTML + JS) from the project root
  - Proxies all `/api/camps/*` requests to `recreation.gov` to bypass CORS restrictions
- **recreationGovAvailability.js** — Vanilla JS that builds the entire UI using DOM APIs and fetches data via the proxy
- **index.html** — Minimal HTML shell that loads the JS
- **availabilityExtrasLib.js** — Extra utility functions (campsite data fetching)

## Running
The "Run App" workflow runs `node server.js` on port 5000.

## Key Notes
- The original script was a browser-console paste tool. It was converted to a proper web app by adding an Express server with a recreation.gov API proxy.
- Fetch URLs in `recreationGovAvailability.js` use relative `/api/camps/` paths which the server proxies to `recreation.gov`.
