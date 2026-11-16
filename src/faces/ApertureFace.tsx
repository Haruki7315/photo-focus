import { useSvgId } from './svgId'
import { aperture, apertureProgress } from '../core/faceMath'
import type { FaceProps } from './types'

/** A lens iris that closes from f/1.4 to f/22 over the session. */
export function ApertureFace({ display: d }: FaceProps) {
  const maskId = useSvgId('apt')
  const ap = aperture(apertureProgress(d.clock, d.frac))
  return (
    <>
      <div className="apt">
        <svg viewBox="0 0 100 100">
          <defs>
            <mask id={maskId}>
              <rect width="100" height="100" fill="white" />
              <polygon points={ap.points} fill="black" />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            <circle cx="50" cy="50" r="46" className="apt-house" />
            <g className="apt-blade">
              {ap.blades.map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)} />
              ))}
            </g>
          </g>
          <polygon points={ap.points} className="apt-edge" />
          <circle cx="50" cy="50" r="46" className="apt-ring" />
          <path d="M50 1.5l2.6 4.2h-5.2Z" className="apt-mark" />
        </svg>
      </div>
      <div className="t-small">{d.text}  ·  f/{ap.fStop}</div>
    </>
  )
}
