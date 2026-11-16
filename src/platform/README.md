# platform/
Device-specific code (storage, image decoding, file import, audio, wake lock, fullscreen, offline service worker).
Each piece has a small interface in `types.ts`. Only this folder changes when we
wrap the app with Capacitor: we add native versions of these interfaces.
