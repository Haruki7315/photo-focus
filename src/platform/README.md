# platform/
Device-specific code (storage, image decoding, file import; later wake lock and audio).
Each piece has a small interface in `types.ts`. Only this folder changes when we
wrap the app with Capacitor: we add native versions of these interfaces.
