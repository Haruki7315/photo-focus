import { useState } from 'react'
import { formatDuration } from '../../core/format'
import { DEFAULT_SETTINGS, DEMO_SPEED, type Phase, type TimerEvent } from '../../core/timer'
import { useTimer } from './useTimer'

const PHASE_LABEL: Record<Phase, string> = { focus: 'Focus', break: 'Break', longBreak: 'Long break' }

function describe(e: TimerEvent): string {
  if (e.type === 'focusCompleted') return `Focus done (${e.minutes} min), saved`
  if (e.type === 'breakCompleted') return `${PHASE_LABEL[e.phase]} over`
  return `Skipped ${PHASE_LABEL[e.from].toLowerCase()}, not saved`
}

/**
 * Milestone 2 test screen: a plain timer to try the engine on real devices.
 * The real focus screen (photo + clock faces) replaces this in later milestones.
 */
export function TimerTestPanel() {
  const [log, setLog] = useState<string[]>([])
  const timer = useTimer({ ...DEFAULT_SETTINGS, speed: DEMO_SPEED }, (e) =>
    setLog((l) => [`${new Date(e.at).toLocaleTimeString()} · ${describe(e)}`, ...l].slice(0, 6)),
  )
  const { view, settings } = timer
  const demo = settings.speed === DEMO_SPEED

  return (
    <section className="timer">
      <p className="timer-phase">
        {PHASE_LABEL[view.phase]}
        {view.completedSessions > 0 && ` · ${view.completedSessions} done`}
      </p>
      <p className="timer-time">{formatDuration(Math.ceil(view.remainingMs / 1000))}</p>
      <div className="timer-bar" aria-hidden="true">
        <div style={{ width: `${view.progress * 100}%` }} />
      </div>

      <div className="timer-buttons">
        <button type="button" className="primary" onClick={timer.toggle}>
          {view.running ? 'Pause' : 'Start'}
        </button>
        <button type="button" onClick={timer.skip}>
          {view.phase === 'focus' ? 'Skip to break' : 'Skip to focus'}
        </button>
        <button type="button" onClick={timer.reset}>Reset</button>
      </div>

      <div className="timer-settings">
        <label>
          Focus
          <select value={settings.focusMinutes} onChange={(e) => timer.setSettings({ ...settings, focusMinutes: +e.target.value })}>
            {[25, 45, 50, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <label>
          Break
          <select value={settings.breakMinutes} onChange={(e) => timer.setSettings({ ...settings, breakMinutes: +e.target.value })}>
            {[5, 10, 15].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.longBreakEnabled} onChange={(e) => timer.setSettings({ ...settings, longBreakEnabled: e.target.checked })} />
          Long break (20 min) after 4
        </label>
        <label className="check">
          <input type="checkbox" checked={demo} onChange={(e) => timer.setSettings({ ...settings, speed: e.target.checked ? DEMO_SPEED : 1 })} />
          Demo speed (1 min = 1 sec)
        </label>
      </div>

      <ul className="timer-log" aria-live="polite">
        {log.length === 0 ? <li>Events will show here.</li> : log.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
    </section>
  )
}
