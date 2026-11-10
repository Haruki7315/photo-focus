import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createTimer,
  getView,
  reset as resetTimer,
  skip as skipTimer,
  tick,
  toggle as toggleTimer,
  updateSettings,
  type TimerEvent,
  type TimerSettings,
  type TimerState,
} from '../../core/timer'

/**
 * React wrapper around the core timer engine.
 * It ticks 4 times a second and again whenever the app comes back to the
 * foreground, and passes timer events (session done, skipped...) to `onEvent`.
 */
export function useTimer(initial: TimerSettings, onEvent?: (e: TimerEvent) => void) {
  // `state` is what we draw. `stateRef` holds the same value for event
  // handlers, so each update runs exactly once (React may run state-updater
  // functions twice in development, which would double the events).
  const [state, setState] = useState<TimerState>(() => createTimer(initial))
  const stateRef = useRef(state)
  const [now, setNow] = useState(() => Date.now())
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  // Apply an update to the timer, redraw, then report any events.
  const apply = useCallback((fn: (s: TimerState, t: number) => { state: TimerState; events: TimerEvent[] }) => {
    const t = Date.now()
    const { state: next, events } = fn(stateRef.current, t)
    stateRef.current = next
    setState(next)
    setNow(t)
    events.forEach((e) => onEventRef.current?.(e))
  }, [])

  useEffect(() => {
    const step = () => apply(tick)
    const id = window.setInterval(step, 250)
    const onVisible = () => document.visibilityState === 'visible' && step()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [apply])

  return {
    now,
    view: getView(state, now),
    settings: state.settings,
    toggle: () => apply((s, t) => ({ state: toggleTimer(s, t), events: [] })),
    skip: () => apply(skipTimer),
    reset: () => apply((s) => ({ state: resetTimer(s), events: [] })),
    /** Change some settings; the rest keep their latest values. Returns the new settings. */
    setSettings: (patch: Partial<TimerSettings>) => {
      apply((s, t) => ({ state: updateSettings(s, { ...s.settings, ...patch }, t), events: [] }))
      return stateRef.current.settings
    },
  }
}
