/**
 * Fullscreen for desktop browsers. iPhone and iPad use the Home Screen app instead,
 * so we only offer it where there's a mouse/trackpad and no touch screen.
 */
export function canGoFullscreen(): boolean {
  return document.fullscreenEnabled === true && navigator.maxTouchPoints < 2 && !isStandalone()
}

export function isFullscreen(): boolean {
  return document.fullscreenElement != null
}

export function toggleFullscreen(): void {
  if (isFullscreen()) void document.exitFullscreen().catch(() => {})
  else void document.documentElement.requestFullscreen().catch(() => {})
}

export function onFullscreenChange(fn: () => void): () => void {
  document.addEventListener('fullscreenchange', fn)
  return () => document.removeEventListener('fullscreenchange', fn)
}

/** True when opened from the Home Screen / Dock as an installed app. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone or iPad Safari (iPadOS says "Macintosh" but has a touch screen). */
export function isAppleMobile(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}
