import exifr from 'exifr/dist/lite.esm.mjs'
import {
  DISPLAY_JPEG_QUALITY,
  DISPLAY_MAX_SIDE,
  THUMB_MAX_SIDE,
  isRawFileName,
  scaleToFit,
  titleFromFileName,
  type ExifInfo,
} from '../core/photos'
import type { ImportResult } from './types'

/** Only these camera tags are read. GPS is never read. */
const EXIF_TAGS = ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal']

async function readExif(file: Blob): Promise<ExifInfo | null> {
  try {
    const x = await exifr.parse(file, { pick: EXIF_TAGS, gps: false, xmp: false, icc: false, iptc: false, jfif: false })
    if (!x) return null
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
    const taken = x.DateTimeOriginal instanceof Date ? x.DateTimeOriginal.getTime() : undefined
    const info: ExifInfo = {
      make: str(x.Make),
      model: str(x.Model),
      lens: str(x.LensModel),
      focalLength: num(x.FocalLength),
      fNumber: num(x.FNumber),
      exposureTime: num(x.ExposureTime),
      iso: num(x.ISO),
      takenAt: Number.isFinite(taken) ? taken : undefined,
    }
    // Drop empty fields so the stored record stays small.
    const clean = Object.fromEntries(Object.entries(info).filter(([, v]) => v !== undefined)) as ExifInfo
    return Object.keys(clean).length ? clean : null
  } catch {
    return null
  }
}

type Drawable = ImageBitmap | HTMLImageElement

/** Decode a picked file. Turns the photo upright using its EXIF orientation. */
async function decode(file: Blob): Promise<{ image: Drawable; width: number; height: number; close: () => void }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { image: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
  } catch {
    // Fallback (e.g. some HEIC files on older Safari): let an <img> decode it.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      return { image: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function toJpeg(source: CanvasImageSource, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('No canvas'))
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      // Free the canvas memory right away (iOS has a low canvas memory limit).
      canvas.width = canvas.height = 0
      if (b) resolve(b)
      else reject(new Error('Could not encode JPEG'))
    }, 'image/jpeg', quality)
  })
}

function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/**
 * Turn one picked file into a display copy (longest side 2732 px, JPEG 0.85)
 * and a 300 px thumbnail, plus camera info. The original file is not changed.
 */
export async function importPhotoFile(file: File): Promise<ImportResult> {
  if (isRawFileName(file.name)) return { ok: false, fileName: file.name, reason: 'raw' }

  let decoded
  try {
    decoded = await decode(file)
  } catch {
    return { ok: false, fileName: file.name, reason: 'unsupported' }
  }

  try {
    const exif = await readExif(file)
    const size = scaleToFit(decoded.width, decoded.height, DISPLAY_MAX_SIDE)
    const display = await toJpeg(decoded.image, size.width, size.height, DISPLAY_JPEG_QUALITY)
    const t = scaleToFit(size.width, size.height, THUMB_MAX_SIDE)
    const thumb = await toJpeg(decoded.image, t.width, t.height, 0.8)
    return {
      ok: true,
      meta: {
        id: newId(),
        title: titleFromFileName(file.name),
        addedAt: Date.now(),
        width: size.width,
        height: size.height,
        favorite: false,
        hidden: false,
        exif,
      },
      files: { display, thumb },
    }
  } catch {
    return { ok: false, fileName: file.name, reason: 'unsupported' }
  } finally {
    decoded.close()
  }
}

/** File types offered in the picker. RAW is included only so we can explain why it's not supported. */
export const PHOTO_ACCEPT = 'image/*,.heic,.heif,.arw,.cr2,.cr3,.nef,.dng,.raf,.orf,.rw2'
