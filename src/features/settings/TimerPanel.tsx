import { DEMO_SPEED, type TimerSettings } from '../../core/timer'
import { Check, Group } from '../../ui/Row'

/** Focus/break lengths. (The full Clock tab with faces arrives in milestone 4.) */
export function TimerPanel({ settings, onChange }: { settings: TimerSettings; onChange: (patch: Partial<TimerSettings>) => void }) {
  return (
    <Group title="Focus timer">
      <div className="inline">
        <label>
          Focus{' '}
          <select value={settings.focusMinutes} onChange={(e) => onChange({ focusMinutes: +e.target.value })}>
            {[25, 45, 50, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <label>
          Break{' '}
          <select value={settings.breakMinutes} onChange={(e) => onChange({ breakMinutes: +e.target.value })}>
            {[5, 10, 15].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
      </div>
      <div className="inline">
        <Check label="Long break after 4 sessions" checked={settings.longBreakEnabled} onChange={(longBreakEnabled) => onChange({ longBreakEnabled })} />
        <select aria-label="Long break length" value={settings.longBreakMinutes} onChange={(e) => onChange({ longBreakMinutes: +e.target.value })}>
          {[15, 20, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
      </div>
      <Check label="Demo speed (1 min = 1 sec)" checked={settings.speed === DEMO_SPEED} onChange={(on) => onChange({ speed: on ? DEMO_SPEED : 1 })} />
      <p className="note">New lengths apply now if the session hasn't started, otherwise from the next one.</p>
    </Group>
  )
}
