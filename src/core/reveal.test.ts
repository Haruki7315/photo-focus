import { describe, expect, it } from 'vitest'
import { developGrayscale, gridFor, seedFrom, shownImageRect, tileOrder, tileProgress, tileStates, type RevealInput } from './reveal'

const base: RevealInput = { clock: false, hourFrac: 0, phase: 'focus', frac: 0, totalMinutes: 25, focusMinutes: 25 }

describe('tileProgress', () => {
  it('one piece per focus minute', () => {
    expect(tileProgress({ ...base, frac: 0 })).toEqual({ count: 25, done: 0, part: 0 })
    expect(tileProgress({ ...base, frac: 0.5 })).toEqual({ count: 25, done: 12, part: 0.5 })
    expect(tileProgress({ ...base, frac: 1 })).toEqual({ count: 25, done: 25, part: 0 })
  })

  it('shows the whole picture during breaks', () => {
    expect(tileProgress({ ...base, phase: 'break', totalMinutes: 5, frac: 0.2 })).toEqual({ count: 25, done: 25, part: 0 })
  })

  it('clock mode: 60 pieces per hour', () => {
    expect(tileProgress({ ...base, clock: true, hourFrac: 0.25 })).toEqual({ count: 60, done: 15, part: 0 })
  })
})

describe('developGrayscale', () => {
  it('goes from black-and-white to color over the session', () => {
    expect(developGrayscale({ ...base, frac: 0 })).toBe(1)
    expect(developGrayscale({ ...base, frac: 0.25 })).toBe(0.75)
    expect(developGrayscale({ ...base, frac: 1 })).toBe(0)
    expect(developGrayscale({ ...base, phase: 'break', frac: 0.1 })).toBe(0)
    expect(developGrayscale({ ...base, clock: true, hourFrac: 0.4 })).toBeCloseTo(0.6)
  })
})

describe('gridFor', () => {
  it('matches the photo shape', () => {
    expect(gridFor(25, 1.5)).toEqual({ cols: 5, rows: 5 })
    expect(gridFor(60, 1.5)).toEqual({ cols: 10, rows: 6 })
    expect(gridFor(60, 0.66)).toEqual({ cols: 6, rows: 10 })
    expect(gridFor(45, 1.5)).toEqual({ cols: 9, rows: 5 })
    expect(gridFor(90, 1.5)).toEqual({ cols: 10, rows: 9 })
  })
})

describe('tileOrder', () => {
  it('in order is 0, 1, 2…', () => {
    expect(tileOrder(6, 3, 2, 'seq', 1)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('random uses every piece once and repeats for the same photo', () => {
    const a = tileOrder(25, 5, 5, 'random', seedFrom('photo-a'))
    expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 25 }, (_, i) => i))
    expect(tileOrder(25, 5, 5, 'random', seedFrom('photo-a'))).toEqual(a)
    expect(tileOrder(25, 5, 5, 'random', seedFrom('photo-b'))).not.toEqual(a)
  })

  it('from center starts in the middle', () => {
    const o = tileOrder(25, 5, 5, 'spiral', 1)
    expect(o[0]).toBe(12)
    // The 8 neighbours come before any edge piece.
    expect(o.slice(1, 9).sort((x, y) => x - y)).toEqual([6, 7, 8, 11, 13, 16, 17, 18])
  })
})

describe('tileStates', () => {
  it('marks done, now and hidden pieces', () => {
    const { state, nowOpacity } = tileStates([2, 0, 1, 3], 2, 0.25)
    expect(state).toEqual(['done', 'now', 'done', 'hidden'])
    expect(nowOpacity).toBe(0.75)
  })
})

describe('shownImageRect', () => {
  it('centers a contained photo', () => {
    expect(shownImageRect({ x: 0, y: 0, w: 1000, h: 500 }, { w: 300, h: 300 }, 'contain')).toEqual({ x: 250, y: 0, w: 500, h: 500 })
  })
  it('fills the box when cover', () => {
    expect(shownImageRect({ x: 10, y: 10, w: 100, h: 50 }, { w: 300, h: 300 }, 'cover')).toEqual({ x: 10, y: 10, w: 100, h: 50 })
  })
})
