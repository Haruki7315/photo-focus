import { describe, expect, it } from 'vitest'
import { DEFAULT_LOOK, backgroundName, captionNeedsDarkText, luminance, normalizeLook } from './look'

describe('look', () => {
  it('measures brightness', () => {
    expect(luminance('#000000')).toBe(0)
    expect(luminance('#ffffff')).toBeCloseTo(1)
    expect(luminance('#f6f5f2')).toBeGreaterThan(0.5)
    expect(luminance('#26344d')).toBeLessThan(0.1)
    expect(luminance('nope')).toBe(0)
  })

  it('names backgrounds', () => {
    expect(backgroundName('blur')).toBe('Blurred photo')
    expect(backgroundName('#26344D')).toBe('Navy')
    expect(backgroundName('#7a4b3a')).toBe('Custom #7a4b3a')
  })

  it('uses dark caption text only on a wide light mat', () => {
    expect(captionNeedsDarkText({ ...DEFAULT_LOOK, background: '#f6f5f2', mat: 6 })).toBe(true)
    expect(captionNeedsDarkText({ ...DEFAULT_LOOK, background: '#f6f5f2', mat: 2 })).toBe(false)
    expect(captionNeedsDarkText({ ...DEFAULT_LOOK, background: '#000000', mat: 6 })).toBe(false)
    expect(captionNeedsDarkText({ ...DEFAULT_LOOK, background: 'blur', mat: 6 })).toBe(false)
  })

  it('repairs saved settings', () => {
    expect(normalizeLook(null)).toEqual(DEFAULT_LOOK)
    expect(normalizeLook({ fit: 'cover', mat: 99, background: 'red' })).toEqual({ ...DEFAULT_LOOK, fit: 'cover', mat: 14 })
    expect(normalizeLook({ mat: -3, night: true })).toEqual({ ...DEFAULT_LOOK, mat: 0, night: true })
  })
})
