import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEMO_SPEED,
  createTimer,
  getView,
  pause,
  reset,
  skip,
  start,
  tick,
  toggle,
  updateSettings,
  type TimerState,
} from './timer'

const SEC = 1000
const MIN = 60 * SEC

/** Run a full focus session from `t` and return the state just after it ends. */
function finishFocus(state: TimerState, t: number) {
  const running = start(state, t)
  return tick(running, t + running.durationMs / running.settings.speed)
}

describe('timer: basics', () => {
  it('starts paused at 25:00 focus', () => {
    const v = getView(createTimer(), 0)
    expect(v.phase).toBe('focus')
    expect(v.running).toBe(false)
    expect(v.remainingMs).toBe(25 * MIN)
    expect(v.progress).toBe(0)
  })

  it('counts down while running', () => {
    const s = start(createTimer(), 1000)
    const v = getView(s, 1000 + 10 * MIN)
    expect(v.running).toBe(true)
    expect(v.remainingMs).toBe(15 * MIN)
    expect(v.progress).toBeCloseTo(0.4)
  })

  it('does not move while paused', () => {
    const s = createTimer()
    expect(getView(s, 99 * MIN).remainingMs).toBe(25 * MIN)
  })
})

describe('timer: pause and resume', () => {
  it('keeps the time left when paused, and continues from there', () => {
    let s = start(createTimer(), 0)
    s = pause(s, 5 * MIN)
    // A long pause changes nothing.
    expect(getView(s, 60 * MIN).remainingMs).toBe(20 * MIN)
    s = start(s, 60 * MIN)
    expect(getView(s, 62 * MIN).remainingMs).toBe(18 * MIN)
  })

  it('toggle switches between running and paused', () => {
    let s = toggle(createTimer(), 0)
    expect(getView(s, 0).running).toBe(true)
    s = toggle(s, 1 * MIN)
    expect(getView(s, 1 * MIN).running).toBe(false)
    expect(getView(s, 1 * MIN).remainingMs).toBe(24 * MIN)
  })

  it('start twice and pause twice are harmless', () => {
    let s = start(createTimer(), 0)
    s = start(s, 5 * MIN)
    expect(getView(s, 5 * MIN).remainingMs).toBe(20 * MIN)
    s = pause(s, 6 * MIN)
    s = pause(s, 9 * MIN)
    expect(getView(s, 9 * MIN).remainingMs).toBe(19 * MIN)
  })
})

describe('timer: focus to break', () => {
  it('nothing happens before the end', () => {
    const s = start(createTimer(), 0)
    const { state, events } = tick(s, 25 * MIN - 1)
    expect(events).toEqual([])
    expect(state.phase).toBe('focus')
  })

  it('moves to a 5 min break when focus ends, and reports it', () => {
    const { state, events } = finishFocus(createTimer(), 0)
    expect(events).toEqual([{ type: 'focusCompleted', at: 25 * MIN, minutes: 25 }])
    expect(state.phase).toBe('break')
    expect(state.completedSessions).toBe(1)
    const v = getView(state, 25 * MIN)
    expect(v.running).toBe(true)
    expect(v.remainingMs).toBe(5 * MIN)
  })

  it('carries over time if the tick comes late', () => {
    const s = start(createTimer(), 0)
    // The page was asleep and only ticked 2 minutes after focus ended.
    const { state, events } = tick(s, 27 * MIN)
    expect(events[0]).toEqual({ type: 'focusCompleted', at: 25 * MIN, minutes: 25 })
    expect(getView(state, 27 * MIN).remainingMs).toBe(3 * MIN)
  })

  it('goes back to focus when the break ends', () => {
    const { state: onBreak } = finishFocus(createTimer(), 0)
    const { state, events } = tick(onBreak, 30 * MIN)
    expect(events).toEqual([{ type: 'breakCompleted', at: 30 * MIN, phase: 'break' }])
    expect(state.phase).toBe('focus')
    expect(getView(state, 30 * MIN).remainingMs).toBe(25 * MIN)
  })

  it('catches up through several phases after a long sleep', () => {
    const s = start(createTimer(), 0)
    // 25 focus + 5 break + 25 focus = 55 min, then 2 min into the second break.
    const { state, events } = tick(s, 57 * MIN)
    expect(events.map((e) => e.type)).toEqual(['focusCompleted', 'breakCompleted', 'focusCompleted'])
    expect(state.phase).toBe('break')
    expect(state.completedSessions).toBe(2)
    expect(getView(state, 57 * MIN).remainingMs).toBe(3 * MIN)
  })
})

