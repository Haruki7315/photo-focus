import { useCallback, useEffect, useState } from 'react'
import type { PhotoMeta } from '../../core/photos'
import type { SessionRecord } from '../../core/stats'
import { sessionStore } from '../../platform/indexedDbStores'
import { getPhotoFiles } from '../photos/photoUrls'

function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/** Completed focus sessions: load, record and clear. */
export function useStats() {
  const [records, setRecords] = useState<SessionRecord[]>([])

  useEffect(() => {
    sessionStore
      .list()
      .then(setRecords)
      .catch(() => {})
  }, [])

  /** Save a finished focus session, with a copy of the photo's thumbnail for the gallery. */
  const record = useCallback(async (input: { endedAt: number; minutes: number; task: string; photo: PhotoMeta | null; demo: boolean }) => {
    const rec: SessionRecord = {
      id: newId(),
      endedAt: input.endedAt,
      minutes: Math.round(input.minutes),
      task: input.task.trim(),
      photoId: input.photo?.id ?? null,
      photoTitle: input.photo?.title ?? '',
      demo: input.demo,
    }
    setRecords((list) => [...list, rec])
    try {
      const thumb = input.photo ? ((await getPhotoFiles(input.photo.id))?.thumb ?? null) : null
      await sessionStore.add(rec, thumb)
    } catch {
      // Storage full or blocked: the session still shows until the app closes.
    }
  }, [])

  const clear = useCallback(async () => {
    await sessionStore.clear()
    setRecords([])
  }, [])

  return { records, record, clear }
}

export type Stats = ReturnType<typeof useStats>
