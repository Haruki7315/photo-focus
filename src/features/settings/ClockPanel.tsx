import {
  CLOCK_COLORS,
  FACES,
  FONTS,
  OPACITY_MIN,
  POSITIONS,
  SIZE_MAX,
  SIZE_MIN,
  TASK_MAX_LENGTH,
  type ClockSettings,
  type FaceId,
  type FontId,
} from '../../core/clock'
import { DEMO_SPEED, type TimerSettings } from '../../core/timer'
import { PositionGrid } from '../../ui/PositionGrid'
import { Check, Group, Row } from '../../ui/Row'
import { Segmented } from '../../ui/Segmented'
import { Swatches } from '../../ui/Swatches'

const FACE_ICONS: Record<FaceId, React.ReactNode> = {
  digital: (
    <svg viewBox="0 0 26 26"><text x="13" y="17" textAnchor="middle" fontSize="11" fill="currentColor" fontFamily="IBM Plex Mono, monospace">12</text></svg>
  ),
  flip: (
    <svg viewBox="0 0 26 26" fill="currentColor">
      <rect x="3" y="6" width="9" height="14" rx="1.5" opacity=".85" />
      <rect x="14" y="6" width="9" height="14" rx="1.5" opacity=".85" />
      <path d="M3 13h20" stroke="var(--bg)" strokeWidth="1" />
    </svg>
  ),
}

export function ClockPanel(props: {
  clock: ClockSettings
  onClock: (patch: Partial<ClockSettings>) => void
  timer: TimerSettings
  onTimer: (patch: Partial<TimerSettings>) => void
}) {
  const { clock: c, onClock, timer: t, onTimer } = props
  const face = FACES.find((f) => f.id === c.face)

  return (
    <>
      <Group title="Timer">
        <Row label="Mode">
          <Segmented
            label="Mode"
            options={[
              { value: 'focus', label: 'Focus timer' },
              { value: 'clock', label: 'Clock' },
            ]}
            value={c.mode}
            onChange={(mode) => onClock({ mode })}
          />
        </Row>
        {c.mode === 'focus' && (
          <>
            <Row label="Working on">
              <input
                type="text"
                value={c.task}
                maxLength={TASK_MAX_LENGTH}
                placeholder="e.g. Problem set"
                onChange={(e) => onClock({ task: e.target.value })}
              />
            </Row>
            <div className="inline">
              <label>
                Focus{' '}
                <select value={t.focusMinutes} onChange={(e) => onTimer({ focusMinutes: +e.target.value })}>
                  {[25, 45, 50, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </label>
              <label>
                Break{' '}
                <select value={t.breakMinutes} onChange={(e) => onTimer({ breakMinutes: +e.target.value })}>
                  {[5, 10, 15].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </label>
            </div>
            <div className="inline">
              <Check label="Long break after 4 sessions" checked={t.longBreakEnabled} onChange={(longBreakEnabled) => onTimer({ longBreakEnabled })} />
              <select aria-label="Long break length" value={t.longBreakMinutes} onChange={(e) => onTimer({ longBreakMinutes: +e.target.value })}>
                {[15, 20, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
            <Check label="Demo speed (1 min = 1 sec)" checked={t.speed === DEMO_SPEED} onChange={(on) => onTimer({ speed: on ? DEMO_SPEED : 1 })} />
          </>
        )}
      </Group>

      <Group title="Clock style">
        <div className="faces" role="group" aria-label="Clock face">
          {FACES.map((f) => (
            <button key={f.id} type="button" aria-pressed={f.id === c.face} onClick={() => onClock({ face: f.id })}>
              {FACE_ICONS[f.id]}
              {f.name}
            </button>
          ))}
        </div>
        {face && <p className="note">{face.note} More faces are coming.</p>}
      </Group>

      <Group title="Clock look">
        <Row label="Font">
          <select value={c.font} onChange={(e) => onClock({ font: e.target.value as FontId })}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Row>
        <Row label="Color">
          <Swatches label="Clock color" options={CLOCK_COLORS} value={c.color} customDefault="#b8f2c8" onChange={(color) => onClock({ color })} />
        </Row>
        <Row label="Place">
          <div className="poswrap">
            <PositionGrid label="Clock position" options={POSITIONS} value={c.position} onChange={(position) => onClock({ position })} />
            <div className="row" style={{ flex: 1, minWidth: 150 }}>
              <span className="rowlabel">Behind clock</span>
              <Segmented
                label="Behind clock"
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'shadow', label: 'Shadow' },
                  { value: 'glass', label: 'Glass' },
                ]}
                value={c.backdrop}
                onChange={(backdrop) => onClock({ backdrop })}
              />
            </div>
          </div>
        </Row>
        <Row label={<>Size <output>{c.size}</output></>}>
          <input type="range" min={SIZE_MIN} max={SIZE_MAX} value={c.size} aria-label="Clock size" onChange={(e) => onClock({ size: +e.target.value })} />
        </Row>
        <Row label={<>Opacity <output>{c.opacity}%</output></>}>
          <input type="range" min={OPACITY_MIN} max={100} value={c.opacity} aria-label="Clock opacity" onChange={(e) => onClock({ opacity: +e.target.value })} />
        </Row>
        <div className="checks">
          <Check label="Seconds" checked={c.seconds} onChange={(seconds) => onClock({ seconds })} />
          <Check label="24-hour" checked={c.h24} onChange={(h24) => onClock({ h24 })} />
          <Check label="Label / date" checked={c.label} onChange={(label) => onClock({ label })} />
          <Check label="Progress bar" checked={c.progressBar} onChange={(progressBar) => onClock({ progressBar })} />
        </div>
        <p className="note">The clock moves a few pixels every 3 minutes to protect the screen from burn-in.</p>
      </Group>
    </>
  )
}
