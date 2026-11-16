import { useCallback, useEffect, useRef, useState } from 'react'
import { captionAtTop, normalizeClock, type ClockSettings } from '../../core/clock'
import { normalizeLook, type LookSettings } from '../../core/look'
import { developGrayscale, tileProgress, type RevealInput } from '../../core/reveal'
import { changesPhotoOn, normalizePhotoChange, type PhotoChangeSettings, type PhotoMeta } from '../../core/photos'
import type { TimerEvent, TimerSettings } from '../../core/timer'
import { Icon } from '../../ui/Icon'
import { AddPhotosButton, describeImport } from '../photos/AddPhotosButton'
import { PhotoLayer } from '../photos/PhotoLayer'
import { usePhotoLibrary } from '../photos/usePhotoLibrary'
import { saveSetting, type AppSettings } from '../settings/appSettings'
import { LookPanel } from '../settings/LookPanel'
import { PhotosPanel } from '../settings/PhotosPanel'
import { SettingsSheet } from '../settings/SettingsSheet'
import { ClockOverlay } from '../clock/ClockOverlay'
import { ClockPanel } from '../settings/ClockPanel'
import { useTimer } from '../timer/useTimer'
import { normalizeSound, type SoundSettings } from '../../core/sound'
import { SoundPanel } from '../settings/SoundPanel'
import { useSound } from '../sound/useSound'
import { StatsPanel } from '../settings/StatsPanel'
import { useStats } from '../stats/useStats'

const CONTROLS_HIDE_MS = 4000

