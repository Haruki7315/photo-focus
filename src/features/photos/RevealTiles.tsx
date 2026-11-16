import { useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import { gridFor, seedFrom, shownImageRect, tileOrder, tileStates, type TileCover, type TileOrder } from '../../core/reveal'

export interface TileReveal {
  count: number
  done: number
  part: number
  order: TileOrder
  cover: TileCover
}

/**
 * Puzzle pieces laid exactly over the visible part of the photo.
 * `imgRef` is the photo element, used to measure where the photo is drawn.
 */
export function RevealTiles(props: {
  imgRef: RefObject<HTMLImageElement | null>
  photoId: string
  natural: { w: number; h: number }
  fit: 'contain' | 'cover'
  reveal: TileReveal
  solidColor: string
}) {
  const { imgRef, natural, fit } = props
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Measure the photo now and whenever the screen size or mat changes.
  useLayoutEffect(() => {
    const img = imgRef.current
    if (!img) return
    const measure = () => {
      const box = { x: img.offsetLeft, y: img.offsetTop, w: img.clientWidth, h: img.clientHeight }
      setRect(shownImageRect(box, natural, fit))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(img)
    return () => ro.disconnect()
  }, [imgRef, natural, fit])

  const { count, done, part, order, cover } = props.reveal
  // Rounded so the grid doesn't change on tiny size changes.
  const aspect = Math.round((rect && rect.h ? rect.w / rect.h : natural.w / natural.h) * 10) / 10
  const { cols, rows } = gridFor(count, aspect)
  const orderList = useMemo(() => tileOrder(count, cols, rows, order, seedFrom(props.photoId)), [count, cols, rows, order, props.photoId])
  const { state, nowOpacity } = tileStates(orderList, done, part)

  if (!rect) return null
  return (
    <div
      className={`tiles${cover === 'solid' ? ' solid' : ''}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        ['--tilec' as string]: props.solidColor,
      }}
    >
      {state.map((s, i) => (
        <div key={i} className={`tile${s === 'hidden' ? '' : ` ${s}`}`} style={s === 'now' ? { opacity: nowOpacity } : undefined} />
      ))}
    </div>
  )
}
