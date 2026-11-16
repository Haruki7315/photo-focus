import { sunArcPoint } from '../core/faceMath'
import { sunArcNow } from '../core/sky'
import type { FaceProps } from './types'

/** Clock: the real sun between sunrise and sunset. Focus: the sun crosses the sky in one session. */
export function SunArcFace({ display: d, settings, now, sky }: FaceProps) {
  let up = true
  let progress = d.frac
  let info = d.phase === 'focus' ? 'Sunrise to sunset in one session' : 'Break · the sun rises again'
  if (d.clock) {
    const s = sunArcNow(sky, now, settings.h24)
    up = s.up
    progress = s.progress
    info = s.text
  }
  const p = sunArcPoint(progress)
  return (
    <>
      <div className="sunarc">
        <svg viewBox="0 0 200 108">
          <path d="M20 96A80 72 0 0 1 180 96" className="sa-path" />
          {up && <path d={p.donePath} className="sa-done" />}
          <line x1="4" y1="96" x2="196" y2="96" className="sa-horizon" />
          <circle cx="20" cy="96" r="2.2" className="sa-tick" />
          <circle cx="180" cy="96" r="2.2" className="sa-tick" />
          {up && (
            <>
              <circle cx={p.x} cy={p.y} r="15" fill={p.color} opacity=".28" />
              <circle cx={p.x} cy={p.y} r="7.5" fill={p.color} />
            </>
          )}
        </svg>
      </div>
      <div className="t-small">{d.text}</div>
      <div className="t-info">{info}</div>
    </>
  )
}
