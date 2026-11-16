import { useRef, useState } from 'react'
import type { SoundSettings } from '../../core/sound'
import { Check, Group, Row } from '../../ui/Row'
import { Segmented } from '../../ui/Segmented'
import type { SoundControls } from '../sound/useSound'

export function SoundPanel(props: {
  settings: SoundSettings
  onChange: (patch: Partial<SoundSettings>) => void
  sound: SoundControls
  onMessage: (text: string) => void
}) {
  const { settings: s, onChange, sound } = props
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  return (
    <>
      <Group title="Background music">
        {sound.tracks.length === 0 ? (
          <p className="note">No music yet. Add your own music files below.</p>
        ) : (
          <ul className="tracks">
            {sound.tracks.map((t) => (
              <li key={t.id}>
                <button type="button" className="track" aria-current={t.id === sound.currentId} onClick={() => sound.selectTrack(t.id)}>
                  {t.id === sound.currentId ? '▶  ' : ''}
                  {t.name}
                </button>
                <button type="button" className="track-x" aria-label={`Remove ${t.name}`} onClick={() => void sound.removeTrack(t.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn primary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Adding…' : '+ Add music files (MP3, M4A, WAV)'}
        </button>
        <input
          ref={input}
          type="file"
          accept="audio/*,.mp3,.m4a,.aac,.wav,.aif,.aiff,.flac"
          multiple
          hidden
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (!files.length) return
            setBusy(true)
            const r = await sound.addFiles(files)
            setBusy(false)
            props.onMessage(
              (r.added ? `Added ${r.added} track${r.added > 1 ? 's' : ''}. Press Start or Play now to hear it.` : '') +
                (r.skipped.length ? ` Skipped ${r.skipped.length === 1 ? '1 file that isn\'t' : `${r.skipped.length} files that aren't`} audio.` : ''),
            )
          }}
        />
        <Row label={<>Music volume <output>{s.musicVolume}%</output></>}>
          <input type="range" min={0} max={100} value={s.musicVolume} aria-label="Music volume" onChange={(e) => onChange({ musicVolume: +e.target.value })} />
        </Row>
        <Check label="Shuffle" checked={s.shuffle} onChange={(shuffle) => onChange({ shuffle })} />
        <p className="note">
          Music stays on this device. Free tracks such as Sharou's can be downloaded from his YouTube channel or OpenTracks and added here.
        </p>
      </Group>

      <Group title="Ambient sound">
        <Segmented
          label="Ambient sound"
          options={[
            { value: 'none', label: 'None' },
            { value: 'rain', label: 'Rain' },
            { value: 'ocean', label: 'Ocean' },
            { value: 'brown', label: 'Soft noise' },
          ]}
          value={s.ambient}
          onChange={(ambient) => onChange({ ambient })}
        />
        <Row label={<>Ambient volume <output>{s.ambientVolume}%</output></>}>
          <input type="range" min={0} max={100} value={s.ambientVolume} aria-label="Ambient volume" onChange={(e) => onChange({ ambientVolume: +e.target.value })} />
        </Row>
      </Group>

      <Group title="When sound plays">
        <Segmented
          label="When sound plays"
          options={[
            { value: 'focus', label: 'Focus only' },
            { value: 'both', label: 'Focus and breaks' },
            { value: 'manual', label: 'Manual' },
          ]}
          value={s.playWhen}
          onChange={(playWhen) => onChange({ playWhen })}
        />
        <div className="inline">
          <button type="button" className="btn" onClick={sound.togglePreview}>{sound.preview ? 'Stop' : 'Play now'}</button>
          <button type="button" className="btn" disabled={sound.tracks.length < 2} onClick={sound.next}>Next track</button>
        </div>
        {sound.blocked && <p className="note warn">The browser blocked audio. Tap Play now once to allow it.</p>}
        <p className="note">
          Music and ambient sound start when you press Start and fade out when the timer pauses. In "Focus only" they also fade out during breaks.
        </p>
        <p className="note">On iPhone and iPad, sound stops when the screen locks. Keep the app open on screen while you focus.</p>
      </Group>

      <Group title="End-of-session sound">
        <Segmented
          label="End-of-session sound"
          options={[
            { value: 'shutter', label: 'Shutter' },
            { value: 'bell', label: 'Bell' },
            { value: 'chime', label: 'Chime' },
            { value: 'none', label: 'None' },
          ]}
          value={s.endSound}
          onChange={(endSound) => onChange({ endSound })}
        />
        <div className="inline">
          <button type="button" className="btn" disabled={s.endSound === 'none'} onClick={sound.testEndSound}>Test sound</button>
        </div>
      </Group>
    </>
  )
}
