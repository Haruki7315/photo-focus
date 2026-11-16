import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PhotoMeta } from '../core/photos'
import type { TrackMeta } from '../core/sound'
import type { SessionRecord } from '../core/stats'
import type { PhotoFiles } from './types'

/** Layout of the app's IndexedDB database (lives only on this device). */
interface PhotoFocusDB extends DBSchema {
  photos: { key: string; value: PhotoMeta }
  photoFiles: { key: string; value: PhotoFiles }
  settings: { key: string; value: unknown }
  tracks: { key: string; value: TrackMeta }
  trackFiles: { key: string; value: Blob }
  sessions: { key: string; value: SessionRecord }
  sessionThumbs: { key: string; value: Blob }
}

let dbPromise: Promise<IDBPDatabase<PhotoFocusDB>> | null = null

export function getDB(): Promise<IDBPDatabase<PhotoFocusDB>> {
  // Version 2 added music, version 3 added stats. `oldVersion` lets existing users keep their data.
  dbPromise ??= openDB<PhotoFocusDB>('photo-focus', 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('photos', { keyPath: 'id' })
        db.createObjectStore('photoFiles')
        db.createObjectStore('settings')
      }
      if (oldVersion < 2) {
        db.createObjectStore('tracks', { keyPath: 'id' })
        db.createObjectStore('trackFiles')
      }
      if (oldVersion < 3) {
        db.createObjectStore('sessions', { keyPath: 'id' })
        db.createObjectStore('sessionThumbs')
      }
    },
  })
  return dbPromise
}
