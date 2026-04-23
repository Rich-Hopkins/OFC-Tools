# OFC Tools

OFC Tools is a small React app for the Bike-a-Thon lap tracker and related event tools.

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

## GitHub Pages

This repository is configured to publish to GitHub Pages from GitHub Actions whenever a change is merged into `master` and pushed to GitHub.

The public URL will be:

`https://rich-hopkins.github.io/OFC-New/`

If the repository name changes, the URL path changes to match the repo name.

## Notes

The app registers a service worker from `public/sw.js` so the interface and cached assets remain available offline after the app has been loaded once.
