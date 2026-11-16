# Photo Focus

A focus timer and clock that shows your own photos, full screen. A web app (PWA) for iPad, iPhone and Mac.
No accounts and no server: your photos, music and stats stay on your device.

**Open it:** https://haruki7315.github.io/photo-focus/

## Install

- **iPhone / iPad:** open the link in Safari → Share → **Add to Home Screen**. It then opens full screen,
  keeps the screen on and works offline.
- **Mac:** open the link in any browser. Use the **Full screen** button (or press F).
  In Safari you can also use File → **Add to Dock**.

The Home Screen app and the browser keep separate data. To move photos between them (or between devices),
use **Settings → Photos → Export album / Import album**.

## Features

- **Photos:** add from Photos, Files, iCloud Drive or an SSD. The app keeps a resized copy (originals are never
  changed) and shows camera info, never GPS. Favorites show about 3× as often; hidden photos are skipped.
- **Albums:** a photo can be in several albums. Pick an album and the timer only shows its photos.
  Export an album as a `.pfalbum` file, AirDrop it, and import it on another device.
- **Look:** whole photo or fill, blurred or solid background, mat border, caption, night mode,
  and photo reveal (puzzle pieces or black-and-white to color).
- **Clock:** Focus timer (focus / break / long break) or plain clock, with 12 clock faces.
- **Sound:** your own music files, ambient sounds, and an end-of-session sound. No music is bundled.
- **Stats:** today, this week, streak, time by task, a gallery of completed photos, and CSV export.

### Gestures and keys

| Action | Touch | Mac |
| --- | --- | --- |
| Show / hide controls | tap | click |
| Next / previous photo | swipe left / right | ← / → |
| Start / pause | control bar | Space |
| Full screen | Home Screen app | F |

## For developers

Vite + React + TypeScript. Storage in IndexedDB. Offline support via `vite-plugin-pwa`.

```
npm install
npm run dev      # run locally at http://localhost:5173/photo-focus/
npm test         # unit tests (Vitest)
npm run lint     # ESLint, also checks that src/core/ stays pure
npm run build    # production build into dist/
```

Pushing to `main` lints, tests, builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

### Folders

```
src/
  core/      pure TypeScript, no DOM: timer, sun/moon math, stats, photo picking, albums, tile order
  platform/  device-specific code: IndexedDB, image import, audio, wake lock, fullscreen, service worker, zip files
  faces/     one component per clock face
  features/  focus screen, photos, clock, sound, stats, settings
  ui/        shared controls (segmented, swatches, rows, icons)
```

`core/` never imports from `platform/` or React, so a native version (Capacitor) only needs new
`platform/` code. See `SPEC.md` for the full spec and `reference/playground.html` for the original prototype.

Fonts are bundled from Fontsource (SIL Open Font License).
