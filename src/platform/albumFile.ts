import { strFromU8, strToU8, unzip, zip, type Unzipped } from 'fflate'
import {
  AlbumFileError, buildAlbumManifest, parseAlbumManifest, photoFromManifest,
  type Album, type AlbumFileManifest,
} from '../core/albums'
import type { PhotoMeta } from '../core/photos'
import type { PhotoFiles } from './types'

/**
 * .pfalbum files: a zip with album.json, photos/ (display copies) and thumbs/.
 * The JPEGs are already compressed, so we just store them (level 0): much faster, same size.
 */
export async function makeAlbumFile(
  album: Album,
  photos: readonly PhotoMeta[],
  getFiles: (id: string) => Promise<PhotoFiles | undefined>,
  fileName: string,
): Promise<{ file: File; count: number }> {
  const manifest = buildAlbumManifest(album, photos, Date.now())
  const entries: Record<string, Uint8Array> = {}
  const kept: AlbumFileManifest['photos'] = []
  for (const p of manifest.photos) {
    const files = await getFiles(p.id)
    if (!files) continue
    entries[p.image] = new Uint8Array(await files.display.arrayBuffer())
    entries[p.thumb] = new Uint8Array(await files.thumb.arrayBuffer())
    kept.push(p)
  }
  entries['album.json'] = strToU8(JSON.stringify({ ...manifest, photos: kept }, null, 2))
  const bytes = await new Promise<Uint8Array>((resolve, reject) =>
    zip(entries, { level: 0 }, (err, data) => (err ? reject(err) : resolve(data))),
  )
  return { file: new File([bytes as BlobPart], fileName, { type: 'application/zip' }), count: kept.length }
}

export interface ReadAlbum {
  manifest: AlbumFileManifest
  photos: Array<{ meta: PhotoMeta; files: PhotoFiles }>
}

/** Open a .pfalbum someone picked. Throws AlbumFileError with a friendly message. */
export async function readAlbumFile(file: File): Promise<ReadAlbum> {
  let unzipped: Unzipped
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    unzipped = await new Promise<Unzipped>((resolve, reject) => unzip(bytes, (err, data) => (err ? reject(err) : resolve(data))))
  } catch {
    throw new AlbumFileError(`"${file.name}" isn't a Photo Focus album file.`)
  }
  const json = unzipped['album.json']
  if (!json) throw new AlbumFileError(`"${file.name}" isn't a Photo Focus album file.`)
  let parsed: unknown
  try {
    parsed = JSON.parse(strFromU8(json))
  } catch {
    throw new AlbumFileError('This album file is damaged.')
  }
  const manifest = parseAlbumManifest(parsed)
  const photos = manifest.photos.flatMap((p) => {
    const image = unzipped[p.image]
    const thumb = unzipped[p.thumb]
    if (!image || !thumb) return []
    return [{
      meta: photoFromManifest(p),
      files: { display: new Blob([image as BlobPart], { type: 'image/jpeg' }), thumb: new Blob([thumb as BlobPart], { type: 'image/jpeg' }) },
    }]
  })
  return { manifest, photos }
}
