import type { StorageInfo } from './types'

/** How much space the app uses on this device. */
export async function getStorageInfo(): Promise<StorageInfo> {
  const s = navigator.storage
  if (!s?.estimate) return { usedBytes: null, quotaBytes: null, persisted: null }
  const [est, persisted] = await Promise.all([s.estimate(), s.persisted ? s.persisted() : Promise.resolve(null)])
  return { usedBytes: est.usage ?? null, quotaBytes: est.quota ?? null, persisted }
}

/**
 * Ask the browser not to delete our data when space runs low.
 * Safari may say no for a normal tab; it usually says yes for a Home Screen app.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
