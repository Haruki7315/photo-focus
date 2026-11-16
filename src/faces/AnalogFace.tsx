import { handAngles, piePath } from '../core/faceMath'
import type { FaceProps } from './types'

const TICKS = Array.from({ length: 60 }, (_, i) => i)

/** Clock mode: real hands. Focus mode: a red wedge that shrinks as time runs out. */
export function AnalogFace({ display: d, settings }: FaceProps) {
  const a = handAngles(d.hour, d.minute, d.second)
  const left = Math.max(0, Math.min(1, 1 - d.frac))
  return (
    <>
      <div className="dial">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="47" className="dial-face" />
          {!d.clock && <path className="dial-wedge" d={piePath(50, 50, 38, left)} />}
          <g className="dial-ticks">
            {TICKS.map((i) => {
              const long = i % 5 === 0
              return <line key={i} x1="50" y1={long ? 7 : 9} x2="50" y2="12.5" strokeWidth={long ? 1.8 : 0.7} transform={`rotate(${i * 6} 50 50)`} />
            })}
          </g>
          {d.clock && (
            <g className="dial-hands">
              <line x1="50" y1="50" x2="50" y2="29" strokeWidth="3.4" transform={`rotate(${a.hour} 50 50)`} />
              <line x1="50" y1="50" x2="50" y2="16" strokeWidth="2.2" transform={`rotate(${a.minute} 50 50)`} />
              {settings.seconds && <line className="sec" x1="50" y1="57" x2="50" y2="12" strokeWidth="1" transform={`rotate(${a.second} 50 50)`} />}
            </g>
          )}
          <circle cx="50" cy="50" r="2.4" fill="currentColor" />
        </svg>
      </div>
      <div className="t-small">{d.text}</div>
    </>
  )
}
