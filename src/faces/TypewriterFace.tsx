import { useEffect, useState } from 'react'
import { typewriterPhrase } from '../core/faceMath'
import type { FaceProps } from './types'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Types a short sentence each minute, one letter at a time. */
export function TypewriterFace({ display: d, settings, demo }: FaceProps) {
  const phrase = typewriterPhrase({ clock: d.clock, hour: d.hour, minute: d.minute, h24: settings.h24, phase: d.phase, remainingMs: d.remainingMs })
  const [target, setTarget] = useState(phrase)
  const [typed, setTyped] = useState(reduced() ? phrase.length : 0)

  // New sentence: start typing again from the first letter.
  if (phrase !== target) {
    setTarget(phrase)
    setTyped(reduced() ? phrase.length : 0)
  }

  useEffect(() => {
    if (typed >= target.length) return
    const t = window.setTimeout(() => setTyped((n) => n + 1), !d.clock && demo ? 22 : 70)
    return () => window.clearTimeout(t)
  }, [typed, target, d.clock, demo])

  return (
    <>
      <div className="tw">
        <span>{target.slice(0, typed)}</span>
        <span className="caret" />
      </div>
      {!d.clock && <div className="t-info">{d.text}</div>}
    </>
  )
}
