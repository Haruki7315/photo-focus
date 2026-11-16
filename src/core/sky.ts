/**
 * Sun and moon math for the sky faces (ported from the prototype).
 * Pure TypeScript: every function takes the time as a number (ms since 1970).
 * Accuracy is about ±2 minutes for sunrise/sunset, plenty for a clock face.
 */

const RAD = Math.PI / 180
const DAY_MS = 86_400_000

/** A place on Earth plus its time zone (IANA name, e.g. "Asia/Tokyo"). */
export interface SkyLocation {
  lat: number
  lon: number
  tz: string
}

export type CityId = 'uiuc' | 'kanagawa' | 'tokyo' | 'chicago' | 'nyc' | 'sf' | 'london'

export const CITIES: ReadonlyArray<{ id: CityId; name: string } & SkyLocation> = [
  { id: 'uiuc', name: 'Urbana-Champaign, IL', lat: 40.11, lon: -88.21, tz: 'America/Chicago' },
  { id: 'kanagawa', name: 'Kanagawa (Yokohama)', lat: 35.44, lon: 139.64, tz: 'Asia/Tokyo' },
  { id: 'tokyo', name: 'Tokyo', lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo' },
  { id: 'chicago', name: 'Chicago', lat: 41.88, lon: -87.63, tz: 'America/Chicago' },
  { id: 'nyc', name: 'New York', lat: 40.71, lon: -74.01, tz: 'America/New_York' },
  { id: 'sf', name: 'San Francisco', lat: 37.77, lon: -122.42, tz: 'America/Los_Angeles' },
  { id: 'london', name: 'London', lat: 51.51, lon: -0.13, tz: 'Europe/London' },
]

export interface SunTimes {
  /** Sunrise and sunset (ms). NaN when the sun doesn't rise or set that day (polar day/night). */
  rise: number
  set: number
  /** End of morning golden hour / start of evening golden hour (sun 6° up). */
  goldenAmEnd: number
  goldenPmStart: number
}

/** The calendar date (y, m, d) at `nowMs` in the place's time zone. */
function localDate(nowMs: number, tz: string): [number, number, number] {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(nowMs))
    .split('-')
    .map(Number)
  return [parts[0], parts[1], parts[2]]
}

/** Sun times for the local day at `nowMs` (plus `dayOffset` days), in the place's time zone. */
export function sunTimes(loc: SkyLocation, nowMs: number, dayOffset = 0): SunTimes {
  const [y, m, d] = localDate(nowMs, loc.tz)
  const noonMs = Date.UTC(y, m - 1, d + dayOffset, 12) - (loc.lon / 15) * 3_600_000
  const JD = noonMs / DAY_MS + 2440587.5
  const n = Math.round(JD - 2451545 + loc.lon / 360)
  const Js = n - loc.lon / 360
  const M = (((357.5291 + 0.98560028 * Js) % 360) + 360) % 360
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD)
  const lam = (M + C + 282.9372) % 360
  const Jt = 2451545 + Js + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lam * RAD)
  const dec = Math.asin(Math.sin(lam * RAD) * Math.sin(23.44 * RAD))
  const lat = loc.lat * RAD
  const hourAngle = (h: number) => {
    const c = (Math.sin(h * RAD) - Math.sin(lat) * Math.sin(dec)) / (Math.cos(lat) * Math.cos(dec))
    return c < -1 || c > 1 ? NaN : Math.acos(c) / RAD
  }
  const toMs = (J: number) => (J - 2440587.5) * DAY_MS
  const w0 = hourAngle(-0.833)
  const w6 = hourAngle(6)
  return { rise: toMs(Jt - w0 / 360), set: toMs(Jt + w0 / 360), goldenAmEnd: toMs(Jt - w6 / 360), goldenPmStart: toMs(Jt + w6 / 360) }
}

/** "7:05 AM" or "19:05" in the place's time zone. */
export function formatTimeAt(ms: number, tz: string, h24: boolean, locale?: string): string {
  return new Date(ms).toLocaleTimeString(locale, { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: !h24 })
}

