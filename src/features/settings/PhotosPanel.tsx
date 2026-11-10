import { useEffect, useState } from 'react'
import { EVERY_MINUTES_OPTIONS, formatBytes, type PhotoChangeSettings } from '../../core/photos'
import { getStorageInfo } from '../../platform/storageInfo'
import { Group, Row } from '../../ui/Row'
import { Segmented } from '../../ui/Segmented'
import { Icon } from '../../ui/Icon'
import { AddPhotosButton, describeImport } from '../photos/AddPhotosButton'
import { Thumb } from '../photos/Thumb'
import type { PhotoLibrary } from '../photos/usePhotoLibrary'

export function PhotosPanel(props: {
  library: PhotoLibrary
  photoChange: PhotoChangeSettings
  onPhotoChange: (patch: Partial<PhotoChangeSettings>) => void
  onMessage: (text: string) => void
}) {
  const { library } = props
  const [storage, setStorage] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const current = library.current
  const count = library.photos.length

  useEffect(() => {
    let alive = true
    getStorageInfo().then((s) => {
      if (alive && s.usedBytes !== null) setStorage(`${formatBytes(s.usedBytes)} used on this device${s.persisted ? '' : ' · not yet protected from clean-up'}`)
    })
    return () => {
      alive = false
    }
  }, [count])

  return (
    <>
      <Group title={library.usingSamples ? 'Sample photos' : `Your photos (${count})`}>
        <div className="thumbs">
          {library.photos.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.hidden ? 'is-hidden' : ''}
              aria-current={p.id === current?.id}
              aria-label={`Show ${p.title}${p.favorite ? ', favorite' : ''}${p.hidden ? ', hidden' : ''}`}
              onClick={() => {
                if (p.hidden) {
                  library.setHidden(p.id, false)
                  props.onMessage('Photo is back in the rotation.')
                }
                library.show(p.id)
                setConfirmRemove(false)
              }}
            >
              <Thumb id={p.id} />
              {p.hidden ? <span className="tag">hidden</span> : p.sample ? <span className="tag">sample</span> : null}
              {p.favorite && <span className="heart"><Icon name="heart" filled /></span>}
            </button>
          ))}
        </div>
        <AddPhotosButton library={library} onDone={(s) => props.onMessage(describeImport(s))} />
        <p className="note">
          {library.usingSamples
            ? 'The samples go away once you add your own photos. '
            : ''}
          Pick from Photos or Files (iCloud Drive, Downloads, or an SSD plugged into your iPad). Your originals are never changed. Favorites come up about 3 times as often. Tap a hidden photo to bring it back.
        </p>
        {storage && <p className="note">{storage}</p>}
      </Group>

      {current && (
        <Group title="Current photo">
          <div className="inline">
            <button type="button" className="btn" aria-pressed={current.favorite} onClick={() => library.toggleFavorite(current.id)}>
              <Icon name="heart" filled={current.favorite} /> {current.favorite ? 'Favorited' : 'Favorite'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (!library.setHidden(current.id, true)) props.onMessage('This is the only photo left, so it stays.')
                else props.onMessage('Photo hidden. Tap it here to bring it back.')
              }}
            >
              <Icon name="hide" /> Hide
            </button>
            {!current.sample &&
              (confirmRemove ? (
                <>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={async () => {
                      setConfirmRemove(false)
                      await library.remove(current.id)
                      props.onMessage('Photo removed from the app. The original file is untouched.')
                    }}
                  >
                    Yes, remove
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmRemove(false)}>Cancel</button>
                </>
              ) : (
                <button type="button" className="btn danger" onClick={() => setConfirmRemove(true)}>Remove from app</button>
              ))}
          </div>
        </Group>
      )}

      <Group title="Photo changes">
        <Segmented
          label="When the photo changes"
          options={[
            { value: 'session', label: 'Same all session' },
            { value: 'every', label: 'Every few min' },
            { value: 'break', label: 'At each break' },
          ]}
          value={props.photoChange.mode}
          onChange={(mode) => props.onPhotoChange({ mode })}
        />
        {props.photoChange.mode === 'every' && (
          <Row label="Change every">
            <select
              value={props.photoChange.everyMinutes}
              onChange={(e) => props.onPhotoChange({ everyMinutes: +e.target.value })}
            >
              {EVERY_MINUTES_OPTIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </Row>
        )}
      </Group>
    </>
  )
}
