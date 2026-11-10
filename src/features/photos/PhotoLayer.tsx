import { useEffect, useRef, useState } from 'react'
import { captionNeedsDarkText, type LookSettings } from '../../core/look'
import { formatExifLine, type PhotoMeta } from '../../core/photos'
import { getDisplayUrl } from './photoUrls'

const FADE_MS = 380

/**
 * Load an image before showing it, so it appears in one go.
 * Waits for "load", then (briefly) for decoding. Every step has a time limit,
 * because img.decode() can hang in some browsers (including iOS Safari).
 */
function preload(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    const done = () => resolve()
    const giveUp = window.setTimeout(done, 5000)
    img.onload = () => {
      window.clearTimeout(giveUp)
      window.setTimeout(done, 800)
      img.decode?.().then(done, done)
    }
    img.onerror = () => {
      window.clearTimeout(giveUp)
      done()
    }
    img.src = url
  })
}

/**
 * The photo, its blurred background, mat, caption and night veil.
 * When the photo changes it fades out, loads the next one, then fades in.
 */
export function PhotoLayer({ photo, look }: { photo: PhotoMeta | null; look: LookSettings }) {
  const [shown, setShown] = useState<{ url: string; photo: PhotoMeta } | null>(null)
  const [fading, setFading] = useState(false)
  const hasShown = useRef(false)

  useEffect(() => {
    if (!photo) return
    let cancelled = false
    let timer = 0
    ;(async () => {
      const url = await getDisplayUrl(photo.id)
      if (!url || cancelled) return
      await preload(url)
      if (cancelled) return
      if (!hasShown.current) {
        // First photo: nothing to fade out, show it right away.
        hasShown.current = true
        setShown({ url, photo })
        return
      }
      setFading(true)
      timer = window.setTimeout(() => {
        if (cancelled) return
        setShown({ url, photo })
        setFading(false)
      }, FADE_MS)
    })()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [photo])

  const p = shown?.photo
  // Keep caption info (favorite etc.) fresh for the photo on screen.
  const meta = photo && p && photo.id === p.id ? photo : p
  const blur = look.background === 'blur'
  const classes = ['photo-layer', `fit-${look.fit}`, fading ? 'fading' : '', look.night ? 'night' : '', blur ? '' : 'no-blur', look.showPhoto ? '' : 'no-photo']

  return (
    <div
      className={classes.filter(Boolean).join(' ')}
      style={{ backgroundColor: blur ? '#000' : look.background, ['--mat' as string]: `${look.mat}cqmin` }}
    >
      {shown && <img className="layer blurbg" src={shown.url} alt="" draggable={false} />}
      {shown && <img className="layer photo" src={shown.url} alt={meta?.title ?? 'Photo'} draggable={false} />}
      <div className="nightveil" />
      {meta && look.showCaption && look.showPhoto && (
        <div className={`caption${captionNeedsDarkText(look) ? ' ink' : ''}`}>
          <b>{meta.title || 'Untitled'}</b>
          <span>{formatExifLine(meta.exif) ?? 'No camera info in this file'}</span>
        </div>
      )}
    </div>
  )
}
