/** Swipe detection for the focus screen (pure: just numbers in, a direction out). */
export type Swipe = 'left' | 'right'

/** How far (px) and how fast the finger must move to count as a swipe, not a tap. */
export const SWIPE_MIN_PX = 50
export const SWIPE_MAX_MS = 700

/**
 * dx/dy: how far the finger moved (px), ms: how long it was down.
 * A swipe is mostly sideways (at least twice as much as up/down), long enough, and quick.
 */
export function classifySwipe(dx: number, dy: number, ms: number): Swipe | null {
  if (ms > SWIPE_MAX_MS) return null
  if (Math.abs(dx) < SWIPE_MIN_PX) return null
  if (Math.abs(dx) < Math.abs(dy) * 2) return null
  return dx < 0 ? 'left' : 'right'
}
