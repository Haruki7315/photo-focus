/**
 * Focus timer engine. Pure functions: every function takes the current state
 * plus the current time (`now`, in milliseconds) and returns a new state.
 * Nothing here reads the clock itself, which makes it easy to test and lets
 * the timer stay correct when the device sleeps or the tab is throttled.
 *
 * How time is tracked: instead of subtracting a little on every tick (which
 * drifts when iOS pauses the page), we store when the timer was last started
 * and how much time had already passed before that. The remaining time is
 * always calculated from those two numbers.
 */

export type Phase = 'focus' | 'break' | 'longBreak'

export interface TimerSettings {
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  /** Turn the long break on or off. */
  longBreakEnabled: boolean
  /** A long break comes after this many completed focus sessions. */
  sessionsBeforeLongBreak: number
  /** 1 = real time. 60 = demo speed (1 minute passes in 1 second). */
  speed: number
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 20,
  longBreakEnabled: true,
  sessionsBeforeLongBreak: 4,
  speed: 1,
}

export const DEMO_SPEED = 60

export interface TimerState {
  settings: TimerSettings
  phase: Phase
  /** Length of the current phase, in timer milliseconds. */
  durationMs: number
  /** Timer time that passed before the current run started. */
  elapsedBeforeMs: number
  /** Real time when the current run started, or null if paused. */
  runningSince: number | null
  /** Completed (not skipped) focus sessions since the last reset. */
  completedSessions: number
}

/** Things that happened during an update, for the app to react to (save stats, play sounds, change photo). */
export type TimerEvent =
  | { type: 'focusCompleted'; at: number; minutes: number }
  | { type: 'breakCompleted'; at: number; phase: 'break' | 'longBreak' }
  | { type: 'skipped'; at: number; from: Phase }

export interface TimerUpdate {
  state: TimerState
  events: TimerEvent[]
}

/** What the screen needs to draw the timer. */
export interface TimerView {
  phase: Phase
  running: boolean
  totalMs: number
  remainingMs: number
  /** 0 at the start of the phase, 1 at the end. */
  progress: number
  completedSessions: number
}

const MINUTE = 60_000

function phaseMinutes(settings: TimerSettings, phase: Phase): number {
  if (phase === 'focus') return settings.focusMinutes
  if (phase === 'break') return settings.breakMinutes
  return settings.longBreakMinutes
}

function validate(settings: TimerSettings): TimerSettings {
  const positive = (n: number, fallback: number) => (Number.isFinite(n) && n > 0 ? n : fallback)
  return {
    ...settings,
    focusMinutes: positive(settings.focusMinutes, DEFAULT_SETTINGS.focusMinutes),
    breakMinutes: positive(settings.breakMinutes, DEFAULT_SETTINGS.breakMinutes),
    longBreakMinutes: positive(settings.longBreakMinutes, DEFAULT_SETTINGS.longBreakMinutes),
    sessionsBeforeLongBreak: Math.max(1, Math.round(positive(settings.sessionsBeforeLongBreak, 4))),
    speed: positive(settings.speed, 1),
  }
}

/** A fresh, paused timer at the start of a focus session. */
export function createTimer(settings: TimerSettings = DEFAULT_SETTINGS): TimerState {
  const s = validate(settings)
  return {
    settings: s,
    phase: 'focus',
    durationMs: s.focusMinutes * MINUTE,
    elapsedBeforeMs: 0,
    runningSince: null,
    completedSessions: 0,
  }
}

/** Timer time passed in the current phase (can be more than the duration until `tick` runs). */
function elapsed(state: TimerState, now: number): number {
  const running = state.runningSince === null ? 0 : Math.max(0, now - state.runningSince) * state.settings.speed
  return state.elapsedBeforeMs + running
}

export function isRunning(state: TimerState): boolean {
  return state.runningSince !== null
}

