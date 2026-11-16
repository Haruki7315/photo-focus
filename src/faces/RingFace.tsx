import { RING_CIRCUMFERENCE, ringOffset } from '../core/faceMath'
import type { FaceProps } from './types'

/** A ring that fills as the session runs (Clock mode: once a minute). */
export function RingFace({ display: d }: FaceProps) {
  return (
    <div className="ring">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" className="ring-track" />
        <circle
          cx="50"
          cy="50"
          r="44"
          className="ring-arc"
          transform="rotate(-90 50 50)"
          style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: ringOffset(d.frac) }}
        />
      </svg>
      <div className="t-main">{d.text}</div>
    </div>
  )
}
