import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { canHide, pickNextPhoto, type PhotoMeta } from '../../core/photos'
import { importPhotoFile } from '../../platform/imageImport'
import { photoStore } from '../../platform/indexedDbStores'
import { requestPersistentStorage } from '../../platform/storageInfo'
import { registerInMemoryFiles, releasePhotoUrls, setPhotoFileLoader } from './photoUrls'
import { loadSamples } from './samples'

setPhotoFileLoader((id) => photoStore.getFiles(id))

export interface ImportProgress {
  done: number
  total: number
}

export interface ImportSummary {
  added: number
  raw: string[]
  failed: string[]
}

/**
 * The photo library: your photos from IndexedDB, or the 3 samples while you
 * have none. Keeps track of the current photo and a short history for "back".
 */
export function usePhotoLibrary() {
  const [userPhotos, setUserPhotos] = useState<PhotoMeta[] | null>(null)
  const [samples, setSamples] = useState<PhotoMeta[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const history = useRef<string[]>([])

  // Load saved photos once.
  useEffect(() => {
    let cancelled = false
    photoStore
      .list()
      .catch(() => [])
      .then((saved) => {
        if (cancelled) return
        setUserPhotos(saved)
        if (saved.length) setCurrentId(pickNextPhoto(saved, null))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const usingSamples = userPhotos !== null && userPhotos.length === 0

  // Draw the sample photos only when they're needed (no photos of your own).
  const needSamples = usingSamples && samples.length === 0
  useEffect(() => {
    if (!needSamples) return
    let cancelled = false
    loadSamples().then((items) => {
      if (cancelled) return
      items.forEach((s) => registerInMemoryFiles(s.meta.id, s.files))
      const metas = items.map((s) => s.meta)
      setSamples(metas)
      setCurrentId((cur) => (cur && metas.some((m) => m.id === cur) ? cur : pickNextPhoto(metas, null)))
    })
    return () => {
      cancelled = true
    }
  }, [needSamples])
  const photos = useMemo(() => (usingSamples ? samples : (userPhotos ?? [])), [usingSamples, samples, userPhotos])
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  const current = photos.find((p) => p.id === currentId) ?? null

  const currentRef = useRef(currentId)
  useEffect(() => {
    currentRef.current = currentId
  }, [currentId])

  const remember = (prev: string | null, id: string | null) => {
    if (prev && prev !== id) history.current = [...history.current.slice(-49), prev]
  }

  const show = useCallback((id: string | null, keepHistory = true) => {
    if (keepHistory) remember(currentRef.current, id)
    currentRef.current = id
    setCurrentId(id)
  }, [])

  const next = useCallback(() => {
    const id = pickNextPhoto(photosRef.current, currentRef.current)
    remember(currentRef.current, id)
    currentRef.current = id
    setCurrentId(id)
  }, [])

  const previous = useCallback(() => {
    const ids = new Set(photosRef.current.filter((p) => !p.hidden).map((p) => p.id))
    while (history.current.length) {
      const id = history.current.pop()!
      if (ids.has(id)) {
        currentRef.current = id
        setCurrentId(id)
        return
      }
    }
  }, [])

  /** Save a changed photo (samples are only changed in memory). */
  const updatePhoto = useCallback((meta: PhotoMeta) => {
    if (meta.sample) {
      setSamples((list) => list.map((p) => (p.id === meta.id ? meta : p)))
    } else {
      setUserPhotos((list) => (list ?? []).map((p) => (p.id === meta.id ? meta : p)))
      void photoStore.update(meta)
    }
  }, [])

  const toggleFavorite = useCallback(
    (id: string) => {
      const p = photosRef.current.find((x) => x.id === id)
      if (p) updatePhoto({ ...p, favorite: !p.favorite })
    },
    [updatePhoto],
  )

  /** Hide or unhide. Returns false if this is the last visible photo. */
  const setHidden = useCallback(
    (id: string, hidden: boolean): boolean => {
      const p = photosRef.current.find((x) => x.id === id)
      if (!p) return false
      if (hidden && !canHide(photosRef.current, id)) return false
      updatePhoto({ ...p, hidden })
      if (hidden) {
        const rest = photosRef.current.map((x) => (x.id === id ? { ...x, hidden: true } : x))
        setCurrentId((cur) => (cur === id ? pickNextPhoto(rest, id) : cur))
      }
      return true
    },
    [updatePhoto],
  )

  const remove = useCallback(async (id: string) => {
    await photoStore.remove(id)
    releasePhotoUrls(id)
    history.current = history.current.filter((h) => h !== id)
    const rest = photosRef.current.filter((p) => p.id !== id && !p.sample)
    setUserPhotos((list) => (list ?? []).filter((p) => p.id !== id))
    setCurrentId((cur) => (cur === id ? pickNextPhoto(rest.length ? rest : samples, id) : cur))
  }, [samples])

  /** Import picked files one at a time (keeps memory low on iPad/iPhone). */
  const addFiles = useCallback(async (files: File[]): Promise<ImportSummary> => {
    const summary: ImportSummary = { added: 0, raw: [], failed: [] }
    if (!files.length) return summary
    const firstImport = (userPhotos ?? []).length === 0
    if (firstImport) void requestPersistentStorage()
    setProgress({ done: 0, total: files.length })
    let firstNewId: string | null = null
    for (let i = 0; i < files.length; i++) {
      const result = await importPhotoFile(files[i])
      if (result.ok) {
        try {
          await photoStore.add(result.meta, result.files)
          summary.added++
          firstNewId ??= result.meta.id
          setUserPhotos((list) => [...(list ?? []), result.meta])
        } catch {
          summary.failed.push(files[i].name)
        }
      } else if (result.reason === 'raw') {
        summary.raw.push(result.fileName)
      } else {
        summary.failed.push(result.fileName)
      }
      setProgress({ done: i + 1, total: files.length })
    }
    setProgress(null)
    // Show the first new photo right away.
    if (firstNewId) show(firstNewId, !firstImport)
    if (firstImport) history.current = []
    return summary
  }, [userPhotos, show])

  return {
    loaded: userPhotos !== null,
    photos,
    usingSamples,
    current,
    progress,
    show,
    next,
    previous,
    toggleFavorite,
    setHidden,
    remove,
    addFiles,
  }
}

export type PhotoLibrary = ReturnType<typeof usePhotoLibrary>
