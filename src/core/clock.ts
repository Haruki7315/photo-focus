/**
 * Clock overlay logic: settings, what text to show, colors, and the small
 * burn-in shift. Pure TypeScript, no DOM.
 */
import { luminance, isHexColor } from './look'
import { CITIES, type CityId } from './sky'
import type { Phase, TimerView } from './timer'

export type ClockMode = 'focus' | 'clock'
export type FaceId =
  | 'digital' | 'flip' | 'typewriter' | 'dots'
  | 'ring' | 'dial' | 'hourglass' | 'aperture'
  | 'golden' | 'sun' | 'moon' | 'stars'
export type FaceGroup = 'Numbers' | 'Dials' | 'Sky'
export type FontId = 'clean' | 'serif' | 'classic' | 'poster' | 'rounded' | 'mono' | 'pixel'
export type Backdrop = 'none' | 'shadow' | 'glass'
/** Row (t/m/b) + column (l/c/r), e.g. "br" = bottom right. */
export type Position = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'

export interface ClockSettings {
  mode: ClockMode
  face: FaceId
  font: FontId
  /** Hex color of the clock. */
  color: string
  position: Position
  backdrop: Backdrop
  /** 3 to 28. */
  size: number
  /** 15 to 100 (percent). */
  opacity: number
  seconds: boolean
  h24: boolean
  /** Show the small label (Focus / task / date) above the clock. */
  label: boolean
  progressBar: boolean
  /** "Working on" text shown as the focus label. */
  task: string
  /** Place for Golden hour and Sun arc: a city, or 'here' (your saved location). */
  city: CityId | 'here'
  /** Your location, saved only after you tap "Use my location" (rounded to about 1 km). */
  here: { lat: number; lon: number } | null
}

export const DEFAULT_CLOCK: ClockSettings = {
  mode: 'focus',
  face: 'digital',
  font: 'clean',
  color: '#ffffff',
  position: 'br',
  backdrop: 'shadow',
  size: 9,
  opacity: 90,
  seconds: true,
  h24: true,
  label: true,
  progressBar: true,
  task: '',
  city: 'uiuc',
  here: null,
}

export const FACES: ReadonlyArray<{ id: FaceId; name: string; group: FaceGroup; note: string }> = [
  { id: 'digital', name: 'Digital', group: 'Numbers', note: 'Plain numbers.' },
  { id: 'flip', name: 'Flip', group: 'Numbers', note: 'Cards flip as the digits change. Turn on Seconds to flip every second.' },
  { id: 'typewriter', name: 'Typewriter', group: 'Numbers', note: 'Types a short sentence each minute, like an old typewriter.' },
  { id: 'dots', name: 'Dots', group: 'Numbers', note: 'One dot per minute. The current dot fills like a pie as the minute passes. Clock mode shows 60 dots for the hour.' },
  { id: 'ring', name: 'Ring', group: 'Dials', note: 'The ring fills as the session runs. Clock mode: once per minute.' },
  { id: 'dial', name: 'Analog', group: 'Dials', note: 'Clock mode: real clock hands. Focus mode: a red wedge shrinks as time runs out.' },
  { id: 'hourglass', name: 'Hourglass', group: 'Dials', note: 'Sand drains over the session. Clock mode: once per minute.' },
  { id: 'aperture', name: 'Aperture', group: 'Dials', note: 'Focus: the iris closes from f/1.4 to f/22 over the session. Clock: it closes and opens once a minute.' },
  { id: 'golden', name: 'Golden hr', group: 'Sky', note: "Shows when the next golden hour starts at the location you pick, in that place's local time." },
  { id: 'sun', name: 'Sun arc', group: 'Sky', note: 'Clock: where the real sun is today between sunrise and sunset. Focus: the sun rises and sets over one session.' },
  { id: 'moon', name: 'Moon', group: 'Sky', note: "Clock: tonight's real moon phase. Focus: the moon grows from new to full as you focus." },
  { id: 'stars', name: 'Star trail', group: 'Sky', note: 'Star trails get longer like a long exposure. Clock mode: one exposure per hour.' },
]

/** Faces that use the location setting. */
export function faceUsesLocation(face: FaceId): boolean {
  return face === 'golden' || face === 'sun'
}

export const FONTS: ReadonlyArray<{ id: FontId; name: string }> = [
  { id: 'clean', name: 'Clean (thin sans)' },
  { id: 'serif', name: 'Serif (book)' },
  { id: 'classic', name: 'Classic (display serif)' },
  { id: 'poster', name: 'Poster (tall, bold)' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'mono', name: 'Mono (code)' },
  { id: 'pixel', name: 'Pixel' },
]

