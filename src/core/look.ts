/** Look settings (how the photo is shown). Pure TypeScript, no DOM. */

export type PhotoFit = 'contain' | 'cover'

export interface LookSettings {
  /** contain = whole photo, cover = fill the screen. */
  fit: PhotoFit
  /** 'blur' = blurred copy of the photo, otherwise a hex color like "#1e2229". */
  background: string
  /** Border around the photo, 0 to 14 (percent of the shorter screen side). */
  mat: number
  showPhoto: boolean
  showCaption: boolean
  night: boolean
}

export const DEFAULT_LOOK: LookSettings = {
  fit: 'contain',
  background: 'blur',
  mat: 0,
  showPhoto: true,
  showCaption: false,
  night: false,
}

export const MAT_MAX = 14

/** Preset backgrounds, same as the prototype. */
export const BACKGROUNDS: ReadonlyArray<{ value: string; name: string }> = [
  { value: 'blur', name: 'Blurred photo' },
  { value: '#000000', name: 'Black' },
  { value: '#1e2229', name: 'Charcoal' },
  { value: '#f6f5f2', name: 'White' },
  { value: '#d9d4c9', name: 'Stone' },
  { value: '#26344d', name: 'Navy' },
  { value: '#33423a', name: 'Forest' },
]

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}

export function backgroundName(value: string): string {
  return BACKGROUNDS.find((b) => b.value === value.toLowerCase())?.name ?? `Custom ${value}`
}

/** Relative brightness of a color, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  if (!isHexColor(hex)) return 0
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Use dark caption text when it sits on a wide, light mat (like the prototype). */
export function captionNeedsDarkText(look: LookSettings): boolean {
  return look.background !== 'blur' && luminance(look.background) > 0.5 && look.mat > 3
}

/** Fill in missing or broken values from saved settings. */
export function normalizeLook(saved: Partial<LookSettings> | null | undefined): LookSettings {
  const s = { ...DEFAULT_LOOK, ...(saved ?? {}) }
  return {
    fit: s.fit === 'cover' ? 'cover' : 'contain',
    background: s.background === 'blur' || isHexColor(s.background) ? s.background : DEFAULT_LOOK.background,
    mat: Math.min(MAT_MAX, Math.max(0, Math.round(Number(s.mat) || 0))),
    showPhoto: s.showPhoto !== false,
    showCaption: s.showCaption === true,
    night: s.night === true,
  }
}
