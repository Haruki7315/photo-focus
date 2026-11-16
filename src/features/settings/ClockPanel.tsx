import {
  CLOCK_COLORS,
  FACES,
  FONTS,
  OPACITY_MIN,
  POSITIONS,
  SIZE_MAX,
  SIZE_MIN,
  TASK_MAX_LENGTH,
  faceUsesLocation,
  roundLocation,
  type ClockSettings,
  type FaceGroup,
  type FaceId,
  type FontId,
} from '../../core/clock'
import { useState } from 'react'
import { CITIES } from '../../core/sky'
import { DEMO_SPEED, type TimerSettings } from '../../core/timer'
import { getCurrentLocation } from '../../platform/location'
import { PositionGrid } from '../../ui/PositionGrid'
import { Check, Group, Row } from '../../ui/Row'
import { Segmented } from '../../ui/Segmented'
import { Swatches } from '../../ui/Swatches'

/** Small pictures for the face picker (from the prototype). */
const FACE_ICONS: Record<FaceId, React.ReactNode> = {
  digital: <svg viewBox="0 0 26 26"><text x="13" y="17" textAnchor="middle" fontSize="11" fill="currentColor" fontFamily="IBM Plex Mono, monospace">12</text></svg>,
  flip: (
    <svg viewBox="0 0 26 26" fill="currentColor">
      <rect x="3" y="6" width="9" height="14" rx="1.5" opacity=".85" />
      <rect x="14" y="6" width="9" height="14" rx="1.5" opacity=".85" />
      <path d="M3 13h20" stroke="var(--bg)" strokeWidth="1" />
    </svg>
  ),
  typewriter: (
    <svg viewBox="0 0 26 26">
      <text x="11" y="17" textAnchor="middle" fontSize="11" fill="currentColor" fontFamily="Special Elite, Courier New, monospace">Aa</text>
      <path d="M19 18h4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  dots: (
    <svg viewBox="0 0 26 26" fill="currentColor">
      <circle cx="6" cy="6" r="2.4" /><circle cx="13" cy="6" r="2.4" /><circle cx="20" cy="6" r="2.4" /><circle cx="6" cy="13" r="2.4" />
      <path d="M13 13V10.6A2.4 2.4 0 0 1 15.4 13Z" />
      <circle cx="13" cy="13" r="2.4" fill="none" stroke="currentColor" />
      <g fill="none" stroke="currentColor" opacity=".4"><circle cx="20" cy="13" r="2.4" /><circle cx="6" cy="20" r="2.4" /><circle cx="13" cy="20" r="2.4" /><circle cx="20" cy="20" r="2.4" /></g>
    </svg>
  ),
  ring: (
    <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.4">
      <circle cx="13" cy="13" r="9" opacity=".3" />
      <path d="M13 4a9 9 0 1 1-8.5 12" strokeLinecap="round" />
    </svg>
  ),
  dial: (
    <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="13" cy="13" r="10" />
      <path d="M13 13V7M13 13l4 2" strokeLinecap="round" />
    </svg>
  ),
  hourglass: (
    <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4h12M7 22h12M8 4c0 5 5 7 5 9s-5 4-5 9M18 4c0 5-5 7-5 9s5 4 5 9" />
    </svg>
  ),
  aperture: (
    <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="13" cy="13" r="10.5" />
      <path d="M13 7.5l4.8 2.7v5.6L13 18.5l-4.8-2.7v-5.6Z" />
      <path d="M13 7.5L18 3.6M17.8 10.2l5.6-.8M17.8 15.8l2.8 5M13 18.5l-4.9 4M8.2 15.8l-5.6.6M8.2 10.2L5.6 5" opacity=".7" />
    </svg>
  ),
  golden: (
    <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 18h20" />
      <path d="M7.5 18a5.5 5.5 0 0 1 11 0" fill="currentColor" opacity=".8" />
      <path d="M13 7v2.5M6 10.5l1.7 1.7M20 10.5l-1.7 1.7" strokeLinecap="round" />
      <path d="M8 22h10" opacity=".5" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 20h22" />
      <path d="M4 20a9 8 0 0 1 18 0" strokeDasharray="1.6 2" />
      <circle cx="9" cy="13.2" r="2.6" fill="currentColor" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="9.5" fill="none" stroke="currentColor" strokeOpacity=".4" strokeWidth="1.2" />
      <path d="M13 3.5A9.5 9.5 0 0 1 13 22.5A5.5 9.5 0 0 0 13 3.5Z" fill="currentColor" />
    </svg>
  ),
  stars: (
    <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M20 10a8 8 0 0 0-12-4" />
      <path d="M17 14a5 5 0 0 0-7-5" opacity=".8" />
      <path d="M23 15a11 11 0 0 0-19-6" opacity=".6" />
      <circle cx="13" cy="15" r="1" fill="currentColor" />
    </svg>
  ),
}

const GROUPS: FaceGroup[] = ['Numbers', 'Dials', 'Sky']

/** Pick a city or use the device's location for the sun faces. */
function LocationRow({ clock: c, onClock }: { clock: ClockSettings; onClock: (patch: Partial<ClockSettings>) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Row label="Location for sun times" note={error ?? undefined}>
      <div className="inline">
        <select
          value={c.city}
          aria-label="Location for sun times"
          onChange={(e) => onClock({ city: e.target.value as ClockSettings['city'] })}
        >
          {CITIES.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          {c.here && <option value="here">My location</option>}
        </select>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError(null)
            const r = await getCurrentLocation()
            setBusy(false)
            if ('error' in r) setError(r.error)
            else onClock({ here: roundLocation(r.lat, r.lon), city: 'here' })
          }}
        >
          {busy ? 'Finding you…' : 'Use my location'}
        </button>
      </div>
    </Row>
  )
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
        {GROUPS.map((g) => (
          <div key={g} className="facegroup">
            <p className="fglabel">{g}</p>
            <div className="faces" role="group" aria-label={`${g} faces`}>
              {FACES.filter((f) => f.group === g).map((f) => (
                <button key={f.id} type="button" aria-pressed={f.id === c.face} onClick={() => onClock({ face: f.id })}>
                  {FACE_ICONS[f.id]}
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {face && <p className="note">{face.note}</p>}
        {faceUsesLocation(c.face) && <LocationRow clock={c} onClock={onClock} />}
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
