import type { PhotoFiles } from '../../platform/types'

/**
 * Turns stored image blobs into URLs an <img> can show.
 * Thumbnails are small, so we keep all of them. Full display images are big,
 * so only the last few are kept and older ones are released.
 */

const KEEP_DISPLAY = 4
const thumbs = new Map<string, string>()
const displays = new Map<string, string>() // insertion order = least recently used first
const inMemory = new Map<string, PhotoFiles>() // sample photos (not in the database)

type Loader = (id: string) => Promise<PhotoFiles | undefined>
let loader: Loader = async () => undefined

export function setPhotoFileLoader(fn: Loader) {
  loader = fn
}

export function registerInMemoryFiles(id: string, files: PhotoFiles) {
  inMemory.set(id, files)
}

async function files(id: string) {
  return inMemory.get(id) ?? (await loader(id))
}

export async function getThumbUrl(id: string): Promise<string | null> {
  const hit = thumbs.get(id)
  if (hit) return hit
  const f = await files(id)
  if (!f) return null
  const url = URL.createObjectURL(f.thumb)
  thumbs.set(id, url)
  return url
}

export async function getDisplayUrl(id: string): Promise<string | null> {
  const hit = displays.get(id)
  if (hit) {
    displays.delete(id)
    displays.set(id, hit)
    return hit
  }
  const f = await files(id)
  if (!f) return null
  const url = URL.createObjectURL(f.display)
  displays.set(id, url)
  while (displays.size > KEEP_DISPLAY) {
    const [oldId, oldUrl] = displays.entries().next().value as [string, string]
    displays.delete(oldId)
    // Wait a moment in case the old image is still fading out.
    setTimeout(() => URL.revokeObjectURL(oldUrl), 2000)
  }
  return url
}

/** Forget a deleted photo's URLs. */
export function releasePhotoUrls(id: string) {
  for (const map of [thumbs, displays]) {
    const url = map.get(id)
    if (url) URL.revokeObjectURL(url)
    map.delete(id)
  }
  inMemory.delete(id)
}