/** The main screen: full-screen photo, timer, and a control bar that appears on tap. */
export function FocusScreen({ initial }: { initial: AppSettings }) {
  const library = usePhotoLibrary()
  const [look, setLookState] = useState<LookSettings>(initial.look)
  const [clock, setClockState] = useState<ClockSettings>(initial.clock)
  const [soundSettings, setSoundState] = useState<SoundSettings>(initial.sound)
  const [photoChange, setPhotoChangeState] = useState<PhotoChangeSettings>(initial.photoChange)
  const [welcomeDone, setWelcomeDone] = useState(initial.welcomeDone)
  const [controls, setControls] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const photoChangeRef = useRef(photoChange)
  useEffect(() => {
    photoChangeRef.current = photoChange
  }, [photoChange])

  const { next } = library
  // Sound reacts to timer events too, but is set up after the timer, so we reach it through a ref.
  const soundEventRef = useRef<((e: TimerEvent) => void) | null>(null)
  const stats = useStats()
  // Latest photo/task/speed for saving a session, read when the timer event arrives.
  const sessionInfoRef = useRef<{ photo: PhotoMeta | null; task: string; demo: boolean }>({ photo: null, task: '', demo: false })
  const { record } = stats
  const onTimerEvent = useCallback(
    (e: TimerEvent) => {
      // Save the finished session first, while the photo you looked at is still the current one.
      if (e.type === 'focusCompleted') {
        const info = sessionInfoRef.current
        void record({ endedAt: e.at, minutes: e.minutes, task: info.task, photo: info.photo, demo: info.demo })
      }
      if (changesPhotoOn(photoChangeRef.current.mode, e)) next()
      soundEventRef.current?.(e)
    },
    [next, record],
  )
  const timer = useTimer(initial.timer, onTimerEvent)
  const { view } = timer
  const currentPhoto = library.current
  useEffect(() => {
    sessionInfoRef.current = { photo: currentPhoto, task: clock.task, demo: timer.settings.speed > 1 }
  }, [currentPhoto, clock.task, timer.settings.speed])
  const sound = useSound(soundSettings, { mode: clock.mode, running: view.running, phase: view.phase })
  useEffect(() => {
    soundEventRef.current = sound.onTimerEvent
  }, [sound.onTimerEvent])

  // Each change is merged into the latest settings, then saved.
  const setLook = (patch: Partial<LookSettings>) => setLookState((prev) => normalizeLook({ ...prev, ...patch }))
  const setPhotoChange = (patch: Partial<PhotoChangeSettings>) =>
    setPhotoChangeState((prev) => normalizePhotoChange({ ...prev, ...patch }))
  const setTimerSettings = (patch: Partial<TimerSettings>) => saveSetting('timer', timer.setSettings(patch))
  const setClock = (patch: Partial<ClockSettings>) => setClockState((prev) => normalizeClock({ ...prev, ...patch }))
  useEffect(() => saveSetting('look', look), [look])
  useEffect(() => saveSetting('clock', clock), [clock])
  const setSound = (patch: Partial<SoundSettings>) => setSoundState((prev) => normalizeSound({ ...prev, ...patch }))
  useEffect(() => saveSetting('sound', soundSettings), [soundSettings])
  useEffect(() => saveSetting('photoChange', photoChange), [photoChange])
  const finishWelcome = () => {
    setWelcomeDone(true)
    saveSetting('welcomeDone', true)
  }

  // "Every few min": count time (timer time while running, or real time in Clock mode), then change the photo.
  const sinceChange = useRef(0)
  const lastNow = useRef(timer.now)
  const currentId = library.current?.id
  useEffect(() => {
    sinceChange.current = 0
  }, [currentId])
  useEffect(() => {
    const dt = timer.now - lastNow.current
    lastNow.current = timer.now
    const clockMode = clock.mode === 'clock'
    if ((!view.running && !clockMode) || photoChange.mode !== 'every') return
    sinceChange.current += clockMode ? dt : dt * timer.settings.speed
    if (sinceChange.current >= photoChange.everyMinutes * 60_000) {
      sinceChange.current = 0
      next()
    }
  }, [timer.now, view.running, photoChange, timer.settings.speed, next, clock.mode])

  // Control bar: show on tap, hide again after 4 seconds without touches.
  const hideTimer = useRef(0)
  const poke = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setControls(false), CONTROLS_HIDE_MS)
  }, [])
  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  // Short status messages fade after a few seconds.
  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(() => setMessage(null), 6000)
    return () => window.clearTimeout(t)
  }, [message])

  const current = library.current

  // Photo reveal: puzzle pieces or develop, driven by the timer (or the hour in Clock mode).
  const nowDate = new Date(timer.now)
  const revealInput: RevealInput = {
    clock: clock.mode === 'clock',
    hourFrac: (nowDate.getMinutes() * 60 + nowDate.getSeconds() + nowDate.getMilliseconds() / 1000) / 3600,
    phase: view.phase,
    frac: view.progress,
    totalMinutes: view.totalMs / 60_000,
    focusMinutes: timer.settings.focusMinutes,
  }
  const tiles =
    look.reveal === 'tiles' && look.showPhoto
      ? { ...tileProgress(revealInput), order: look.revealOrder, cover: look.revealCover }
      : null
  const grayscale = look.reveal === 'develop' ? developGrayscale(revealInput) : 0
  const showWelcome = library.loaded && library.usingSamples && !welcomeDone

  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
    poke()
  }

  return (
    <div
      className="focus"
      onClick={() => {
        if (showWelcome) return
        setControls((c) => !c)
        poke()
      }}
    >
      <PhotoLayer photo={current} look={look} captionTop={captionAtTop(clock.position)} tiles={tiles} grayscale={grayscale} />

      <ClockOverlay settings={clock} timer={view} now={timer.now} night={look.night} demo={timer.settings.speed > 1} />

      {message && !settingsOpen && <div className="toast" aria-live="polite">{message}</div>}

      <nav className={`controls${controls && !settingsOpen ? ' on' : ''}`} aria-label="Controls" onClick={(e) => e.stopPropagation()}>
        {clock.mode === 'focus' && (
          <>
        <button type="button" className="ctl primary" onClick={act(() => {
            sound.unlock()
            timer.toggle()
          })} aria-label={view.running ? 'Pause' : 'Start'}>
          <Icon name={view.running ? 'pause' : 'play'} />
          <span>{view.running ? 'Pause' : 'Start'}</span>
        </button>
        <button type="button" className="ctl" onClick={act(timer.skip)} aria-label={view.phase === 'focus' ? 'Skip to break' : 'Skip to focus'}>
          <Icon name="skip" />
          <span>Skip</span>
        </button>
          </>
        )}
        <button type="button" className="ctl" onClick={act(library.next)} aria-label="Next photo">
          <Icon name="next" />
          <span>Next</span>
        </button>
        <button
          type="button"
          className={`ctl${current?.favorite ? ' fav' : ''}`}
          aria-pressed={current?.favorite ?? false}
          onClick={act(() => current && library.toggleFavorite(current.id))}
          aria-label="Favorite"
        >
          <Icon name="heart" filled={current?.favorite} />
          <span>Favorite</span>
        </button>
        <button
          type="button"
          className="ctl"
          onClick={act(() => {
            if (!current) return
            setMessage(library.setHidden(current.id, true) ? 'Photo hidden. Bring it back in Settings → Photos.' : 'This is the only photo left, so it stays.')
          })}
          aria-label="Hide photo"
        >
          <Icon name="hide" />
          <span>Hide</span>
        </button>
        <button type="button" className="ctl" onClick={act(() => setSettingsOpen(true))} aria-label="Settings">
          <Icon name="settings" />
          <span>Settings</span>
        </button>
      </nav>

      {showWelcome && (
        <div className="welcome" role="dialog" aria-label="Welcome" onClick={(e) => e.stopPropagation()}>
          <h1>Add your photos to start</h1>
          <p>Pick photos from your library, Files, iCloud Drive or an SSD. They stay on this device.</p>
          <AddPhotosButton
            library={library}
            className="btn primary big"
            label="Add photos"
            onDone={(s) => {
              if (s.added) finishWelcome()
              setMessage(describeImport(s))
            }}
          />
          <button type="button" className="linkish" onClick={finishWelcome}>
            Try it with sample photos
          </button>
        </div>
      )}

      {settingsOpen && (
        <SettingsSheet
          message={message}
          onClose={() => setSettingsOpen(false)}
          render={(tab) =>
            tab === 'photos' ? (
              <PhotosPanel library={library} photoChange={photoChange} onPhotoChange={setPhotoChange} onMessage={setMessage} />
            ) : tab === 'stats' ? (
              <StatsPanel stats={stats} onMessage={setMessage} />
            ) : tab === 'sound' ? (
              <SoundPanel settings={soundSettings} onChange={setSound} sound={sound} onMessage={setMessage} />
            ) : tab === 'look' ? (
              <LookPanel look={look} onChange={setLook} />
            ) : (
              <ClockPanel clock={clock} onClock={setClock} timer={timer.settings} onTimer={setTimerSettings} />
            )
          }
        />
      )}
    </div>
  )
}
