/**
 * Photo library logic: which photo comes next, camera-info captions,
 * file checks and resize math. Pure TypeScript, no DOM.
 */

/** Camera info read from a photo. GPS is never read or stored. */
export interface ExifInfo {
  make?: string
  model?: string
  lens?: string
  focalLength?: number
  fNumber?: number
  /** Seconds, e.g. 0.004 for 1/250 s. */
  exposureTime?: number
  iso?: number
  /** Date taken, in milliseconds since 1970. */
  takenAt?: number
}

/** Everything we know about a photo except the image data itself. */
export interface PhotoMeta {
  id: string
  /** File name without the extension, used as the caption title. */
  title: string
  addedAt: number
  /** Size of the stored display copy. */
  width: number
  height: number
  favorite: boolean
  hidden: boolean
  exif: ExifInfo | null
  /** True for the bundled sample photos (not stored in the database). */
  sample?: boolean
}

export type PhotoChangeMode = 'session' | 'every' | 'break'

/** Favorites show up about this many times as often. */
export const FAVORITE_WEIGHT = 3

/** Display copy and thumbnail sizes (SPEC.md section 4). */
export const DISPLAY_MAX_SIDE = 2732
export const THUMB_MAX_SIDE = 300
export const DISPLAY_JPEG_QUALITY = 0.85

/**
 * Pick the next photo at random. Hidden photos are skipped, favorites count
 * 3 times, and the current photo is avoided unless it is the only one.
 * `random` returns a number in [0, 1); pass your own for tests.
 * Returns null if every photo is hidden (or there are none).
 */
export function pickNextPhoto(
  photos: readonly PhotoMeta[],
  currentId: string | null,
  random: () => number = Math.random,
): string | null {
  const visible = photos.filter((p) => !p.hidden)
  if (visible.length === 0) return null
  const candidates = visible.length === 1 ? visible : visible.filter((p) => p.id !== currentId)
  const weights = candidates.map((p) => (p.favorite ? FAVORITE_WEIGHT : 1))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = random() * total
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r < 0) return candidates[i].id
  }
  return candidates[candidates.length - 1].id
}

/** A photo may be hidden only if at least one other visible photo stays. */
export function canHide(photos: readonly PhotoMeta[], id: string): boolean {
  return photos.some((p) => p.id !== id && !p.hidden)
}

/** Should the photo change because of this timer event? (Used for "At each break".) */
export function changesPhotoOn(mode: PhotoChangeMode, event: { type: string; from?: string }): boolean {
  if (mode !== 'break') return false
  return event.type === 'focusCompleted' || (event.type === 'skipped' && event.from === 'focus')
}

function trimNumber(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.0+$/, '')
}

/** "1/250s", "0.5s", "15s" */
export function formatShutter(seconds: number): string {
  if (seconds >= 0.3) return `${trimNumber(seconds, 1)}s`
  return `1/${Math.round(1 / seconds)}s`
}

/**
 * One-line camera summary, like the prototype: "ILCE-7M4 · 70mm · f/8 · 1/250s · ISO 100".
 * Returns null when there is nothing to show.
 */
export function formatExifLine(exif: ExifInfo | null | undefined): string | null {
  if (!exif) return null
  const parts: string[] = []
  if (exif.model) parts.push(exif.model.trim())
  if (exif.focalLength && exif.focalLength > 0) parts.push(`${Math.round(exif.focalLength)}mm`)
  if (exif.fNumber && exif.fNumber > 0) parts.push(`f/${trimNumber(exif.fNumber, 1)}`)
  if (exif.exposureTime && exif.exposureTime > 0) parts.push(formatShutter(exif.exposureTime))
  if (exif.iso && exif.iso > 0) parts.push(`ISO ${Math.round(exif.iso)}`)
  return parts.length ? parts.join(' · ') : null
}

/** "IMG_1234.JPG" -> "IMG_1234" */
export function titleFromFileName(name: string): string {
  const base = name.replace(/^.*[\\/]/, '')
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

const RAW_EXTENSIONS = ['arw', 'cr2', 'cr3', 'nef', 'nrw', 'dng', 'raf', 'orf', 'rw2', 'pef', 'srw']

/** Camera RAW files can't be shown in a browser; we ask the user to export a JPEG. */
export function isRawFileName(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return RAW_EXTENSIONS.includes(ext)
}

/** Shrink (never enlarge) a width/height so the longest side is at most `maxSide`. */
export function scaleToFit(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxSide || longest === 0) return { width, height }
  const k = maxSide / longest
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) }
}

/** "12.4 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

export interface PhotoChangeSettings {
  mode: PhotoChangeMode
  /** Used when mode is "every". */
  everyMinutes: number
}

export const DEFAULT_PHOTO_CHANGE: PhotoChangeSettings = { mode: 'break', everyMinutes: 5 }
export const EVERY_MINUTES_OPTIONS = [1, 5, 10, 25] as const

export function normalizePhotoChange(saved: Partial<PhotoChangeSettings> | null | undefined): PhotoChangeSettings {
  const s = { ...DEFAULT_PHOTO_CHANGE, ...(saved ?? {}) }
  const mode: PhotoChangeMode = s.mode === 'session' || s.mode === 'every' ? s.mode : 'break'
  const every = Number(s.everyMinutes)
  return { mode, everyMinutes: Number.isFinite(every) && every > 0 ? every : DEFAULT_PHOTO_CHANGE.everyMinutes }
}
