/**
 * Photo reveal (ported from the prototype). Pure TypeScript, no DOM.
 *
 * Puzzle pieces: the photo is covered by one piece per focus minute; each
 * piece fades from dim to clear during its minute, and the picture is complete
 * when the session ends. Clock mode: 60 pieces per hour.
 * Develop: the photo starts black-and-white and turns to full color.
 */
import type { Phase } from './timer'

export type RevealMode = 'none' | 'tiles' | 'develop'
export type TileOrder = 'random' | 'seq' | 'spiral'
export type TileCover = 'frost' | 'solid'

export interface RevealInput {
  clock: boolean
  /** 0..1 through the current hour (clock mode). */
  hourFrac: number
  phase: Phase
  /** 0..1 through the current phase (focus mode). */
  frac: number
  /** Length of the current phase in minutes. */
  totalMinutes: number
  /** Focus length in minutes (used during breaks). */
  focusMinutes: number
}

/** How many pieces, how many are fully clear, and how far the current one has faded (0..1). */
export function tileProgress(input: RevealInput): { count: number; done: number; part: number } {
  if (input.clock) {
    const e = Math.max(0, Math.min(1, input.hourFrac)) * 60
    const done = Math.floor(e)
    return { count: 60, done, part: e - done }
  }
  if (input.phase !== 'focus') {
    // Break: the finished picture stays fully visible.
    const count = Math.max(1, Math.round(input.focusMinutes))
    return { count, done: count, part: 0 }
  }
  const count = Math.max(1, Math.round(input.totalMinutes))
  const e = Math.min(count, Math.max(0, input.frac) * count)
  const done = Math.floor(e)
  return { count, done, part: e - done }
}

/** How gray the photo is for Develop: 1 = black-and-white, 0 = full color. */
export function developGrayscale(input: Pick<RevealInput, 'clock' | 'hourFrac' | 'phase' | 'frac'>): number {
  const gs = input.clock ? 1 - input.hourFrac : input.phase === 'focus' ? 1 - input.frac : 0
  return Math.max(0, Math.min(1, gs))
}

/**
 * Columns x rows for N pieces that best match the photo's shape (width / height).
 * Only exact grids (cols * rows = N), like the prototype.
 */
export function gridFor(n: number, aspect: number): { cols: number; rows: number } {
  let best = { cols: n, rows: 1 }
  let bestErr = Infinity
  const target = aspect > 0 && Number.isFinite(aspect) ? aspect : 1.4
  for (let c = 1; c <= n; c++) {
    if (n % c) continue
    const r = n / c
    const err = Math.abs(Math.log(c / r / target))
    if (err < bestErr) {
      bestErr = err
      best = { cols: c, rows: r }
    }
  }
  return best
}

/** A number from a string, so each photo gets its own (but repeatable) random order. */
export function seedFrom(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0
  return (h % 2147483646) + 1
}

/**
 * The order pieces are revealed in: a list of piece indexes (row by row).
 * random = shuffled (same shuffle for the same photo), seq = in order,
 * spiral = from the center outward.
 */
export function tileOrder(n: number, cols: number, rows: number, order: TileOrder, seed: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  if (order === 'random') {
    let s = Math.max(1, Math.floor(seed)) % 2147483647
    const rnd = () => {
      s = (s * 16807) % 2147483647
      return s / 2147483647
    }
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
    }
  } else if (order === 'spiral') {
    const cx = (cols - 1) / 2
    const cy = (rows - 1) / 2
    const dist = (i: number) => Math.hypot((i % cols) - cx, Math.floor(i / cols) - cy)
    const ang = (i: number) => Math.atan2(Math.floor(i / cols) - cy, (i % cols) - cx)
    idx.sort((a, b) => dist(a) - dist(b) || ang(a) - ang(b))
  }
  return idx
}

/** For each piece (by grid index): 'done' (clear), 'now' (fading), or 'hidden'; plus the opacity of the current one. */
export function tileStates(orderList: number[], done: number, part: number): { state: Array<'done' | 'now' | 'hidden'>; nowOpacity: number } {
  const state: Array<'done' | 'now' | 'hidden'> = new Array(orderList.length).fill('hidden')
  orderList.forEach((tile, j) => {
    state[tile] = j < done ? 'done' : j === done ? 'now' : 'hidden'
  })
  return { state, nowOpacity: 1 - part }
}

/**
 * Where the photo actually appears inside its box (so pieces line up with it).
 * For "whole photo" (contain) the picture is centered with empty bars; for
 * "fill" (cover) it fills the box.
 */
export function shownImageRect(
  box: { x: number; y: number; w: number; h: number },
  natural: { w: number; h: number },
  fit: 'contain' | 'cover',
): { x: number; y: number; w: number; h: number } {
  if (fit === 'cover' || !natural.w || !natural.h) return box
  const s = Math.min(box.w / natural.w, box.h / natural.h)
  const w = natural.w * s
  const h = natural.h * s
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }
}
