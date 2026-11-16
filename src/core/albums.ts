/**
 * Albums and the .pfalbum file format. Pure TypeScript, no DOM.
 * An album is a named list of photo ids, so one photo can be in several albums.
 */
import type { ExifInfo, PhotoMeta } from './photos'

export interface Album {
  id: string
  name: string
  createdAt: number
  photoIds: string[]
}

export const ALBUM_NAME_MAX = 40

export function cleanAlbumName(name: string): string {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, ALBUM_NAME_MAX)
  return clean || 'Untitled album'
}

export function createAlbum(name: string, id: string, now: number): Album {
  return { id, name: cleanAlbumName(name), createdAt: now, photoIds: [] }
}

/** The album's photos, in library order. Ids of removed photos are ignored. */
export function photosInAlbum(photos: readonly PhotoMeta[], album: Album): PhotoMeta[] {
  const ids = new Set(album.photoIds)
  return photos.filter((p) => ids.has(p.id))
}

/**
 * The photos the timer picks from: the active album, or all photos.
 * If the album has no visible photo (empty, or all hidden), fall back to all photos so the screen is never blank.
 */
export function photoPool(photos: readonly PhotoMeta[], album: Album | null): readonly PhotoMeta[] {
  if (!album) return photos
  const inAlbum = photosInAlbum(photos, album)
  return inAlbum.some((p) => !p.hidden) ? inAlbum : photos
}

export function hasPhoto(album: Album, photoId: string): boolean {
  return album.photoIds.includes(photoId)
}

export function togglePhoto(album: Album, photoId: string): Album {
  return hasPhoto(album, photoId)
    ? { ...album, photoIds: album.photoIds.filter((id) => id !== photoId) }
    : { ...album, photoIds: [...album.photoIds, photoId] }
}

export function addPhotos(album: Album, photoIds: readonly string[]): Album {
  const have = new Set(album.photoIds)
  const added = photoIds.filter((id) => !have.has(id) && have.add(id))
  return added.length ? { ...album, photoIds: [...album.photoIds, ...added] } : album
}

/** Albums sorted by name (A→Z, natural number order, any language). */
export function sortAlbums(albums: readonly Album[]): Album[] {
  return [...albums].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
}

// ---- .pfalbum file (a zip of album.json + photos/ + thumbs/) ----

export const ALBUM_FILE_FORMAT = 'photo-focus-album'
export const ALBUM_FILE_VERSION = 1
export const ALBUM_FILE_EXT = '.pfalbum'

export interface AlbumFilePhoto {
  id: string
  title: string
  addedAt: number
  width: number
  height: number
  favorite: boolean
  hidden: boolean
  exif: ExifInfo | null
  /** Paths inside the zip. */
  image: string
  thumb: string
}

export interface AlbumFileManifest {
  format: typeof ALBUM_FILE_FORMAT
  version: number
  exportedAt: number
  album: { id: string; name: string; createdAt: number }
  photos: AlbumFilePhoto[]
}

export function buildAlbumManifest(album: Album, photos: readonly PhotoMeta[], now: number): AlbumFileManifest {
  return {
    format: ALBUM_FILE_FORMAT,
    version: ALBUM_FILE_VERSION,
    exportedAt: now,
    album: { id: album.id, name: album.name, createdAt: album.createdAt },
    photos: photosInAlbum(photos, album)
      .filter((p) => !p.sample)
      .map((p, i) => {
        const n = String(i + 1).padStart(4, '0')
        return {
          id: p.id,
          title: p.title,
          addedAt: p.addedAt,
          width: p.width,
          height: p.height,
          favorite: p.favorite,
          hidden: p.hidden,
          exif: p.exif,
          image: `photos/${n}.jpg`,
          thumb: `thumbs/${n}.jpg`,
        }
      }),
  }
}

export class AlbumFileError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

/** Check album.json from a file someone gave us. Throws AlbumFileError with a friendly message. */
export function parseAlbumManifest(json: unknown): AlbumFileManifest {
  if (!isObj(json) || json.format !== ALBUM_FILE_FORMAT) throw new AlbumFileError("This isn't a Photo Focus album file.")
  if (num(json.version) > ALBUM_FILE_VERSION) throw new AlbumFileError('This album was made by a newer version of Photo Focus. Update the app first.')
  const a = isObj(json.album) ? json.album : {}
  const id = str(a.id)
  if (!id) throw new AlbumFileError('This album file is damaged (no album id).')
  const photos: AlbumFilePhoto[] = (Array.isArray(json.photos) ? json.photos : []).flatMap((p): AlbumFilePhoto[] => {
    if (!isObj(p) || !str(p.id) || !str(p.image) || !str(p.thumb)) return []
    return [
      {
        id: str(p.id),
        title: str(p.title, 'Photo'),
        addedAt: num(p.addedAt),
        width: num(p.width, 1),
        height: num(p.height, 1),
        favorite: p.favorite === true,
        hidden: p.hidden === true,
        exif: isObj(p.exif) ? (p.exif as ExifInfo) : null,
        image: str(p.image),
        thumb: str(p.thumb),
      },
    ]
  })
  return {
    format: ALBUM_FILE_FORMAT,
    version: num(json.version, 1),
    exportedAt: num(json.exportedAt),
    album: { id, name: cleanAlbumName(str(a.name)), createdAt: num(a.createdAt) },
    photos,
  }
}

export function photoFromManifest(p: AlbumFilePhoto): PhotoMeta {
  return { id: p.id, title: p.title, addedAt: p.addedAt, width: p.width, height: p.height, favorite: p.favorite, hidden: p.hidden, exif: p.exif }
}

/**
 * Merge an imported album into the ones we have. Same album id (imported before, or made on
 * this device) → add the new photos to it and take the file's name. Otherwise it's a new album.
 */
export function mergeImportedAlbum(albums: readonly Album[], m: AlbumFileManifest, photoIds: readonly string[]): { album: Album; isNew: boolean } {
  const existing = albums.find((a) => a.id === m.album.id)
  if (existing) return { album: { ...addPhotos(existing, photoIds), name: m.album.name }, isNew: false }
  return { album: { id: m.album.id, name: m.album.name, createdAt: m.album.createdAt, photoIds: [...new Set(photoIds)] }, isNew: true }
}

/** A safe file name, e.g. "Chicago 2026.pfalbum". */
export function albumFileName(name: string): string {
  const safe = cleanAlbumName(name).replace(/[\\/:*?"<>|]/g, '-')
  return safe + ALBUM_FILE_EXT
}
