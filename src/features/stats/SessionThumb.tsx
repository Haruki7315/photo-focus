import { useEffect, useState } from 'react'
import { sessionStore } from '../../platform/indexedDbStores'

const cache = new Map<string, string | null>()

/** URL for a session's saved thumbnail (cached; small images, so we keep them). */
export async function sessionThumbUrl(id: string): Promise<string | null> {
  if (cache.has(id)) return cache.get(id)!
  const blob = await sessionStore.getThumb(id).catch(() => undefined)
  const url = blob ? URL.createObjectURL(blob) : null
  cache.set(id, url)
  return url
}

export function forgetSessionThumbs() {
  for (const url of cache.values()) if (url) URL.revokeObjectURL(url)
  cache.clear()
}

export function SessionThumb({ id, alt }: { id: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    sessionThumbUrl(id).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [id])
  return url ? <img src={url} alt={alt} draggable={false} /> : <span className="thumb-blank" />
}