export const CLOCK_COLORS: ReadonlyArray<{ value: string; name: string }> = [
  { value: '#ffffff', name: 'White' },
  { value: '#16181c', name: 'Ink' },
  { value: '#ffc98a', name: 'Amber' },
  { value: '#bfe3ff', name: 'Sky' },
  { value: '#ff8a73', name: 'Coral' },
]

export const POSITIONS: ReadonlyArray<{ id: Position; name: string }> = [
  { id: 'tl', name: 'Top left' }, { id: 'tc', name: 'Top center' }, { id: 'tr', name: 'Top right' },
  { id: 'ml', name: 'Middle left' }, { id: 'mc', name: 'Center' }, { id: 'mr', name: 'Middle right' },
  { id: 'bl', name: 'Bottom left' }, { id: 'bc', name: 'Bottom center' }, { id: 'br', name: 'Bottom right' },
]

export const SIZE_MIN = 3
export const SIZE_MAX = 28
export const OPACITY_MIN = 15
export const TASK_MAX_LENGTH = 40

const pad = (n: number) => String(n).padStart(2, '0')

/** What the clock overlay shows right now. */
export interface ClockDisplay {
  /** True in Clock mode (real time), false in Focus mode. */
  clock: boolean
  /** The main text, e.g. "24:59", "25", "14:05:09". */
  text: string
  /** The small label above, e.g. "Focus · 2 done" or "Sat, Nov 7". */
  sub: string
  /** 0 to 1: progress through the session (focus) or the current minute (clock). */
  frac: number
  /** Whether the progress bar makes sense right now. */
  showBar: boolean
  /** Local time parts (used by Analog, Dots, Typewriter...). */
  hour: number
  minute: number
  second: number
  /** 0 to 1 through the current hour. */
  hourFrac: number
  /** Focus mode: session length and time left. */
  totalMinutes: number
  remainingMs: number
  phase: Phase
  /** True while time is passing (always in Clock mode). */
  moving: boolean
}

