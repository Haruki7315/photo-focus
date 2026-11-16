import { useEffect, useRef } from 'react'
import { makeStars, starTrailAngle } from '../core/faceMath'
import type { FaceProps } from './types'

const STARS = makeStars()

/** Star trails that grow like a long exposure. Drawn on a canvas. */
export function StarTrailFace({ display: d }: FaceProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const angle = starTrailAngle(d.clock, d.frac, d.hourFrac)
  // Redraw only when the trail visibly changes (about every 0.2°).
  const step = Math.round(angle * 5)

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const w = cv.clientWidth
    if (!w) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const px = Math.round(w * dpr)
    if (cv.width !== px) {
      cv.width = px
      cv.height = px
    }
    const g = cv.getContext('2d')
    if (!g) return
    g.clearRect(0, 0, px, px)
    g.save()
    g.beginPath()
    g.arc(px / 2, px / 2, px / 2, 0, 7)
    g.clip()
    const sky = g.createLinearGradient(0, 0, 0, px)
    sky.addColorStop(0, 'rgba(4,6,18,.82)')
    sky.addColorStop(1, 'rgba(22,30,58,.82)')
    g.fillStyle = sky
    g.fillRect(0, 0, px, px)
    const cx = px * 0.5
    const cy = px * 0.3
    const ang = Math.max((step / 5) * (Math.PI / 180), 0.004)
    g.lineCap = 'round'
    for (const s of STARS) {
      g.strokeStyle = `rgba(${s.c},${(s.b * 0.85).toFixed(2)})`
      g.lineWidth = (0.45 + s.w * 1.1) * dpr * (w / 120 + 0.4)
      g.beginPath()
      g.arc(cx, cy, s.rr * px, s.a - ang, s.a)
      g.stroke()
    }
    // Hills in the foreground.
    g.fillStyle = 'rgba(2,3,7,.96)'
    g.beginPath()
    g.moveTo(0, px)
    for (let x = 0; x <= px; x += px / 40) {
      const peak = x > px * 0.62 && x < px * 0.7 ? Math.sin(((x - px * 0.62) / (px * 0.08)) * Math.PI) * px * 0.1 : 0
      g.lineTo(x, px * 0.84 - Math.sin((x / px) * 7) * px * 0.025 - peak)
    }
    g.lineTo(px, px)
    g.fill()
    g.restore()
  }, [step, d.text.length])

  const mins = d.clock ? d.minute : Math.round(d.frac * d.totalMinutes)
  return (
    <>
      <div className="stars">
        <canvas ref={canvas} />
      </div>
      <div className="t-small">{d.text}</div>
      <div className="t-info">Exposure {mins} min{d.clock ? ' (since :00)' : ''}</div>
    </>
  )
}
