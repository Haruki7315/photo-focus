import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PhotoMeta } from '../core/photos'
import type { PhotoFiles } from './types'

/** Layout of the app's IndexedDB database (lives only on this device). */
interface PhotoFocusDB extends DBSchema {
  photos: { key: string; value: PhotoMeta }
  photoFiles: { key: string; value: PhotoFiles }
  settings: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<PhotoFocusDB>> | null = null

export function getDB(): Promise<IDBPDatabase<PhotoFocusDB>> {
  dbPromise ??= openDB<PhotoFocusDB>('photo-focus', 1, {
    upgrade(db) {
      db.createObjectStore('photos', { keyPath: 'id' })
      db.createObjectStore('photoFiles')
      db.createObjectStore('settings')
    },
  })
  return dbPromise
}
