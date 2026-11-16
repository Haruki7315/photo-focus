/**
 * Keeps the screen on while the app is open (Screen Wake Lock API).
 * The browser drops the lock whenever the app goes to the background, so we ask again
 * each time it becomes visible.
 */
export type WakeLockStatus = 'on' | 'unsupported' | 'denied' | 'off'

export function keepScreenOn(onStatus: (s: WakeLockStatus) => void): () => void {
  if (!('wakeLock' in navigator)) {
    onStatus('unsupported')
    return () => {}
  }
  let lock: WakeLockSentinel | null = null
  let stopped = false

  const request = async (afterTap: boolean) => {
    if (stopped || document.visibilityState !== 'visible' || (lock && !lock.released)) return
    try {
      lock = await navigator.wakeLock.request('screen')
      if (stopped) {
        void lock.release()
        return
      }
      onStatus('on')
      lock.addEventListener('release', () => {
        if (!stopped) onStatus('off')
      })
    } catch {
      // Some browsers refuse until the first tap; only give up if it fails after a tap too
      // (Low Power Mode, or older iOS Home Screen apps).
      if (afterTap) onStatus('denied')
    }
  }

  const onVisible = () => void request(false)
  const onTap = () => void request(true)
  document.addEventListener('visibilitychange', onVisible)
  // Some browsers only allow the request after a tap, so try again on taps too.
  document.addEventListener('pointerup', onTap)
  void request(false)

  return () => {
    stopped = true
    document.removeEventListener('visibilitychange', onVisible)
    document.removeEventListener('pointerup', onTap)
    void lock?.release()
  }
}
