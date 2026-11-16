import { chartMax, formatMinutes, type DayTotal } from '../../core/stats'

const W = 320
const H = 150
const L = 30
const B = 22
const T = 14

/** Bar chart of focus minutes for the last 7 days (ported from the prototype). */
export function WeekChart({ week }: { week: DayTotal[] }) {
  const maxV = chartMax(week)
  const y = (v: number) => T + (H - B - T) * (1 - v / maxV)
  const bw = (W - L - 8) / 7
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Focus minutes for the last 7 days">
        {[0, maxV / 2, maxV].map((v) => (
          <g key={v}>
            <line className="grid" x1={L} x2={W - 4} y1={y(v)} y2={y(v)} />
            <text className="axis" x={L - 5} y={y(v) + 3.5} textAnchor="end">{formatMinutes(v)}</text>
          </g>
        ))}
        {week.map((d, i) => {
          const x = L + 4 + i * bw
          const h = ((H - B - T) * d.minutes) / maxV
          const label = i === 6 ? 'Today' : new Date(d.start).toLocaleDateString(undefined, { weekday: 'short' })
          return (
            <g key={d.start}>
              <rect className={`bar${i === 6 ? ' today' : ''}`} x={x + bw * 0.18} y={y(0) - h} width={bw * 0.64} height={h} rx="2" />
              {d.minutes > 0 && (
                <text className="val" x={x + bw / 2} y={y(0) - h - 3} textAnchor="middle">{formatMinutes(d.minutes)}</text>
              )}
              <text className="axis" x={x + bw / 2} y={H - 6} textAnchor="middle">{label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
