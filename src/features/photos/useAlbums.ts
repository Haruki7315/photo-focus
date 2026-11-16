import { useCallback, useMemo, useRef, useState } from 'react'
import { addPhotos, cleanAlbumName, createAlbum, sortAlbums, togglePhoto, type Album } from '../../core/albums'
import { albumStore } from '../../platform/indexedDbStores'
import { saveSetting } from '../settings/appSettings'

/** Your albums, and which one the timer uses. Every change is saved right away. */
export function useAlbums(initial: Album[], initialActive: string | null) {
  const [list, setList] = useState<Album[]>(initial)
  // The latest list, so quick taps in a row each build on the previous change.
  const listRef = useRef(initial)
  const commit = useCallback((next: Album[]) => {
    listRef.current = next
    setList(next)
  }, [])
  const [activeId, setActiveIdState] = useState<string | null>(initialActive)

  const albums = useMemo(() => sortAlbums(list), [list])
  const active = albums.find((a) => a.id === activeId) ?? null

  const setActive = useCallback((id: string | null) => {
    setActiveIdState(id)
    saveSetting('activeAlbum', id)
  }, [])

  const save = useCallback(
    (album: Album) => {
      const all = listRef.current
      commit(all.some((a) => a.id === album.id) ? all.map((a) => (a.id === album.id ? album : a)) : [...all, album])
      void albumStore.put(album).catch(() => {})
    },
    [commit],
  )

  const change = useCallback(
    (id: string, fn: (a: Album) => Album) => {
      const a = listRef.current.find((x) => x.id === id)
      if (a) save(fn(a))
    },
    [save],
  )

  /** Make a new album and switch to it. */
  const create = useCallback(
    (name: string) => {
      const album = createAlbum(name, crypto.randomUUID(), Date.now())
      save(album)
      setActive(album.id)
      return album
    },
    [save, setActive],
  )

  const rename = useCallback((id: string, name: string) => change(id, (a) => ({ ...a, name: cleanAlbumName(name) })), [change])
  const toggle = useCallback((id: string, photoId: string) => change(id, (a) => togglePhoto(a, photoId)), [change])
  const add = useCallback((id: string, photoIds: string[]) => change(id, (a) => addPhotos(a, photoIds)), [change])

  /** Delete the album only. Its photos stay in the library (and in other albums). */
  const remove = useCallback(
    (id: string) => {
      commit(listRef.current.filter((a) => a.id !== id))
      void albumStore.remove(id).catch(() => {})
      if (activeId === id) setActive(null)
    },
    [activeId, setActive, commit],
  )

  return { albums, active, setActive, create, rename, toggle, add, remove, save }
}

export type Albums = ReturnType<typeof useAlbums>
