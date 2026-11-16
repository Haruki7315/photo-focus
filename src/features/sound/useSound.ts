import { useCallback, useEffect, useRef, useState } from 'react'
import { nextTrackIndex, ringsEndSound, shouldPlaySound, trackName, type SoundSettings, type TrackMeta } from '../../core/sound'
import type { ClockMode } from '../../core/clock'
import type { Phase, TimerEvent } from '../../core/timer'
import { audioEngine } from '../../platform/audio'
import { trackStore } from '../../platform/indexedDbStores'

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|aif|aiff|caf|ogg|oga|opus|flac|webm)$/i

function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/**
 * Music + ambient sound + end sounds, following the timer.
 * Call `unlock()` inside any tap that may start sound (Start, Play now, Test).
 */
export function useSound(settings: SoundSettings, timer: { mode: ClockMode; running: boolean; phase: Phase }) {
  const [tracks, setTracks] = useState<TrackMeta[]>([])
  const [current, setCurrent] = useState(0)
  const [preview, setPreview] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const loadedId = useRef<string | null>(null)
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Load the saved track list once, and get the first track ready.
  useEffect(() => {
    trackStore
      .list()
      .then(setTracks)
      .catch(() => {})
  }, [])

  const track = tracks[current] ?? tracks[0] ?? null

  // Keep the selected track loaded in the player.
  useEffect(() => {
    if (!track) {
      if (loadedId.current) audioEngine.clearTrack()
      loadedId.current = null
      return
    }
    if (loadedId.current === track.id) return
    let cancelled = false
    trackStore.getFile(track.id).then((file) => {
      if (cancelled || !file) return
      const wasPlaying = audioEngine.isMusicPlaying()
      audioEngine.loadTrack(file)
      loadedId.current = track.id
      if (wasPlaying) void audioEngine.playMusic(settingsRef.current.musicVolume)
    })
    return () => {
      cancelled = true
    }
  }, [track])

  const want = shouldPlaySound({ playWhen: settings.playWhen, mode: timer.mode, running: timer.running, phase: timer.phase, preview })

  // Start or stop sound when the timer or settings change.
  useEffect(() => {
    audioEngine.setAmbient(settings.ambient, settings.ambientVolume, want)
    if (want) {
      audioEngine.playMusic(settings.musicVolume).then((ok) => setBlocked(!ok && audioEngine.hasTrack()))
    } else {
      audioEngine.pauseMusic()
    }
  }, [want, settings.ambient, settings.ambientVolume, settings.musicVolume, track?.id])

  useEffect(() => {
    audioEngine.setMusicVolume(settings.musicVolume)
  }, [settings.musicVolume])

  const next = useCallback(() => {
    setCurrent((i) => nextTrackIndex(i, tracks.length, settingsRef.current.shuffle))
  }, [tracks.length])

  useEffect(() => {
    audioEngine.onTrackEnd = next
    return () => {
      audioEngine.onTrackEnd = null
    }
  }, [next])

  /** Ring the end sound when a session or break finishes. */
  const onTimerEvent = useCallback((e: TimerEvent) => {
    if (ringsEndSound(e)) audioEngine.playEnd(settingsRef.current.endSound)
  }, [])

  const addFiles = useCallback(async (files: File[]): Promise<{ added: number; skipped: string[] }> => {
    let added = 0
    const skipped: string[] = []
    for (const f of files) {
      if (!f.type.startsWith('audio/') && !AUDIO_EXT.test(f.name)) {
        skipped.push(f.name)
        continue
      }
      const meta: TrackMeta = { id: newId(), name: trackName(f.name), addedAt: Date.now() }
      try {
        await trackStore.add(meta, f)
        added++
        setTracks((list) => [...list, meta])
      } catch {
        skipped.push(f.name)
      }
    }
    return { added, skipped }
  }, [])

  const removeTrack = useCallback(
    async (id: string) => {
      await trackStore.remove(id)
      const idx = tracks.findIndex((t) => t.id === id)
      setTracks((list) => list.filter((t) => t.id !== id))
      if (idx >= 0 && idx < current) setCurrent((c) => c - 1)
      else if (idx === current) setCurrent((c) => (c >= tracks.length - 1 ? 0 : c))
    },
    [tracks, current],
  )

  return {
    tracks,
    currentId: track?.id ?? null,
    playing: want,
    preview,
    blocked,
    unlock: () => audioEngine.unlock(),
    togglePreview: () => {
      audioEngine.unlock()
      setPreview((p) => !p)
    },
    selectTrack: (id: string) => {
      audioEngine.unlock()
      const i = tracks.findIndex((t) => t.id === id)
      if (i >= 0) setCurrent(i)
    },
    next: () => {
      audioEngine.unlock()
      next()
    },
    testEndSound: () => {
      audioEngine.unlock()
      audioEngine.playEnd(settingsRef.current.endSound)
    },
    onTimerEvent,
    addFiles,
    removeTrack,
  }
}

export type SoundControls = ReturnType<typeof useSound>