export function start(state: TimerState, now: number): TimerState {
  if (state.runningSince !== null) return state
  return { ...state, runningSince: now }
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.runningSince === null) return state
  return { ...state, elapsedBeforeMs: Math.min(elapsed(state, now), state.durationMs), runningSince: null }
}

export function toggle(state: TimerState, now: number): TimerState {
  return state.runningSince === null ? start(state, now) : pause(state, now)
}

/**
 * Move to the next phase. `carryMs` is timer time that already passed into the
 * new phase (used when the device slept through a phase end).
 * `runFrom` is the real time the new phase run is measured from, or null to stay paused.
 */
function nextPhase(state: TimerState, completed: boolean, carryMs: number, runFrom: number | null): TimerState {
  const s = state.settings
  if (state.phase === 'focus') {
    const sessions = completed ? state.completedSessions + 1 : state.completedSessions
    const long = completed && s.longBreakEnabled && sessions % s.sessionsBeforeLongBreak === 0
    const phase: Phase = long ? 'longBreak' : 'break'
    return { ...state, phase, completedSessions: sessions, durationMs: phaseMinutes(s, phase) * MINUTE, elapsedBeforeMs: carryMs, runningSince: runFrom }
  }
  return { ...state, phase: 'focus', durationMs: s.focusMinutes * MINUTE, elapsedBeforeMs: carryMs, runningSince: runFrom }
}

/**
 * Call this often (a few times a second) while the timer screen is open.
 * When a phase ends, the next one starts automatically, like the prototype.
 * If the device slept through several phases, they are all caught up.
 */
export function tick(state: TimerState, now: number): TimerUpdate {
  const events: TimerEvent[] = []
  let current = state
  // Safety limit so a huge time jump can never loop forever.
  for (let guard = 0; guard < 1000; guard++) {
    if (current.runningSince === null) break
    const passed = elapsed(current, now)
    if (passed < current.durationMs) break

    // Real time at which this phase ended.
    const overMs = passed - current.durationMs
    const endedAt = now - overMs / current.settings.speed
    if (current.phase === 'focus') {
      events.push({ type: 'focusCompleted', at: endedAt, minutes: current.durationMs / MINUTE })
    } else {
      events.push({ type: 'breakCompleted', at: endedAt, phase: current.phase })
    }
    current = nextPhase(current, true, 0, endedAt)
  }
  return { state: current, events }
}

/** Skip to the next phase. A skipped focus session is not counted. Keeps running if it was running. */
export function skip(state: TimerState, now: number): TimerUpdate {
  const events: TimerEvent[] = [{ type: 'skipped', at: now, from: state.phase }]
  const next = nextPhase(state, false, 0, state.runningSince === null ? null : now)
  return { state: next, events }
}

/** Back to a paused focus session, keeping the settings. */
export function reset(state: TimerState): TimerState {
  return createTimer(state.settings)
}

/**
 * Change settings. If the current phase hasn't started yet, its length is
 * updated right away; otherwise the new lengths apply from the next phase.
 * Changing speed while running keeps the time already passed.
 */
export function updateSettings(state: TimerState, settings: TimerSettings, now: number): TimerState {
  const s = validate(settings)
  const passed = elapsed(state, now)
  const runningSince = state.runningSince === null ? null : now
  const untouched = passed === 0 && state.runningSince === null
  return {
    ...state,
    settings: s,
    elapsedBeforeMs: passed,
    runningSince,
    durationMs: untouched ? phaseMinutes(s, state.phase) * MINUTE : state.durationMs,
  }
}

export function getView(state: TimerState, now: number): TimerView {
  const passed = Math.min(elapsed(state, now), state.durationMs)
  return {
    phase: state.phase,
    running: state.runningSince !== null,
    totalMs: state.durationMs,
    remainingMs: state.durationMs - passed,
    progress: state.durationMs > 0 ? passed / state.durationMs : 1,
    completedSessions: state.completedSessions,
  }
}
