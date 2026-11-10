import { describe, expect, it } from 'vitest'
import {
  canHide,
  changesPhotoOn,
  formatBytes,
  formatExifLine,
  formatShutter,
  isRawFileName,
  pickNextPhoto,
  scaleToFit,
  titleFromFileName,
  type PhotoMeta,
} from './photos'

function photo(id: string, extra: Partial<PhotoMeta> = {}): PhotoMeta {
  return { id, title: id, addedAt: 0, width: 100, height: 100, favorite: false, hidden: false, exif: null, ...extra }
}

/** A fake random() that returns these values in turn. */
function seq(...values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

describe('pickNextPhoto', () => {
  it('returns null with no photos or all hidden', () => {
    expect(pickNextPhoto([], null)).toBeNull()
    expect(pickNextPhoto([photo('a', { hidden: true })], null)).toBeNull()
  })

  it('never picks the current photo when others exist', () => {
    const photos = [photo('a'), photo('b'), photo('c')]
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(pickNextPhoto(photos, 'b', () => r)).not.toBe('b')
    }
  })

  it('keeps the only visible photo', () => {
    expect(pickNextPhoto([photo('a'), photo('b', { hidden: true })], 'a')).toBe('a')
  })

  it('skips hidden photos', () => {
    const photos = [photo('a'), photo('b', { hidden: true }), photo('c')]
    for (const r of [0, 0.49, 0.5, 0.99]) {
      expect(pickNextPhoto(photos, null, () => r)).not.toBe('b')
    }
  })

  it('gives favorites 3 times the chance', () => {
    // Weights: a=1, b=3 (favorite). Total 4. a owns [0, 0.25), b owns [0.25, 1).
    const photos = [photo('a'), photo('b', { favorite: true })]
    expect(pickNextPhoto(photos, null, seq(0.2))).toBe('a')
    expect(pickNextPhoto(photos, null, seq(0.3))).toBe('b')

    // Over many evenly spread picks, b wins about 75%.
    let b = 0
    for (let i = 0; i < 1000; i++) if (pickNextPhoto(photos, null, () => i / 1000) === 'b') b++
    expect(b).toBe(750)
  })

  it('handles random() returning almost 1', () => {
    expect(pickNextPhoto([photo('a'), photo('b')], null, () => 0.9999999)).toBe('b')
  })
})

describe('canHide', () => {
  it('refuses to hide the last visible photo', () => {
    expect(canHide([photo('a')], 'a')).toBe(false)
    expect(canHide([photo('a'), photo('b', { hidden: true })], 'a')).toBe(false)
    expect(canHide([photo('a'), photo('b')], 'a')).toBe(true)
  })
})

describe('changesPhotoOn', () => {
  it('only changes at a break in "break" mode', () => {
    expect(changesPhotoOn('break', { type: 'focusCompleted' })).toBe(true)
    expect(changesPhotoOn('break', { type: 'skipped', from: 'focus' })).toBe(true)
    expect(changesPhotoOn('break', { type: 'skipped', from: 'break' })).toBe(false)
    expect(changesPhotoOn('break', { type: 'breakCompleted' })).toBe(false)
    expect(changesPhotoOn('session', { type: 'focusCompleted' })).toBe(false)
    expect(changesPhotoOn('every', { type: 'focusCompleted' })).toBe(false)
  })
})

describe('camera info', () => {
  it('formats shutter speeds', () => {
    expect(formatShutter(1 / 250)).toBe('1/250s')
    expect(formatShutter(1 / 60)).toBe('1/60s')
    expect(formatShutter(0.5)).toBe('0.5s')
    expect(formatShutter(15)).toBe('15s')
    expect(formatShutter(2.5)).toBe('2.5s')
  })

  it('builds the caption line like the prototype', () => {
    expect(
      formatExifLine({ model: 'ILCE-7M4 ', focalLength: 70.4, fNumber: 8, exposureTime: 1 / 250, iso: 100 }),
    ).toBe('ILCE-7M4 · 70mm · f/8 · 1/250s · ISO 100')
    expect(formatExifLine({ fNumber: 1.8 })).toBe('f/1.8')
  })

  it('returns null when there is no info', () => {
    expect(formatExifLine(null)).toBeNull()
    expect(formatExifLine({})).toBeNull()
  })
})

describe('files', () => {
  it('makes a title from the file name', () => {
    expect(titleFromFileName('IMG_1234.JPG')).toBe('IMG_1234')
    expect(titleFromFileName('my.trip.photo.jpeg')).toBe('my.trip.photo')
    expect(titleFromFileName('folder/pic.heic')).toBe('pic')
    expect(titleFromFileName('noext')).toBe('noext')
  })

  it('spots camera RAW files', () => {
    expect(isRawFileName('DSC01234.ARW')).toBe(true)
    expect(isRawFileName('photo.cr3')).toBe(true)
    expect(isRawFileName('a.NEF')).toBe(true)
    expect(isRawFileName('a.jpg')).toBe(false)
    expect(isRawFileName('a.heic')).toBe(false)
  })

  it('shrinks to the longest side without enlarging', () => {
    expect(scaleToFit(6000, 4000, 2732)).toEqual({ width: 2732, height: 1821 })
    expect(scaleToFit(4000, 6000, 300)).toEqual({ width: 200, height: 300 })
    expect(scaleToFit(1200, 800, 2732)).toEqual({ width: 1200, height: 800 })
  })

  it('formats storage sizes', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(12.4 * 1024 * 1024)).toBe('12 MB')
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB')
  })
})

describe('normalizePhotoChange', () => {
  it('repairs saved values', async () => {
    const { normalizePhotoChange, DEFAULT_PHOTO_CHANGE } = await import('./photos')
    expect(normalizePhotoChange(null)).toEqual(DEFAULT_PHOTO_CHANGE)
    expect(normalizePhotoChange({ mode: 'every', everyMinutes: 10 })).toEqual({ mode: 'every', everyMinutes: 10 })
    expect(normalizePhotoChange({ mode: 'nope' as never, everyMinutes: -1 })).toEqual(DEFAULT_PHOTO_CHANGE)
  })
})
