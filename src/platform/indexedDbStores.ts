import type { PhotoMeta } from '../core/photos'
import { getDB } from './db'
import type { PhotoFiles, PhotoStore, SettingsStore, TrackStore } from './types'

export const photoStore: PhotoStore = {
  async list() {
    const all = await (await getDB()).getAll('photos')
    return all.sort((a, b) => a.addedAt - b.addedAt)
  },
  async getFiles(id) {
    return (await getDB()).get('photoFiles', id)
  },
  async add(meta: PhotoMeta, files: PhotoFiles) {
    const db = await getDB()
    // Save both in one transaction so we never keep a photo without its image.
    const tx = db.transaction(['photos', 'photoFiles'], 'readwrite')
    await Promise.all([tx.objectStore('photos').put(meta), tx.objectStore('photoFiles').put(files, meta.id), tx.done])
  },
  async update(meta) {
    await (await getDB()).put('photos', meta)
  },
  async remove(id) {
    const db = await getDB()
    const tx = db.transaction(['photos', 'photoFiles'], 'readwrite')
    await Promise.all([tx.objectStore('photos').delete(id), tx.objectStore('photoFiles').delete(id), tx.done])
  },
}

export const settingsStore: SettingsStore = {
  async get<T>(key: string) {
    return (await (await getDB()).get('settings', key)) as T | undefined
  },
  async set<T>(key: string, value: T) {
    await (await getDB()).put('settings', value, key)
  },
}

export const trackStore: TrackStore = {
  async list() {
    const all = await (await getDB()).getAll('tracks')
    return all.sort((a, b) => a.addedAt - b.addedAt)
  },
  async getFile(id) {
    return (await getDB()).get('trackFiles', id)
  },
  async add(meta, file) {
    const db = await getDB()
    const tx = db.transaction(['tracks', 'trackFiles'], 'readwrite')
    await Promise.all([tx.objectStore('tracks').put(meta), tx.objectStore('trackFiles').put(file, meta.id), tx.done])
  },
  async remove(id) {
    const db = await getDB()
    const tx = db.transaction(['tracks', 'trackFiles'], 'readwrite')
    await Promise.all([tx.objectStore('tracks').delete(id), tx.objectStore('trackFiles').delete(id), tx.done])
  },
}
