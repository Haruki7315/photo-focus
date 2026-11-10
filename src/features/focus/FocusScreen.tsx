import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDuration } from '../../core/format'
import { normalizeLook, type LookSettings } from '../../core/look'
import { changesPhotoOn, normalizePhotoChange, type PhotoChangeSettings } from '../../core/photos'
import type { Phase, TimerEvent, TimerSettings } from '../../core/timer'
import { Icon } from '../../ui/Icon'
import { AddPhotosButton, describeImport } from '../photos/AddPhotosButton'
import { PhotoLayer } from '../photos/PhotoLayer'
import { usePhotoLibrary } from '../photos/usePhotoLibrary'
import { saveSetting, type AppSettings } from '../settings/appSettings'
import { LookPanel } from '../settings/LookPanel'
import { PhotosPanel } from '../settings/PhotosPanel'
import { SettingsSheet } from '../settings/SettingsSheet'
import { TimerPanel } from '../settings/TimerPanel'
import { useTimer } from '../timer/useTimer'

const CONTROLS_HIDE_MS = 4000
const PHASE_LABEL: Record<Phase, string> = { focus: 'Focus', break: 'Break', longBreak: 'Long break' }

/** The main screen: full-screen photo, timer, and a control bar that appears on tap. */
export function FocusScreen({ initial }: { initial: AppSettings }) {
  const library = usePhotoLibrary()
  const [look, setLookState] = useState<LookSettings>(initial.look)
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
  const onTimerEvent = useCallback(
    (e: TimerEvent) => {
      if (changesPhotoOn(photoChangeRef.current.mode, e)) next()
    },
    [next],
  )
  const timer = useTimer(initial.timer, onTimerEvent)
  const { view } = timer

  // Each change is merged into the latest settings, then saved.
  const setLook = (patch: Partial<LookSettings>) => setLookState((prev) => normalizeLook({ ...prev, ...patch }))
  const setPhotoChange = (patch: Partial<PhotoChangeSettings>) =>
    setPhotoChangeState((prev) => normalizePhotoChange({ ...prev, ...patch }))
  const setTimerSettings = (patch: Partial<TimerSettings>) => saveSetting('timer', timer.setSettings(patch))
  useEffect(() => saveSetting('look', look), [look])
  useEffect(() => saveSetting('photoChange', photoChange), [photoChange])
  const finishWelcome = () => {
    setWelcomeDone(true)
    saveSetting('welcomeDone', true)
  }

  // "Every few min": count timer time while running, then change the photo.
  const sinceChange = useRef(0)
  const lastNow = useRef(timer.now)
  const currentId = library.current?.id
  useEffect(() => {
    sinceChange.current = 0
  }, [currentId])
  useEffect(() => {
    const dt = timer.now - lastNow.current
    lastNow.current = timer.now
    if (!view.running || photoChange.mode !== 'every') return
    sinceChange.current += dt * timer.settings.speed
    if (sinceChange.current >= photoChange.everyMinutes * 60_000) {
      sinceChange.current = 0
      next()
    }
  }, [timer.now, view.running, photoChange, timer.settings.speed, next])

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
      <PhotoLayer photo={current} look={look} />

      <div className="timer-overlay" aria-live="off">
        <div className="t-sub">
          {PHASE_LABEL[view.phase]}
          {view.completedSessions > 0 && ` · ${view.completedSessions} done`}
        </div>
        <div className="t-time">{formatDuration(Math.ceil(view.remainingMs / 1000))}</div>
        <div className="t-bar"><i style={{ width: `${view.progress * 100}%` }} /></div>
      </div>

      {message && !settingsOpen && <div className="toast" aria-live="polite">{message}</div>}

      <nav className={`controls${controls && !settingsOpen ? ' on' : ''}`} aria-label="Controls" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ctl primary" onClick={act(timer.toggle)} aria-label={view.running ? 'Pause' : 'Start'}>
          <Icon name={view.running ? 'pause' : 'play'} />
          <span>{view.running ? 'Pause' : 'Start'}</span>
        </button>
        <button type="button" className="ctl" onClick={act(timer.skip)} aria-label={view.phase === 'focus' ? 'Skip to break' : 'Skip to focus'}>
          <Icon name="skip" />
          <span>Skip</span>
        </button>
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
            ) : tab === 'look' ? (
              <LookPanel look={look} onChange={setLook} />
            ) : (
              <TimerPanel settings={timer.settings} onChange={setTimerSettings} />
            )
          }
        />
      )}
    </div>
  )
}
