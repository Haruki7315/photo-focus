import { useSvgId } from './svgId'
import { HOURGLASS_OUTLINE, hourglassSand } from '../core/faceMath'
import type { FaceProps } from './types'

/** Sand drains over the session (Clock mode: once a minute). */
export function HourglassFace({ display: d }: FaceProps) {
  const clipId = useSvgId('hg')
  const s = hourglassSand(d.frac)
  const flowing = d.moving && d.frac > 0 && d.frac < 1
  return (
    <>
      <div className="hg">
        <svg viewBox="0 0 60 100">
          <defs>
            <clipPath id={clipId}>
              <path d={HOURGLASS_OUTLINE} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <rect x="0" width="60" y={s.topY} height={s.topH} className="sand" />
            <rect x="0" width="60" y={s.bottomY} height={s.bottomH} className="sand" />
            <line x1="30" x2="30" y1="50" y2="91" className="stream" style={{ opacity: flowing ? 1 : 0 }} />
          </g>
          <path d={HOURGLASS_OUTLINE} className="hg-glass" />
          <rect x="5" y="4" width="50" height="5" rx="2" className="hg-cap" />
          <rect x="5" y="91" width="50" height="5" rx="2" className="hg-cap" />
        </svg>
      </div>
      <div className="t-small">{d.text}</div>
    </>
  )
}
