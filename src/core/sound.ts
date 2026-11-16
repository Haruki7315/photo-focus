/**
 * Sound rules: when music and ambient sound should play, which track is next,
 * and when the end sound rings. Pure TypeScript; the actual audio lives in platform/.
 */
import type { ClockMode } from './clock'
import type { Phase, TimerEvent } from './timer'

export type AmbientKind = 'none' | 'rain' | 'ocean' | 'brown'
export type PlayWhen = 'focus' | 'both' | 'manual'
export type EndSound = 'shutter' | 'bell' | 'chime' | 'none'

export interface SoundSettings {
  ambient: AmbientKind
  /** 0 to 100 */
  ambientVolume: number
  /** 0 to 100 */
  musicVolume: number
  shuffle: boolean
  playWhen: PlayWhen
  endSound: EndSound
}

export const DEFAULT_SOUND: SoundSettings = {
  ambient: 'none',
  ambientVolume: 40,
  musicVolume: 60,
  shuffle: false,
  playWhen: 'focus',
  endSound: 'shutter',
}

/** Info about one music file the user added (the audio itself is stored separately). */
export interface TrackMeta {
  id: string
  name: string
  addedAt: number
}

/**
 * Should music and ambient sound be playing right now?
 * "Play now" (preview) always plays. Otherwise sound plays only while the
 * focus timer runs: during focus, and also during breaks if chosen.
 */
export function shouldPlaySound(s: { playWhen: PlayWhen; mode: ClockMode; running: boolean; phase: Phase; preview: boolean }): boolean {
  if (s.preview) return true
  if (s.playWhen === 'manual' || s.mode !== 'focus' || !s.running) return false
  return s.phase === 'focus' || s.playWhen === 'both'
}

/** The end sound rings when a focus session or a break finishes (not when skipped). */
export function ringsEndSound(event: TimerEvent): boolean {
  return event.type === 'focusCompleted' || event.type === 'breakCompleted'
}

/** Next track: the following one, or a random different one when shuffling. */
export function nextTrackIndex(current: number, count: number, shuffle: boolean, random: () => number = Math.random): number {
  if (count <= 0) return -1
  if (count === 1) return 0
  if (!shuffle) return (current + 1) % count
  const pick = Math.floor(random() * (count - 1))
  // Skip over the current track so we never repeat it.
  return pick >= current ? pick + 1 : pick
}

/** Ambient sound is generated noise; 100% on the slider is kept gentle (half of full scale). */
export function ambientGain(volume: number): number {
  return (Math.max(0, Math.min(100, volume)) / 100) * 0.5
}

export function musicGain(volume: number): number {
  return Math.max(0, Math.min(100, volume)) / 100
}

/** "My Song.mp3" -> "My Song" */
export function trackName(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, '')
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback
}

export function normalizeSound(saved: Partial<SoundSettings> | null | undefined): SoundSettings {
  const s = { ...DEFAULT_SOUND, ...(saved ?? {}) }
  return {
    ambient: (['none', 'rain', 'ocean', 'brown'] as const).includes(s.ambient) ? s.ambient : 'none',
    ambientVolume: clampInt(s.ambientVolume, 0, 100, DEFAULT_SOUND.ambientVolume),
    musicVolume: clampInt(s.musicVolume, 0, 100, DEFAULT_SOUND.musicVolume),
    shuffle: s.shuffle === true,
    playWhen: s.playWhen === 'both' || s.playWhen === 'manual' ? s.playWhen : 'focus',
    endSound: (['shutter', 'bell', 'chime', 'none'] as const).includes(s.endSound) ? s.endSound : 'shutter',
  }
}
