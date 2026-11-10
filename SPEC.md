# Photo Focus — Version 1 Spec (web app / PWA)

A focus timer and clock that shows my own photos. Runs on iPad, iPhone and Mac as an installable web app (Add to Home Screen). Built so it can later be wrapped with Capacitor for the App Store without a rewrite.

`reference/playground.html` is a working prototype of almost every visual feature below. Use it as the source of truth for look and behavior (clock faces, sun/moon math, puzzle reveal, sounds, stats chart). Port its logic into clean modules; do not copy it as one big file.

---

## 1. Tech stack

- Vite + React + TypeScript
- Storage: IndexedDB (use `idb` or Dexie). No server, no accounts.
- PWA: `vite-plugin-pwa` (manifest, service worker, offline cache)
- Zip export/import: `fflate`
- EXIF: `exifr`
- Tests: Vitest for pure logic
- Hosting: GitHub Pages, deployed by a GitHub Action on push to `main`

## 2. Folder structure (keep platform code separate)

```
src/
  core/        pure TypeScript, no DOM: timer engine, sun/moon math, stats, photo picking, tile order
  platform/    everything device-specific behind interfaces: storage, wake lock, file import, audio
  faces/       one component per clock face
  features/    photos, reveal, sound, stats, settings screens
  ui/          shared components (tabs, segmented control, swatches, sliders)
```

Rule: `core/` must not import from `platform/` or React. This is what makes the Capacitor move easy later (only `platform/` gets new implementations).

## 3. Screens

1. **Focus screen** (main): fullscreen photo + clock overlay. No visible buttons while running. Gestures:
   - tap: show/hide a small control bar (Start/Pause, Skip, Next photo, Favorite, Hide, Settings)
   - swipe left/right: next / previous photo
   - auto-hide controls after 4 s
2. **Settings sheet** with tabs: Photos, Look, Clock, Sound, Stats (same grouping as the playground).
3. **First run**: short empty state: "Add your photos to start" with one big button. Include 3 bundled sample photos so the app is never blank.

Layout must work on: iPad landscape/portrait, iPhone portrait/landscape, Mac browser. Respect safe areas (notch, home indicator).

## 4. Features

### Photos
- Import from Files (works with an SSD plugged into the iPad, iCloud Drive, Downloads). Multiple selection.
- On import, make a display copy: longest side 2732 px, JPEG quality 0.85, plus a 300 px thumbnail. Store both in IndexedDB. Never modify originals.
- Read EXIF on import (model, focal length, f-number, shutter, ISO, date taken). Never show GPS.
- RAW files (.ARW, .CR3, .NEF): show a friendly message to export JPEG first.
- Albums: create, rename, delete; a photo can be in several albums. Choose the active album for a session.
- Favorite (shows ~3x as often) and Hide (skipped until unhidden).
- Photo change mode: same all session / every N minutes / at each break.
- **Export / Import album** (`.pfalbum` = zip of `album.json` + display images + thumbnails). Use case: pick and organize photos on the Mac, AirDrop or iCloud the file to the iPad, import in one tap.
- Show storage used and call `navigator.storage.persist()` on first import.

### Look
- Device-independent: photo fit (whole photo / fill), background (blurred photo, black, charcoal, white, stone, navy, forest, custom color), mat border, photo info caption (EXIF), night mode.
- Photo reveal: None / Puzzle pieces / Develop (B&W → color).
  - Puzzle pieces: one piece per focus minute (25 for 25 min); grid shaped to the photo's aspect; order Random / In order / From center; hidden look Frosted / Solid; the current piece fades from dim to clear during its minute. Picture complete at end of session. Clock mode: 60 pieces per hour.

### Clock
- Modes: Focus timer, Clock.
- Faces: Digital, Flip, Typewriter, Dots, Ring, Analog, Hourglass, Aperture, Golden hour, Sun arc, Moon, Star trail (behaviors exactly as in the playground notes).
- Golden hour / Sun arc: location from a city list (Urbana-Champaign, Kanagawa, Tokyo, Chicago, New York, San Francisco, London) plus optional "Use my location" (Geolocation API, ask only when tapped).
- Fonts (7), color swatches + custom, 9-position placement, behind-clock (none/shadow/glass), size, opacity, seconds, 24-hour, label/date, progress bar.
- Focus/break lengths, long break after 4 sessions, "Working on" task label.
- Burn-in protection: shift the overlay by a few pixels every 3 minutes.

### Sound
- Background music: user adds audio files (stored as blobs in IndexedDB). Playlist, shuffle, next, volume.
  - Do NOT bundle any third-party music (Sharou's terms forbid redistributing files). Users add their own.
- Ambient: none / rain / ocean / soft noise (Web Audio, generated, as in the playground).
- When sound plays: focus only / focus and breaks / manual. Fade in/out ~1 s.
- End sound: shutter (default) / bell / chime / none.
- Note in UI: on iPhone/iPad web apps, sound stops when the screen locks.

### Stats and gallery
- Save each completed focus session: end time, minutes, task, photo id, small thumbnail.
- Skipped sessions are not saved.
- Stats: today, last 7 days, streak, all time; 7-day bar chart; time by task.
- Completed photos gallery (newest first), tap to view larger.
- Export stats as CSV. "Clear stats" with a two-step confirm (no browser `confirm()`).

### Device behavior
- Keep the screen awake while the focus screen is open (Screen Wake Lock API; re-request on `visibilitychange`; show a small hint if unsupported).
- Fullscreen button on desktop only (iOS uses Home Screen standalone mode instead).
- Settings saved to IndexedDB and restored on launch.
- Works fully offline after first load.

## 5. PWA details
- `manifest.webmanifest`: name "Photo Focus", short_name "Focus", display `standalone`, orientation `any`, theme/background colors, icons 192/512 + maskable.
- iOS: `apple-touch-icon` (180 px), `apple-mobile-web-app-capable`, status bar style `black-translucent`, splash-friendly background color.
- Service worker caches the app shell and fonts. User data lives in IndexedDB, not the cache.
- Vite `base` set for GitHub Pages (`/<repo-name>/`).

## 6. Milestones (build and test in this order)

1. Project setup, folder structure, GitHub Pages deploy working with a hello page.
2. Timer engine in `core/` with tests (focus, break, long break, pause, skip, demo speed for testing).
3. Photo import, IndexedDB storage, display, fit/background/mat, next photo, favorite/hide.
4. Clock overlay with Digital + Flip, all clock-look settings, settings persistence.
5. Remaining clock faces (port from playground), sun/moon math in `core/` with tests.
6. Photo reveal (puzzle pieces, develop).
7. Sound (music, ambient, end sounds).
8. Stats + gallery + CSV export.
9. PWA install, offline, wake lock, safe areas, gestures. Test on real iPad and iPhone.
10. Albums + export/import `.pfalbum`.

After each milestone: run tests, run the build, and give me a short summary of what to try on my devices.

## 7. Testing on my devices
- Easiest: push to GitHub, open the GitHub Pages URL on iPad/iPhone in Safari, Share → Add to Home Screen.
- Local network testing needs HTTPS for wake lock; use `vite --host` with `vite-plugin-mkcert`, or just use the deployed URL.

## 8. Later (version 2 / Capacitor)
- Wrap with Capacitor, add native implementations in `platform/` (Photos library access, background audio, file storage).
- iCloud sync between devices, widgets, auto clock color from photo, smart clock placement, daily mosaic.
