/**
 * Geometry and text for the clock faces (ported from the prototype).
 * Pure TypeScript: returns numbers and SVG path strings, never touches the DOM.
 */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const pad = (n: number) => String(n).padStart(2, '0')

/* ---------- Dots ---------- */

/** Columns that look tidy for common session lengths. */
const DOT_COLUMNS: Record<number, number> = { 5: 5, 10: 5, 15: 5, 20: 5, 25: 5, 30: 6, 45: 9, 50: 10, 60: 10, 90: 15 }

/** Grid for N dots, and how big each dot cell is (in em). */
export function dotsGrid(n: number): { cols: number; rows: number; cell: number } {
  const count = Math.max(1, Math.round(n))
  const cols = DOT_COLUMNS[count] ?? Math.ceil(Math.sqrt(count))
  return { cols, rows: Math.ceil(count / cols), cell: count <= 25 ? 0.34 : count <= 60 ? 0.25 : 0.2 }
}

/**
 * Which dots are done. Focus: one dot per minute of the session.
 * Clock: 60 dots, one per minute of the hour.
 */
export function dotsState(input: { clock: boolean; minute: number; second: number; frac: number; totalMinutes: number }): {
  count: number
  full: number
  part: number
} {
  if (input.clock) return { count: 60, full: input.minute, part: input.second / 60 }
  const count = Math.max(1, Math.round(input.totalMinutes))
  const elapsed = Math.min(count, clamp01(input.frac) * count)
  const full = Math.floor(elapsed)
  return { count, full, part: elapsed - full }
}

/** A pie slice filling clockwise from 12 o'clock. `part` 0..1. */
export function piePath(cx: number, cy: number, r: number, part: number): string {
  if (part <= 0) return ''
  if (part >= 0.999) return `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${(cx - 0.01).toFixed(2)} ${cy - r}Z`
  const a = part * 2 * Math.PI
  const x = cx + r * Math.sin(a)
  const y = cy - r * Math.cos(a)
  return `M${cx} ${cy}L${cx} ${cy - r}A${r} ${r} 0 ${part > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`
}

/* ---------- Ring ---------- */

export const RING_CIRCUMFERENCE = 2 * Math.PI * 44

/** stroke-dashoffset for the ring arc (radius 44) at progress `frac`. */
export function ringOffset(frac: number): number {
  return RING_CIRCUMFERENCE * (1 - clamp01(frac))
}

/* ---------- Analog ---------- */

/** Hand angles in degrees, clockwise from 12. */
export function handAngles(h: number, m: number, s: number): { hour: number; minute: number; second: number } {
  return { hour: ((h % 12) + m / 60) * 30, minute: (m + s / 60) * 6, second: s * 6 }
}

/* ---------- Hourglass ---------- */

/** Sand heights for the hourglass (viewBox 0 0 60 100): top bulb drains from y=9..50, bottom fills y=50..91. */
export function hourglassSand(frac: number): { topY: number; topH: number; bottomY: number; bottomH: number } {
  const f = clamp01(frac)
  const rem = 1 - f
  return { topY: 50 - rem * 41, topH: rem * 41, bottomY: 91 - f * 41, bottomH: f * 41 }
}

export const HOURGLASS_OUTLINE = 'M11 9 L49 9 C49 30 33 44 33 50 C33 56 49 70 49 91 L11 91 C11 70 27 56 27 50 C27 44 11 30 11 9 Z'

/* ---------- Aperture ---------- */

export const F_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22]

/**
 * Lens iris for `fr` from 0 (wide open, f/1.4) to 1 (closed down, f/22).
 * Returns the 7-sided opening, the blade lines and the nearest marked f-stop.
 */
