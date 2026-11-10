import type { PhotoMeta } from '../core/photos'

/** The image files we keep for each photo. Originals are never stored or changed. */
export interface PhotoFiles {
  display: Blob
  thumb: Blob
}

export interface PhotoStore {
  list(): Promise<PhotoMeta[]>
  getFiles(id: string): Promise<PhotoFiles | undefined>
  add(meta: PhotoMeta, files: PhotoFiles): Promise<void>
  update(meta: PhotoMeta): Promise<void>
  remove(id: string): Promise<void>
}

export interface SettingsStore {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
}

/** Result of preparing one picked file for the library. */
export type ImportResult =
  | { ok: true; meta: PhotoMeta; files: PhotoFiles }
  | { ok: false; fileName: string; reason: 'raw' | 'unsupported' }

export interface StorageInfo {
  usedBytes: number | null
  quotaBytes: number | null
  persisted: boolean | null
}
