import { useEffect, useState } from 'react'
import type { FaceProps } from './types'

const FLIP_MS = 420

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * One flip card. When the digit changes, the top flap falls down showing
 * the old digit, then the bottom flap swings in with the new one.
 */
function FlipCard({ value }: { value: string }) {
  const [prev, setPrev] = useState(value)
  const [flap, setFlap] = useState<{ from: string; to: string; id: number } | null>(null)

  // The digit changed: start a flip (React's "update state while rendering" pattern).
  if (value !== prev) {
    setPrev(value)
    setFlap(prefersReducedMotion() ? null : { from: prev, to: value, id: (flap?.id ?? 0) + 1 })
  }

  // Remove the flaps when the animation is done.
  useEffect(() => {
    if (!flap) return
    const t = window.setTimeout(() => setFlap(null), FLIP_MS)
    return () => window.clearTimeout(t)
  }, [flap])

  return (
    <span className="fc">
      <span className="fc-h fc-t"><b>{value}</b></span>
      <span className="fc-h fc-b"><b>{flap ? flap.from : value}</b></span>
      {flap && (
        <span key={flap.id}>
          <span className="fc-h fc-t fc-flap-t"><b>{flap.from}</b></span>
          <span className="fc-h fc-b fc-flap-b"><b>{flap.to}</b></span>
        </span>
      )}
    </span>
  )
}

/** Flip clock: a card per digit; colons and other characters sit between. */
export function FlipFace({ display }: FaceProps) {
  const chars = [...display.text]
  // When the layout changes (e.g. 9:59 -> 10:00), start fresh without flipping.
  const pattern = display.text.replace(/\d/g, '0')
  return (
    <div className="flip" key={pattern}>
      {chars.map((ch, i) => (/\d/.test(ch) ? <FlipCard key={i} value={ch} /> : <span key={i} className="fsep">{ch}</span>))}
    </div>
  )
}
