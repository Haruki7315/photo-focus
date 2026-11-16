import { describe, expect, it } from 'vitest'
import {
  RING_CIRCUMFERENCE,
  aperture,
  apertureProgress,
  dotsGrid,
  dotsState,
  handAngles,
  hourglassSand,
  makeStars,
  piePath,
  ringOffset,
  starTrailAngle,
  sunArcPoint,
  typewriterPhrase,
} from './faceMath'

describe('dots', () => {
  it('lays out common lengths neatly', () => {
    expect(dotsGrid(25)).toEqual({ cols: 5, rows: 5, cell: 0.34 })
    expect(dotsGrid(60)).toEqual({ cols: 10, rows: 6, cell: 0.25 })
    expect(dotsGrid(90)).toEqual({ cols: 15, rows: 6, cell: 0.2 })
    expect(dotsGrid(7)).toEqual({ cols: 3, rows: 3, cell: 0.34 })
  })

  it('fills one dot per minute', () => {
    expect(dotsState({ clock: false, minute: 0, second: 0, frac: 0.5, totalMinutes: 25 })).toEqual({ count: 25, full: 12, part: 0.5 })
    expect(dotsState({ clock: false, minute: 0, second: 0, frac: 1, totalMinutes: 25 })).toEqual({ count: 25, full: 25, part: 0 })
    expect(dotsState({ clock: true, minute: 41, second: 30, frac: 0, totalMinutes: 25 })).toEqual({ count: 60, full: 41, part: 0.5 })
  })

  it('draws pie slices', () => {
    expect(piePath(5, 5, 3.6, 0)).toBe('')
    expect(piePath(5, 5, 3.6, 0.25)).toBe('M5 5L5 1.4A3.6 3.6 0 0 1 8.60 5.00Z')
    expect(piePath(5, 5, 3.6, 0.75)).toContain(' 0 1 1 ')
    expect(piePath(5, 5, 3.6, 1)).toContain('A3.6 3.6 0 1 1')
  })
})

describe('ring and analog', () => {
  it('ring is empty at 0 and full at 1', () => {
    expect(ringOffset(0)).toBeCloseTo(RING_CIRCUMFERENCE)
    expect(ringOffset(1)).toBe(0)
    expect(ringOffset(2)).toBe(0)
  })

  it('points the hands', () => {
    expect(handAngles(3, 0, 0)).toEqual({ hour: 90, minute: 0, second: 0 })
    expect(handAngles(15, 30, 15)).toEqual({ hour: 105, minute: 181.5, second: 90 })
  })
})

describe('hourglass', () => {
  it('moves sand from top to bottom', () => {
    expect(hourglassSand(0)).toEqual({ topY: 9, topH: 41, bottomY: 91, bottomH: 0 })
    expect(hourglassSand(1)).toEqual({ topY: 50, topH: 0, bottomY: 50, bottomH: 41 })
  })
})

describe('aperture', () => {
  it('goes from f/1.4 to f/22', () => {
    expect(aperture(0).fStop).toBe(1.4)
    expect(aperture(0.5).fStop).toBe(5.6)
    expect(aperture(1).fStop).toBe(22)
    expect(aperture(0.3).blades).toHaveLength(7)
  })

  it('blades end on the lens rim', () => {
    for (const [, , x2, y2] of aperture(0.4).blades) expect(Math.hypot(x2 - 50, y2 - 50)).toBeCloseTo(46, 1)
  })

  it('clock mode closes and reopens each minute', () => {
    expect(apertureProgress(true, 0)).toBe(0)
    expect(apertureProgress(true, 0.5)).toBe(1)
    expect(apertureProgress(true, 1)).toBe(0)
    expect(apertureProgress(false, 0.7)).toBe(0.7)
  })
})

describe('sun arc', () => {
  it('rises on the left, peaks in the middle, sets on the right', () => {
    const a = sunArcPoint(0)
    expect(a.x).toBeCloseTo(20)
    expect(a.y).toBeCloseTo(96)
    expect(a.donePath).toBe('')
    const b = sunArcPoint(0.5)
    expect(b.x).toBeCloseTo(100)
    expect(b.y).toBeCloseTo(24)
    expect(b.color).toBe('rgb(255,238,180)')
    expect(sunArcPoint(1).x).toBeCloseTo(180)
  })
})

describe('typewriter', () => {
  it('writes the time in clock mode', () => {
    expect(typewriterPhrase({ clock: true, hour: 14, minute: 5, h24: true, phase: 'focus', remainingMs: 0 })).toBe("It's 14:05.")
    expect(typewriterPhrase({ clock: true, hour: 14, minute: 5, h24: false, phase: 'focus', remainingMs: 0 })).toBe("It's 2:05 pm.")
  })

  it('counts minutes in focus and breaks', () => {
    expect(typewriterPhrase({ clock: false, hour: 0, minute: 0, h24: true, phase: 'focus', remainingMs: 24.5 * 60_000 })).toBe('25 minutes to go.')
    expect(typewriterPhrase({ clock: false, hour: 0, minute: 0, h24: true, phase: 'focus', remainingMs: 30_000 })).toBe('One minute to go.')
    expect(typewriterPhrase({ clock: false, hour: 0, minute: 0, h24: true, phase: 'break', remainingMs: 4 * 60_000 })).toBe('Break. 4 minutes left.')
  })
})

describe('star trail', () => {
  it('makes the same stars every time', () => {
    expect(makeStars()).toHaveLength(170)
    expect(makeStars()[0]).toEqual(makeStars()[0])
  })
  it('grows trails over the session or hour', () => {
    expect(starTrailAngle(false, 0.5, 0)).toBe(80)
    expect(starTrailAngle(true, 0, 0.5)).toBe(100)
  })
})