export function aperture(fr: number): { points: string; blades: Array<[number, number, number, number]>; fStop: number } {
  const f = 1.4 * Math.pow(2, clamp01(fr) * 4)
  const r = 40 * Math.pow(1.4 / f, 0.75)
  const rot = clamp01(fr) * 35 * (Math.PI / 180) - Math.PI / 2
  const R = 46
  const pts: Array<[number, number]> = []
  for (let i = 0; i < 7; i++) {
    const a = rot + (i * 2 * Math.PI) / 7
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  const points = pts.map((p) => `${(50 + p[0]).toFixed(2)},${(50 + p[1]).toFixed(2)}`).join(' ')
  const blades = pts.map((v, i): [number, number, number, number] => {
    const u = pts[(i + 6) % 7]
    let dx = v[0] - u[0]
    let dy = v[1] - u[1]
    const L = Math.hypot(dx, dy) || 1
    dx /= L
    dy /= L
    // Extend the blade edge from the opening out to the lens rim.
    const b = v[0] * dx + v[1] * dy
    const t = -b + Math.sqrt(Math.max(0, b * b - (v[0] * v[0] + v[1] * v[1]) + R * R))
    return [50 + v[0], 50 + v[1], 50 + v[0] + t * dx, 50 + v[1] + t * dy]
  })
  const fStop = F_STOPS.reduce((best, s) => (Math.abs(Math.log(s / f)) < Math.abs(Math.log(best / f)) ? s : best), F_STOPS[0])
  return { points, blades, fStop }
}

/** Aperture progress: focus closes over the session; clock closes and reopens once a minute. */
export function apertureProgress(clock: boolean, frac: number): number {
  return clock ? 1 - Math.abs(1 - 2 * frac) : clamp01(frac)
}

/* ---------- Sun arc ---------- */

/** Sun position on the arc (viewBox 0 0 200 108) and its color (orange low, pale high). */
export function sunArcPoint(progress: number): { x: number; y: number; color: string; donePath: string } {
  const p = clamp01(progress)
  const a = Math.PI * (1 - p)
  const x = 100 + 80 * Math.cos(a)
  const y = 96 - 72 * Math.sin(a)
  const alt = Math.sin(Math.PI * p)
  const lo = [255, 128, 56]
  const hi = [255, 238, 180]
  const color = `rgb(${lo.map((v, i) => Math.round(v + (hi[i] - v) * alt)).join(',')})`
  return { x, y, color, donePath: p > 0.002 ? `M20 96A80 72 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}` : '' }
}

/* ---------- Typewriter ---------- */

export function typewriterPhrase(input: {
  clock: boolean
  hour: number
  minute: number
  h24: boolean
  phase: 'focus' | 'break' | 'longBreak'
  remainingMs: number
}): string {
  if (input.clock) {
    const hh = input.h24 ? pad(input.hour) : String(input.hour % 12 || 12)
    return `It's ${hh}:${pad(input.minute)}${input.h24 ? '' : input.hour < 12 ? ' am' : ' pm'}.`
  }
  const m = Math.ceil(Math.max(0, input.remainingMs) / 60_000)
  if (input.phase !== 'focus') return m <= 1 ? 'Break. One minute left.' : `Break. ${m} minutes left.`
  return m <= 1 ? 'One minute to go.' : `${m} minutes to go.`
}

/* ---------- Star trail ---------- */

export interface Star {
  /** Distance from the pole, as a share of the canvas size. */
  rr: number
  /** Starting angle (radians). */
  a: number
  /** Brightness 0..1. */
  b: number
  /** Width factor 0..1. */
  w: number
  /** "r,g,b" */
  c: string
}

/** The same 170 stars every time (seeded random), like the prototype. */
export function makeStars(count = 170, seed = 99): Star[] {
  let s = seed
  const r = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  const colors = ['255,255,255', '205,222,255', '255,226,192']
  return Array.from({ length: count }, () => ({ rr: Math.sqrt(r()) * 1.15 + 0.02, a: r() * Math.PI * 2, b: 0.35 + r() * 0.65, w: r(), c: colors[Math.floor(r() * 3)] }))
}

/** Trail length in degrees: focus grows to 160° over the session; clock grows to 200° over the hour. */
export function starTrailAngle(clock: boolean, frac: number, hourFrac: number): number {
  return clock ? hourFrac * 200 : clamp01(frac) * 160
}
