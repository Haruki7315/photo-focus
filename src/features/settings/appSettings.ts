import { normalizeClock, type ClockSettings } from '../../core/clock'
import { normalizeSound, type SoundSettings } from '../../core/sound'
import { normalizeLook, type LookSettings } from '../../core/look'
import { normalizePhotoChange, type PhotoChangeSettings } from '../../core/photos'
import { normalizeTimerSettings, type TimerSettings } from '../../core/timer'
import { settingsStore } from '../../platform/indexedDbStores'

/** All saved settings, loaded once at launch. */
export interface AppSettings {
  look: LookSettings
  timer: TimerSettings
  clock: ClockSettings
  sound: SoundSettings
  photoChange: PhotoChangeSettings
  welcomeDone: boolean
}

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const [look, timer, clock, sound, photoChange, welcomeDone] = await Promise.all([
      settingsStore.get<Partial<LookSettings>>('look'),
      settingsStore.get<Partial<TimerSettings>>('timer'),
      settingsStore.get<Partial<ClockSettings>>('clock'),
      settingsStore.get<Partial<SoundSettings>>('sound'),
      settingsStore.get<Partial<PhotoChangeSettings>>('photoChange'),
      settingsStore.get<boolean>('welcomeDone'),
    ])
    return {
      look: normalizeLook(look),
      timer: normalizeTimerSettings(timer),
      clock: normalizeClock(clock),
      sound: normalizeSound(sound),
      photoChange: normalizePhotoChange(photoChange),
      welcomeDone: welcomeDone === true,
    }
  } catch {
    // Storage blocked (e.g. some private modes): run with defaults.
    return { look: normalizeLook(null), timer: normalizeTimerSettings(null), clock: normalizeClock(null), sound: normalizeSound(null), photoChange: normalizePhotoChange(null), welcomeDone: false }
  }
}

export function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  settingsStore.set(key, value).catch(() => {})
}
