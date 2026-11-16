import { daysToFullMoon, moonIllumination, moonName, moonPath, moonPhase } from '../core/sky'
import type { FaceProps } from './types'

/** Clock: tonight's real moon. Focus: the moon grows from new to full as you focus. */
export function MoonFace({ display: d, now }: FaceProps) {
  const real = moonPhase(now)
  const lit = Math.round(moonIllumination(real) * 100)
  const shown = d.clock ? real : Math.max(0, Math.min(1, d.frac)) * 0.5
  const toFull = daysToFullMoon(real)
  const info =
    (d.clock ? '' : 'Tonight: ') + `${moonName(real)} · ${lit}% lit` + (d.clock && toFull > 1 ? ` · full in ${Math.round(toFull)} days` : '')
  return (
    <>
      <div className="moon">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" className="moon-dark" />
          <path d={moonPath(shown, 50, 50, 44)} className="moon-lit" />
        </svg>
      </div>
      <div className="t-small">{d.text}</div>
      <div className="t-info">{info}</div>
    </>
  )
}