/** "45 min" or "3h 05m" */
export function formatSpan(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000))
  const h = Math.floor(m / 60)
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`
}

/** One line for the Golden hour face, e.g. "Golden hour 4:12 PM · in 2h 05m". */
export function goldenHourText(loc: SkyLocation, nowMs: number, h24: boolean, locale?: string): string {
  const t0 = sunTimes(loc, nowMs)
  const t1 = sunTimes(loc, nowMs, 1)
  const at = (ms: number) => formatTimeAt(ms, loc.tz, h24, locale)
  if (Number.isNaN(t0.rise)) return 'No sunrise or sunset here today'
  if (nowMs >= t0.rise && nowMs < t0.goldenAmEnd) return `Golden hour now · ends ${at(t0.goldenAmEnd)}`
  if (nowMs >= t0.goldenPmStart && nowMs < t0.set) return `Golden hour now · sunset ${at(t0.set)}`
  const next = [t0.rise, t0.goldenPmStart, t1.rise].find((x) => x > nowMs)
  if (next === undefined || Number.isNaN(next)) return 'Golden hour tomorrow'
  return `Golden hour ${at(next)} · in ${formatSpan(next - nowMs)}`
}

/** Where the real sun is today for the Sun arc face in Clock mode. */
export function sunArcNow(loc: SkyLocation, nowMs: number, h24: boolean, locale?: string): { up: boolean; progress: number; text: string } {
  const t0 = sunTimes(loc, nowMs)
  const at = (ms: number) => formatTimeAt(ms, loc.tz, h24, locale)
  if (Number.isNaN(t0.rise)) return { up: false, progress: 0, text: 'No sunrise or sunset here today' }
  if (nowMs >= t0.rise && nowMs < t0.set) {
    return { up: true, progress: (nowMs - t0.rise) / (t0.set - t0.rise), text: `Sunrise ${at(t0.rise)} · Sunset ${at(t0.set)}` }
  }
  const nextRise = nowMs < t0.rise ? t0.rise : sunTimes(loc, nowMs, 1).rise
  return { up: false, progress: 0, text: `Night · sunrise ${at(nextRise)}` }
}

const SYNODIC_DAYS = 29.530588853

/** Moon phase from 0 to 1: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. */
export function moonPhase(nowMs: number): number {
  const JD = nowMs / DAY_MS + 2440587.5
  return ((((JD - 2451550.1) % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS) / SYNODIC_DAYS
}

/** Share of the moon that is lit, 0 to 1. */
export function moonIllumination(phase: number): number {
  return (1 - Math.cos(2 * Math.PI * phase)) / 2
}

export function moonName(phase: number): string {
  const names: Array<[number, string]> = [
    [0.0339, 'New moon'], [0.216, 'Waxing crescent'], [0.284, 'First quarter'], [0.466, 'Waxing gibbous'],
    [0.534, 'Full moon'], [0.716, 'Waning gibbous'], [0.784, 'Last quarter'], [0.966, 'Waning crescent'], [1.01, 'New moon'],
  ]
  return names.find(([limit]) => phase < limit)![1]
}

/** Days until the next full moon. */
export function daysToFullMoon(phase: number): number {
  return ((0.5 - phase + 1) % 1) * SYNODIC_DAYS
}

/** SVG path of the lit part of the moon (circle at cx, cy with radius r). Empty at new moon. */
export function moonPath(phase: number, cx: number, cy: number, r: number): string {
  if (moonIllumination(phase) < 0.004) return ''
  const k = Math.cos(2 * Math.PI * phase)
  const rx = Math.abs(k) * r
  if (phase < 0.5) return `M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx} ${cy + r}A${rx.toFixed(2)} ${r} 0 0 ${k > 0 ? 0 : 1} ${cx} ${cy - r}Z`
  return `M${cx} ${cy - r}A${r} ${r} 0 0 0 ${cx} ${cy + r}A${rx.toFixed(2)} ${r} 0 0 ${k < 0 ? 0 : 1} ${cx} ${cy - r}Z`
}
