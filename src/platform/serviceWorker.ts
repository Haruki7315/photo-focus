import { registerSW } from 'virtual:pwa-register'

/**
 * Offline support. The service worker keeps a copy of the app so it opens without internet.
 * When a new version is downloaded we don't reload on our own (that would interrupt a session);
 * we tell the app, and it shows an "Update" button.
 */
type Listener = (ready: boolean) => void

let updateReady = false
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null
const listeners = new Set<Listener>()

export function startServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  applyUpdate = registerSW({
    onNeedRefresh() {
      updateReady = true
      listeners.forEach((l) => l(true))
    },
    onRegisteredSW(_url, registration) {
      // Check for a new version every hour while the app stays open (it often runs all day).
      if (registration) setInterval(() => void registration.update().catch(() => {}), 60 * 60 * 1000)
    },
  })
}

export function onUpdateReady(listener: Listener): () => void {
  listeners.add(listener)
  listener(updateReady)
  return () => listeners.delete(listener)
}

/** Switch to the new version (reloads the page). */
export function installUpdate(): void {
  void applyUpdate?.(true)
}
