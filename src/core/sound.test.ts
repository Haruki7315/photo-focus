import { describe, expect, it } from 'vitest'
import { DEFAULT_SOUND, ambientGain, nextTrackIndex, normalizeSound, ringsEndSound, shouldPlaySound, trackName } from './sound'

const base = { playWhen: 'focus' as const, mode: 'focus' as const, running: true, phase: 'focus' as const, preview: false }

describe('shouldPlaySound', () => {
  it('plays during running focus', () => {
    expect(shouldPlaySound(base)).toBe(true)
    expect(shouldPlaySound({ ...base, running: false })).toBe(false)
  })

  it('"Focus only" stops for breaks; "Focus and breaks" keeps going', () => {
    expect(shouldPlaySound({ ...base, phase: 'break' })).toBe(false)
    expect(shouldPlaySound({ ...base, phase: 'longBreak', playWhen: 'both' })).toBe(true)
  })

  it('manual and clock mode only play with "Play now"', () => {
    expect(shouldPlaySound({ ...base, playWhen: 'manual' })).toBe(false)
    expect(shouldPlaySound({ ...base, mode: 'clock' })).toBe(false)
    expect(shouldPlaySound({ ...base, playWhen: 'manual', running: false, preview: true })).toBe(true)
  })
})

describe('ringsEndSound', () => {
  it('rings when a phase finishes, not when skipped', () => {
    expect(ringsEndSound({ type: 'focusCompleted', at: 0, minutes: 25 })).toBe(true)
    expect(ringsEndSound({ type: 'breakCompleted', at: 0, phase: 'break' })).toBe(true)
    expect(ringsEndSound({ type: 'skipped', at: 0, from: 'focus' })).toBe(false)
  })
})

describe('nextTrackIndex', () => {
  it('goes in order and wraps around', () => {
    expect(nextTrackIndex(0, 3, false)).toBe(1)
    expect(nextTrackIndex(2, 3, false)).toBe(0)
    expect(nextTrackIndex(0, 0, false)).toBe(-1)
    expect(nextTrackIndex(0, 1, true)).toBe(0)
  })

  it('shuffle never repeats the current track', () => {
    for (const r of [0, 0.2, 0.5, 0.99]) {
      const n = nextTrackIndex(1, 3, true, () => r)
      expect(n).not.toBe(1)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(3)
    }
  })
})

describe('helpers', () => {
  it('keeps ambient gentle', () => {
    expect(ambientGain(100)).toBe(0.5)
    expect(ambientGain(40)).toBe(0.2)
    expect(ambientGain(-5)).toBe(0)
  })

  it('names tracks from files', () => {
    expect(trackName('Lofi Morning.mp3')).toBe('Lofi Morning')
    expect(trackName('a.b.m4a')).toBe('a.b')
  })

  it('repairs saved settings', () => {
    expect(normalizeSound(null)).toEqual(DEFAULT_SOUND)
    expect(normalizeSound({ ambient: 'wind' as never, musicVolume: 300, playWhen: 'both' })).toEqual({ ...DEFAULT_SOUND, musicVolume: 100, playWhen: 'both' })
  })
})
