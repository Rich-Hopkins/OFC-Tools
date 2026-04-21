# Bike-a-Thon Lap Tracker

A single-page React app for tracking kids' laps during a Bike-a-Thon.

## Features

- Add rider rows with a single name input
- Convert names to display-only text after entry
- Increment and decrement lap counts
- Delete riders with confirmation
- Sort committed names alphabetically
- Persist names and counts in browser local storage
- Installable PWA with offline support after the first visit

## Scripts

- `npm run dev` - start the development server
- `npm run build` - build the production app
- `npm run preview` - preview the production build

## Notes

The app registers a service worker from `public/sw.js` so the interface and cached assets remain available offline after the app has been loaded once.
