import { useEffect, useState } from 'react'
import { getThumbUrl } from './photoUrls'

export function Thumb({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    getThumbUrl(id).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [id])
  return url ? <img src={url} alt="" draggable={false} /> : <span className="thumb-blank" />
}
