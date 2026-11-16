import { dotsGrid, dotsState, piePath } from '../core/faceMath'
import type { FaceProps } from './types'

const R = 3.6

/** One dot per minute; the current dot fills like a pie. */
export function DotsFace({ display: d }: FaceProps) {
  const { count, full, part } = dotsState({ clock: d.clock, minute: d.minute, second: d.second, frac: d.frac, totalMinutes: d.totalMinutes })
  const { cols, rows, cell } = dotsGrid(count)
  const cx = (i: number) => (i % cols) * 10 + 5
  const cy = (i: number) => Math.floor(i / cols) * 10 + 5
  return (
    <>
      <div className="dots">
        <svg viewBox={`0 0 ${cols * 10} ${rows * 10}`} style={{ width: `${(cols * cell).toFixed(2)}em`, height: `${(rows * cell).toFixed(2)}em` }}>
          {Array.from({ length: count }, (_, i) => (
            <circle key={i} cx={cx(i)} cy={cy(i)} r={R} className={`dot ${i < full ? 'done' : i === full ? 'now' : 'todo'}`} />
          ))}
          {full < count && <path className="dot-pie" d={piePath(cx(full), cy(full), R, part)} />}
        </svg>
      </div>
      <div className="t-small">{d.text}</div>
    </>
  )
}
