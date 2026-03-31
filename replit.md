# Recreation.gov Availability Tool

## Overview
A web app that fetches and displays campsite availability from Recreation.gov. Users can search for campgrounds by name, select multiple, pick a year and months, and see all available dates per campsite.

## Architecture

### Dev Setup (how it runs)
Two processes run concurrently via `npm run dev`:
- **Vite dev server** — port 5000 (the preview port). Serves the React/TypeScript frontend and hot-reloads on changes.
- **Express API server** (`server.js`) — port 3001. Proxies all recreation.gov API calls to avoid CORS restrictions.

Vite is configured to forward all `/api/*` requests to the Express server at `localhost:3001`.

### Frontend (`src/`)
- React + TypeScript + Vite + TailwindCSS
- `src/main.tsx` — entry point
- `src/App.tsx` — router (Home and Availability pages)
- `src/api.ts` — all recreation.gov API calls (campground search, details, availability)
- `src/types.ts` — shared TypeScript types
- `src/pages/` — HomePage, AvailabilityPage
- `src/components/` — reusable UI components
- `src/hooks/` — custom React hooks
- `src/styles/` — global CSS / theme

### Backend (`server.js`)
- Express 5 with ES modules (`"type": "module"` in package.json)
- Proxies `/api/search` → recreation.gov search API
- Proxies `/api/camps/*` → recreation.gov camps API
- In production: also serves the built `dist/` folder as a SPA

## Key Files
- `vite.config.ts` — Vite config (port 5000, proxy to :3001)
- `server.js` — Express API proxy (port 3001)
- `package.json` — `npm run dev` runs both with concurrently
- `recreationGovAvailability.js` — original vanilla JS version (kept for reference)

## Running
The "Run App" workflow runs `npm run dev` which starts both processes.
