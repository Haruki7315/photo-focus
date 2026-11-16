import { describe, expect, it } from 'vitest'
import {
  addPhotos, albumFileName, buildAlbumManifest, cleanAlbumName, createAlbum, mergeImportedAlbum,
  parseAlbumManifest, photoFromManifest, photoPool, photosInAlbum, sortAlbums, togglePhoto, AlbumFileError,
} from './albums'
import type { PhotoMeta } from './photos'

const photo = (id: string, extra: Partial<PhotoMeta> = {}): PhotoMeta => ({
  id, title: id, addedAt: 1, width: 4, height: 3, favorite: false, hidden: false, exif: null, ...extra,
})
const photos = [photo('a'), photo('b'), photo('c', { hidden: true })]

describe('albums', () => {
  it('cleans names', () => {
    expect(cleanAlbumName('  Chicago   trip ')).toBe('Chicago trip')
    expect(cleanAlbumName('   ')).toBe('Untitled album')
    expect(cleanAlbumName('x'.repeat(60))).toHaveLength(40)
  })

  it('a photo can be in several albums', () => {
    const one = togglePhoto(createAlbum('One', '1', 0), 'a')
    const two = togglePhoto(createAlbum('Two', '2', 0), 'a')
    expect(photosInAlbum(photos, one).map((p) => p.id)).toEqual(['a'])
    expect(photosInAlbum(photos, two).map((p) => p.id)).toEqual(['a'])
    expect(togglePhoto(one, 'a').photoIds).toEqual([])
  })

  it('ignores removed photos and keeps library order', () => {
    const al = { ...createAlbum('x', '1', 0), photoIds: ['b', 'gone', 'a'] }
    expect(photosInAlbum(photos, al).map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('addPhotos skips duplicates', () => {
    const al = addPhotos({ ...createAlbum('x', '1', 0), photoIds: ['a'] }, ['a', 'b', 'b'])
    expect(al.photoIds).toEqual(['a', 'b'])
  })

  it('pool falls back to all photos when the album has nothing visible', () => {
    expect(photoPool(photos, null)).toBe(photos)
    const onlyHidden = { ...createAlbum('x', '1', 0), photoIds: ['c'] }
    expect(photoPool(photos, onlyHidden)).toBe(photos)
    const ab = { ...createAlbum('x', '1', 0), photoIds: ['b'] }
    expect(photoPool(photos, ab).map((p) => p.id)).toEqual(['b'])
  })

  it('sorts names naturally', () => {
    const list = ['Trip 10', 'trip 2', 'Apple'].map((n, i) => createAlbum(n, String(i), 0))
    expect(sortAlbums(list).map((a) => a.name)).toEqual(['Apple', 'trip 2', 'Trip 10'])
  })
})

describe('.pfalbum manifest', () => {
  const album = { ...createAlbum('Chicago', 'al1', 5), photoIds: ['b', 'a'] }

  it('round-trips through JSON', () => {
    const m = buildAlbumManifest(album, [...photos, photo('s', { sample: true })], 99)
    expect(m.photos.map((p) => [p.id, p.image, p.thumb])).toEqual([
      ['a', 'photos/0001.jpg', 'thumbs/0001.jpg'],
      ['b', 'photos/0002.jpg', 'thumbs/0002.jpg'],
    ])
    const back = parseAlbumManifest(JSON.parse(JSON.stringify(m)))
    expect(back).toEqual(m)
    expect(photoFromManifest(back.photos[0])).toEqual(photos[0])
  })

  it('rejects other files with a friendly message', () => {
    expect(() => parseAlbumManifest({ hello: 1 })).toThrow(AlbumFileError)
    expect(() => parseAlbumManifest(null)).toThrow("isn't a Photo Focus album")
    expect(() => parseAlbumManifest({ format: 'photo-focus-album', version: 99, album: { id: 'x' } })).toThrow('newer version')
  })

  it('skips broken photo entries', () => {
    const m = parseAlbumManifest({ format: 'photo-focus-album', version: 1, album: { id: 'x', name: '' }, photos: [{ id: 'p' }, 5, { id: 'q', image: 'i', thumb: 't' }] })
    expect(m.photos.map((p) => p.id)).toEqual(['q'])
    expect(m.album.name).toBe('Untitled album')
  })

  it('merges into an album with the same id, otherwise adds a new one', () => {
    const m = buildAlbumManifest({ ...album, name: 'Chicago 2026' }, photos, 0)
    const merged = mergeImportedAlbum([{ ...album, photoIds: ['b', 'z'] }], m, ['a', 'b'])
    expect(merged.isNew).toBe(false)
    expect(merged.album.photoIds).toEqual(['b', 'z', 'a'])
    expect(merged.album.name).toBe('Chicago 2026')
    const fresh = mergeImportedAlbum([], m, ['a', 'a'])
    expect(fresh).toEqual({ isNew: true, album: { id: 'al1', name: 'Chicago 2026', createdAt: 5, photoIds: ['a'] } })
  })

  it('makes safe file names', () => {
    expect(albumFileName('Trip: 3/4')).toBe('Trip- 3-4.pfalbum')
  })
})
