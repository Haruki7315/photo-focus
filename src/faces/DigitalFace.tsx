import type { FaceProps } from './types'

/** Plain numbers. */
export function DigitalFace({ display }: FaceProps) {
  return <div className="t-main">{display.text}</div>
}