describe('timer: long break', () => {
  /** Complete `n` focus sessions (with breaks in between) and return the state. */
  function completeSessions(n: number, initial = createTimer()) {
    let s = initial
    let t = 0
    for (let i = 0; i < n; i++) {
      if (s.phase !== 'focus') {
        s = skip(s, t).state
      }
      const r = finishFocus(s, t)
      s = pause(r.state, t)
      t += 30 * MIN
    }
    return s
  }

  it('comes after every 4th completed session', () => {
    expect(completeSessions(3).phase).toBe('break')
    const s = completeSessions(4)
    expect(s.phase).toBe('longBreak')
    expect(s.durationMs).toBe(20 * MIN)
    expect(completeSessions(5).phase).toBe('break')
    expect(completeSessions(8).phase).toBe('longBreak')
  })

  it('reports the long break when it ends', () => {
    const s = start(completeSessions(4), 0)
    const { events, state } = tick(s, 20 * MIN)
    expect(events).toEqual([{ type: 'breakCompleted', at: 20 * MIN, phase: 'longBreak' }])
    expect(state.phase).toBe('focus')
  })

  it('can be turned off', () => {
    const s = completeSessions(4, createTimer({ ...DEFAULT_SETTINGS, longBreakEnabled: false }))
    expect(s.phase).toBe('break')
  })

  it('skipped sessions do not count toward it', () => {
    let s = completeSessions(3)
    s = skip(s, 0).state // break -> focus
    s = skip(s, 0).state // skip the 4th focus
    expect(s.phase).toBe('break')
    expect(s.completedSessions).toBe(3)
  })
})

describe('timer: skip', () => {
  it('skips focus to a break without counting it', () => {
    const s = start(createTimer(), 0)
    const { state, events } = skip(s, 10 * MIN)
    expect(events).toEqual([{ type: 'skipped', at: 10 * MIN, from: 'focus' }])
    expect(state.phase).toBe('break')
    expect(state.completedSessions).toBe(0)
    // Still running, with a full break ahead.
    expect(getView(state, 11 * MIN).remainingMs).toBe(4 * MIN)
  })

  it('skips a break back to focus', () => {
    const onBreak = skip(createTimer(), 0).state
    const { state } = skip(onBreak, 0)
    expect(state.phase).toBe('focus')
    expect(state.durationMs).toBe(25 * MIN)
  })

  it('stays paused if it was paused', () => {
    const { state } = skip(createTimer(), 0)
    expect(getView(state, 5 * MIN).running).toBe(false)
    expect(getView(state, 5 * MIN).remainingMs).toBe(5 * MIN)
  })
})

describe('timer: demo speed', () => {
  it('runs 60x faster: 25 minutes pass in 25 seconds', () => {
    const s = start(createTimer({ ...DEFAULT_SETTINGS, speed: DEMO_SPEED }), 0)
    expect(getView(s, 10 * SEC).remainingMs).toBe(15 * MIN)
    const { state, events } = tick(s, 25 * SEC)
    expect(events).toEqual([{ type: 'focusCompleted', at: 25 * SEC, minutes: 25 }])
    expect(state.phase).toBe('break')
  })

  it('can be switched on mid-session without losing time', () => {
    let s = start(createTimer(), 0)
    s = updateSettings(s, { ...s.settings, speed: DEMO_SPEED }, 10 * MIN)
    expect(getView(s, 10 * MIN).remainingMs).toBe(15 * MIN)
    // 15 more timer minutes = 15 real seconds.
    expect(tick(s, 10 * MIN + 15 * SEC).state.phase).toBe('break')
  })
})

describe('timer: settings and reset', () => {
  it('a new focus length applies right away if the session has not started', () => {
    const s = updateSettings(createTimer(), { ...DEFAULT_SETTINGS, focusMinutes: 50 }, 0)
    expect(getView(s, 0).remainingMs).toBe(50 * MIN)
  })

  it('a new focus length waits for the next session if one is in progress', () => {
    let s = start(createTimer(), 0)
    s = updateSettings(s, { ...s.settings, focusMinutes: 50, breakMinutes: 10 }, 5 * MIN)
    expect(getView(s, 5 * MIN).remainingMs).toBe(20 * MIN)
    const { state } = tick(s, 25 * MIN)
    expect(state.durationMs).toBe(10 * MIN)
  })

  it('ignores bad values', () => {
    const s = createTimer({ ...DEFAULT_SETTINGS, focusMinutes: 0, speed: Number.NaN })
    expect(s.durationMs).toBe(25 * MIN)
    expect(s.settings.speed).toBe(1)
  })

  it('reset goes back to a paused focus session and keeps settings', () => {
    let s = start(createTimer({ ...DEFAULT_SETTINGS, focusMinutes: 45 }), 0)
    s = finishFocus(s, 0).state
    s = reset(s)
    const v = getView(s, 99 * MIN)
    expect(v.phase).toBe('focus')
    expect(v.running).toBe(false)
    expect(v.remainingMs).toBe(45 * MIN)
    expect(v.completedSessions).toBe(0)
  })
})
