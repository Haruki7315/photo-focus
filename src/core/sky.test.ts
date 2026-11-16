import { describe, expect, it } from 'vitest'
import {
  CITIES,
  daysToFullMoon,
  formatSpan,
  goldenHourText,
  moonIllumination,
  moonName,
  moonPath,
  moonPhase,
  sunArcNow,
  sunTimes,
  type SkyLocation,
} from './sky'

const city = (id: string): SkyLocation => CITIES.find((c) => c.id === id)!
const MIN = 60_000

/** "HH:MM" of a time in a zone, 24-hour. */
function hhmm(ms: number, tz: string): string {
  return new Date(ms).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
}
function minutesOfDay(ms: number, tz: string): number {
  const [h, m] = hhmm(ms, tz).split(':').map(Number)
  return h * 60 + m
}
function near(ms: number, tz: string, expected: string, toleranceMin = 5) {
  const [h, m] = expected.split(':').map(Number)
  expect(Math.abs(minutesOfDay(ms, tz) - (h * 60 + m)), `${hhmm(ms, tz)} vs ${expected}`).toBeLessThanOrEqual(toleranceMin)
}

describe('sun times (checked against published tables, ±5 min)', () => {
  it('Chicago, June solstice', () => {
    const c = city('chicago')
    const t = sunTimes(c, Date.UTC(2026, 5, 21, 17))
    near(t.rise, c.tz, '05:15')
    near(t.set, c.tz, '20:29')
  })

  it('London, December solstice', () => {
    const c = city('london')
    const t = sunTimes(c, Date.UTC(2026, 11, 21, 12))
    near(t.rise, c.tz, '08:04')
    near(t.set, c.tz, '15:53')
  })

  it('Tokyo, March equinox', () => {
    const c = city('tokyo')
    const t = sunTimes(c, Date.UTC(2026, 2, 20, 3))
    near(t.rise, c.tz, '05:45')
    near(t.set, c.tz, '17:53')
  })

  it('uses the local date in that city, not the device date', () => {
    // 23:30 in Chicago on Jun 21 is already Jun 22 in UTC; it should still give Jun 21's sunset.
    const c = city('chicago')
    const t = sunTimes(c, Date.UTC(2026, 5, 22, 4, 30))
    expect(new Date(t.set).toLocaleDateString('en-CA', { timeZone: c.tz })).toBe('2026-06-21')
  })

  it('golden hours sit inside the day', () => {
    const t = sunTimes(city('uiuc'), Date.UTC(2026, 9, 1, 17))
    expect(t.rise).toBeLessThan(t.goldenAmEnd)
    expect(t.goldenAmEnd).toBeLessThan(t.goldenPmStart)
    expect(t.goldenPmStart).toBeLessThan(t.set)
  })

  it('handles polar night without crashing', () => {
    const svalbard = { lat: 78.2, lon: 15.6, tz: 'Arctic/Longyearbyen' }
    const now = Date.UTC(2026, 11, 21, 12)
    expect(Number.isNaN(sunTimes(svalbard, now).rise)).toBe(true)
    expect(goldenHourText(svalbard, now, true)).toBe('No sunrise or sunset here today')
    expect(sunArcNow(svalbard, now, true).up).toBe(false)
  })
})

describe('golden hour text', () => {
  const c = city('london')
  const day = Date.UTC(2026, 11, 21)
  const t = sunTimes(c, day + 12 * 3_600_000)

  it('says when it is golden hour now', () => {
    expect(goldenHourText(c, t.rise + MIN, true, 'en-GB')).toMatch(/^Golden hour now · ends /)
    expect(goldenHourText(c, t.set - MIN, true, 'en-GB')).toMatch(/^Golden hour now · sunset /)
  })

  it('counts down to the next one', () => {
    expect(goldenHourText(c, t.goldenPmStart - 90 * MIN, true, 'en-GB')).toMatch(/^Golden hour \d\d:\d\d · in 1h 30m$/)
  })
})

describe('sun arc (clock mode)', () => {
  const c = city('nyc')
  const t = sunTimes(c, Date.UTC(2026, 8, 1, 16))
  it('is halfway at solar noon-ish', () => {
    const mid = (t.rise + t.set) / 2
    const s = sunArcNow(c, mid, true)
    expect(s.up).toBe(true)
    expect(s.progress).toBeCloseTo(0.5, 2)
  })
  it('is down at night and names the next sunrise', () => {
    const s = sunArcNow(c, t.set + 60 * MIN, true, 'en-US')
    expect(s.up).toBe(false)
    expect(s.text).toMatch(/^Night · sunrise /)
  })
})

describe('moon', () => {
  it('matches known full and new moons (within about a day)', () => {
    expect(moonPhase(Date.UTC(2024, 0, 25, 17, 54))).toBeCloseTo(0.5, 1)
    const nm = moonPhase(Date.UTC(2024, 0, 11, 11, 57))
    expect(Math.min(nm, 1 - nm)).toBeLessThan(0.04)
  })

  it('names phases and light', () => {
    expect(moonName(0)).toBe('New moon')
    expect(moonName(0.25)).toBe('First quarter')
    expect(moonName(0.5)).toBe('Full moon')
    expect(moonName(0.75)).toBe('Last quarter')
    expect(moonName(0.99)).toBe('New moon')
    expect(moonIllumination(0.5)).toBeCloseTo(1)
    expect(moonIllumination(0)).toBeCloseTo(0)
    expect(daysToFullMoon(0.25)).toBeCloseTo(7.38, 1)
  })

  it('draws nothing at new moon and a lit shape otherwise', () => {
    expect(moonPath(0, 50, 50, 44)).toBe('')
    expect(moonPath(0.25, 50, 50, 44)).toMatch(/^M50 6A44 44/)
    expect(moonPath(0.75, 50, 50, 44)).toMatch(/^M50 6A44 44 0 0 0/)
  })
})

describe('formatSpan', () => {
  it('formats durations', () => {
    expect(formatSpan(45 * MIN)).toBe('45 min')
    expect(formatSpan(125 * MIN)).toBe('2h 05m')
    expect(formatSpan(0)).toBe('1 min')
  })
})
