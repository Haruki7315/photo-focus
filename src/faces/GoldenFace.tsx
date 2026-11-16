import { goldenHourText } from '../core/sky'
import type { FaceProps } from './types'

/** Time plus when the next golden hour starts, in the chosen place's local time. */
export function GoldenFace({ display: d, settings, now, sky }: FaceProps) {
  return (
    <>
      <div className="t-main">{d.text}</div>
      <div className="t-info gold">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M2 17h20" />
          <path d="M6.5 17a5.5 5.5 0 0 1 11 0" fill="currentColor" />
          <path d="M12 6v2.5M5 9.5l1.6 1.6M19 9.5l-1.6 1.6" />
        </svg>
        <span>{goldenHourText(sky, now, settings.h24)}</span>
      </div>
    </>
  )
}