/** Focus mode text: "24:59" (with seconds) or minutes left, "25" or "1:30". */
export function timerText(remainingMs: number, seconds: boolean): string {
  const rem = Math.max(0, remainingMs) / 1000
  if (seconds) {
    const s = Math.ceil(rem)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${h ? `${h}:${pad(m)}` : pad(m)}:${pad(s % 60)}`
  }
  const mins = Math.ceil(rem / 60)
  return mins >= 60 ? `${Math.floor(mins / 60)}:${pad(mins % 60)}` : pad(mins)
}

/** Clock mode text: "14:05", "2:05" style with leading zero like the prototype ("02:05"). */
export function clockText(date: Date, h24: boolean, seconds: boolean): string {
  const H = date.getHours()
  const hh = h24 ? H : H % 12 || 12
  return `${pad(hh)}:${pad(date.getMinutes())}${seconds ? `:${pad(date.getSeconds())}` : ''}`
}

const PHASE_LABEL = { focus: 'Focus', break: 'Break', longBreak: 'Long break' } as const

export function getClockDisplay(settings: ClockSettings, timer: TimerView, now: Date, locale?: string): ClockDisplay {
  const parts = {
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
    hourFrac: (now.getMinutes() * 60 + now.getSeconds()) / 3600,
    totalMinutes: timer.totalMs / 60_000,
    remainingMs: timer.remainingMs,
    phase: timer.phase,
  }
  if (settings.mode === 'clock') {
    const H = now.getHours()
    const date = now.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
    return {
      clock: true,
      text: clockText(now, settings.h24, settings.seconds),
      sub: date + (settings.h24 ? '' : ` · ${H < 12 ? 'AM' : 'PM'}`),
      frac: (now.getSeconds() + now.getMilliseconds() / 1000) / 60,
      showBar: false,
      ...parts,
      moving: true,
    }
  }
  const task = settings.task.trim()
  const label = timer.phase === 'focus' ? task || 'Focus' : PHASE_LABEL[timer.phase]
  const sub = label + (settings.seconds ? '' : ' · min left') + (timer.completedSessions ? ` · ${timer.completedSessions} done` : '')
  return { clock: false, text: timerText(timer.remainingMs, settings.seconds), sub, frac: timer.progress, showBar: true, ...parts, moving: timer.running }
}

/** Colors derived from the clock color (ported from the prototype). */
export interface ClockColors {
  color: string
  shadow: string
  glass: string
  cardBg: string
  cardFg: string
  /** Analog dial background and Golden hour text. */
  dialBg: string
  gold: string
}

export function clockColors(color: string, night: boolean): ClockColors {
  const base = isHexColor(color) ? color : DEFAULT_CLOCK.color
  // Night mode: warm amber instead of bright colors.
  const c = night && luminance(base) > 0.3 ? '#ffcf96' : base
  const dark = luminance(c) < 0.3
  return {
    color: c,
    shadow: dark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.55)',
    glass: dark ? 'rgba(255,255,255,.5)' : 'rgba(10,12,16,.32)',
    cardBg: dark ? '#f2f1ee' : 'rgba(16,17,20,.9)',
    cardFg: dark ? '#16181c' : c,
    dialBg: dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.28)',
    gold: dark ? '#9c5a17' : '#ffc56e',
  }
}

/** The photo caption moves to the top when the clock sits bottom-left or bottom-center. */
export function captionAtTop(position: Position): boolean {
  return position === 'bl' || position === 'bc'
}

export const BURN_IN_STEP_MS = 3 * 60_000
export const BURN_IN_MAX_PX = 6

/**
 * Burn-in protection: every 3 minutes the overlay moves to a new small offset
 * (up to 6 px each way). The same time always gives the same offset.
 */
export function burnInOffset(nowMs: number, stepMs = BURN_IN_STEP_MS, maxPx = BURN_IN_MAX_PX): { x: number; y: number } {
  const step = Math.floor(nowMs / stepMs)
  // Small integer hash so offsets look random but repeat for the same step.
  const hash = (n: number) => {
    let h = (n ^ 0x9e3779b9) >>> 0
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
    return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff
  }
  const span = maxPx * 2 + 1
  return { x: Math.floor(hash(step * 2) * span) - maxPx, y: Math.floor(hash(step * 2 + 1) * span) - maxPx }
}

function oneOf<T extends string>(value: unknown, options: ReadonlyArray<{ id: T }>, fallback: T): T {
  return options.some((o) => o.id === value) ? (value as T) : fallback
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback
}

function validHere(h: unknown): h is { lat: number; lon: number } {
  if (!h || typeof h !== 'object') return false
  const { lat, lon } = h as { lat: unknown; lon: unknown }
  return typeof lat === 'number' && typeof lon === 'number' && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}

/** Round a location to 2 decimals (about 1 km): enough for sun times, less precise for privacy. */
export function roundLocation(lat: number, lon: number): { lat: number; lon: number } {
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 }
}

/** Where the sky faces should look, given the settings and this device's time zone. */
export function skyLocationFor(settings: Pick<ClockSettings, 'city' | 'here'>, deviceTz: string): { lat: number; lon: number; tz: string; name: string } {
  if (settings.city === 'here' && settings.here) return { ...settings.here, tz: deviceTz, name: 'My location' }
  const c = CITIES.find((x) => x.id === settings.city) ?? CITIES[0]
  return { lat: c.lat, lon: c.lon, tz: c.tz, name: c.name }
}

/** Fill in missing or broken values from saved settings. */
export function normalizeClock(saved: Partial<ClockSettings> | null | undefined): ClockSettings {
  const s = { ...DEFAULT_CLOCK, ...(saved ?? {}) }
  return {
    mode: s.mode === 'clock' ? 'clock' : 'focus',
    face: oneOf(s.face, FACES, DEFAULT_CLOCK.face),
    font: oneOf(s.font, FONTS, DEFAULT_CLOCK.font),
    color: isHexColor(String(s.color)) ? s.color : DEFAULT_CLOCK.color,
    position: oneOf(s.position, POSITIONS, DEFAULT_CLOCK.position),
    backdrop: s.backdrop === 'none' || s.backdrop === 'glass' ? s.backdrop : 'shadow',
    size: clampInt(s.size, SIZE_MIN, SIZE_MAX, DEFAULT_CLOCK.size),
    opacity: clampInt(s.opacity, OPACITY_MIN, 100, DEFAULT_CLOCK.opacity),
    seconds: s.seconds !== false,
    h24: s.h24 !== false,
    label: s.label !== false,
    progressBar: s.progressBar !== false,
    task: String(s.task ?? '').slice(0, TASK_MAX_LENGTH),
    city: s.city === 'here' && validHere(s.here) ? 'here' : oneOf(s.city, CITIES, DEFAULT_CLOCK.city as CityId),
    here: validHere(s.here) ? { lat: s.here.lat, lon: s.here.lon } : null,
  }
}
