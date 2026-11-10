import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CLOCK,
  burnInOffset,
  captionAtTop,
  clockColors,
  clockText,
  getClockDisplay,
  normalizeClock,
  timerText,
} from './clock'
import type { TimerView } from './timer'

const MIN = 60_000

function view(extra: Partial<TimerView> = {}): TimerView {
  return { phase: 'focus', running: false, totalMs: 25 * MIN, remainingMs: 25 * MIN, progress: 0, completedSessions: 0, ...extra }
}

describe('timerText', () => {
  it('shows mm:ss with seconds', () => {
    expect(timerText(25 * MIN, true)).toBe('25:00')
    expect(timerText(59_001, true)).toBe('01:00')
    expect(timerText(90 * MIN, true)).toBe('1:30:00')
    expect(timerText(-5, true)).toBe('00:00')
  })

  it('shows minutes left without seconds (rounded up)', () => {
    expect(timerText(25 * MIN, false)).toBe('25')
    expect(timerText(24 * MIN + 1, false)).toBe('25')
    expect(timerText(30_000, false)).toBe('01')
    expect(timerText(90 * MIN, false)).toBe('1:30')
  })
})

describe('clockText', () => {
  const d = new Date(2026, 10, 7, 14, 5, 9)
  it('handles 24-hour and 12-hour', () => {
    expect(clockText(d, true, true)).toBe('14:05:09')
    expect(clockText(d, false, false)).toBe('02:05')
    expect(clockText(new Date(2026, 10, 7, 0, 30), false, false)).toBe('12:30')
  })
})

describe('getClockDisplay', () => {
  it('focus mode uses the task as the label', () => {
    const d = getClockDisplay({ ...DEFAULT_CLOCK, task: '  Problem set ' }, view({ completedSessions: 2, progress: 0.4 }), new Date())
    expect(d.sub).toBe('Problem set · 2 done')
    expect(d.text).toBe('25:00')
    expect(d.frac).toBe(0.4)
    expect(d.showBar).toBe(true)
  })

  it('labels breaks and minutes-left mode', () => {
    expect(getClockDisplay(DEFAULT_CLOCK, view({ phase: 'break' }), new Date()).sub).toBe('Break')
    expect(getClockDisplay({ ...DEFAULT_CLOCK, seconds: false }, view({ phase: 'longBreak' }), new Date()).sub).toBe('Long break · min left')
  })

  it('clock mode shows the time and date', () => {
    const now = new Date(2026, 10, 7, 9, 41, 30)
    const d = getClockDisplay({ ...DEFAULT_CLOCK, mode: 'clock', h24: false }, view(), now, 'en-US')
    expect(d.clock).toBe(true)
    expect(d.text).toBe('09:41:30')
    expect(d.sub).toBe('Sat, Nov 7 · AM')
    expect(d.frac).toBeCloseTo(0.5)
    expect(d.showBar).toBe(false)
  })
})

describe('clockColors', () => {
  it('uses a light shadow and light cards for dark clock colors', () => {
    const c = clockColors('#16181c', false)
    expect(c.shadow).toBe('rgba(255,255,255,.55)')
    expect(c.cardBg).toBe('#f2f1ee')
  })

  it('turns bright colors warm in night mode', () => {
    expect(clockColors('#ffffff', true).color).toBe('#ffcf96')
    expect(clockColors('#16181c', true).color).toBe('#16181c')
    expect(clockColors('#ffffff', false).color).toBe('#ffffff')
  })
})

describe('burn-in shift', () => {
  it('stays the same within 3 minutes and within 6 px', () => {
    const a = burnInOffset(0)
    expect(burnInOffset(2 * MIN + 59_000)).toEqual(a)
    for (let i = 0; i < 200; i++) {
      const o = burnInOffset(i * 3 * MIN)
      expect(Math.abs(o.x)).toBeLessThanOrEqual(6)
      expect(Math.abs(o.y)).toBeLessThanOrEqual(6)
    }
  })

  it('moves to new spots over time', () => {
    const spots = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(burnInOffset(i * 3 * MIN))))
    expect(spots.size).toBeGreaterThan(10)
  })
})

describe('clock settings', () => {
  it('moves the caption up when the clock is bottom-left or bottom-center', () => {
    expect(captionAtTop('bl')).toBe(true)
    expect(captionAtTop('bc')).toBe(true)
    expect(captionAtTop('br')).toBe(false)
  })

  it('repairs saved settings', () => {
    expect(normalizeClock(null)).toEqual(DEFAULT_CLOCK)
    const s = normalizeClock({ size: 99, opacity: 2, face: 'nope' as never, color: 'red', task: 'x'.repeat(80), seconds: false })
    expect(s.size).toBe(28)
    expect(s.opacity).toBe(15)
    expect(s.face).toBe('digital')
    expect(s.color).toBe('#ffffff')
    expect(s.task).toHaveLength(40)
    expect(s.seconds).toBe(false)
  })
})
