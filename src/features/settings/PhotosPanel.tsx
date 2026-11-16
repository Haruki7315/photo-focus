import { useEffect, useState } from 'react'
import { hasPhoto, photosInAlbum } from '../../core/albums'
import { EVERY_MINUTES_OPTIONS, formatBytes, type PhotoChangeSettings } from '../../core/photos'
import type { Albums } from '../photos/useAlbums'
import { AlbumsGroup } from './AlbumsGroup'
import { getStorageInfo } from '../../platform/storageInfo'
import { Group, Row } from '../../ui/Row'
import { Segmented } from '../../ui/Segmented'
import { Icon } from '../../ui/Icon'
import { AddPhotosButton, describeImport } from '../photos/AddPhotosButton'
import { Thumb } from '../photos/Thumb'
import type { PhotoLibrary } from '../photos/usePhotoLibrary'

export function PhotosPanel(props: {
  library: PhotoLibrary
  albums: Albums
  photoChange: PhotoChangeSettings
  onPhotoChange: (patch: Partial<PhotoChangeSettings>) => void
  onMessage: (text: string) => void
}) {
  const { library, albums } = props
  const active = albums.active
  const [editingAlbum, setEditing] = useState(false)
  const editing = editingAlbum && active !== null && !library.usingSamples
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

  // Which thumbnails to show: everything while choosing photos for an album, else the album (or all).
  const inActive = active && !library.usingSamples ? photosInAlbum(library.photos, active) : null
  const shown = editing || !inActive ? library.photos : inActive
  const gridTitle = library.usingSamples
    ? 'Sample photos'
    : editing
      ? `Choose photos for "${active!.name}" (${inActive!.length})`
      : active
        ? `${active.name} (${inActive!.length})`
        : `Your photos (${count})`

  return (
    <>
      <AlbumsGroup library={library} albums={albums} editing={editing} onEditing={setEditing} onMessage={props.onMessage} />

      <Group title={gridTitle}>
        {active && !editing && inActive!.length === 0 && (
          <p className="note">This album is empty, so the timer shows all your photos. Tap Choose photos to add some.</p>
        )}
        {editing && active && (
          <div className="inline">
            <button type="button" className="btn" onClick={() => albums.add(active.id, library.photos.map((p) => p.id))}>
              Select all
            </button>
            <button type="button" className="btn" onClick={() => albums.save({ ...active, photoIds: [] })}>
              Select none
            </button>
          </div>
        )}
        <div className={`thumbs${editing ? ' choosing' : ''}`}>
          {shown.map((p) => {
            const member = active ? hasPhoto(active, p.id) : false
            return (
            <button
              key={p.id}
              type="button"
              className={[p.hidden ? 'is-hidden' : '', editing && !member ? 'not-in' : ''].join(' ').trim()}
              aria-current={!editing && p.id === current?.id}
              aria-pressed={editing ? member : undefined}
              aria-label={editing ? `${p.title}: ${member ? 'in album' : 'not in album'}` : `Show ${p.title}${p.favorite ? ', favorite' : ''}${p.hidden ? ', hidden' : ''}`}
              onClick={() => {
                if (editing && active) {
                  albums.toggle(active.id, p.id)
                  return
                }
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
              {editing && member && <span className="tick" aria-hidden="true">✓</span>}
            </button>
            )
          })}
        </div>
        <AddPhotosButton
          library={library}
          onDone={(s) => {
            // While an album is chosen, new photos go into it too.
            if (active && s.ids.length) albums.add(active.id, s.ids)
            props.onMessage(describeImport(s))
          }}
        />
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
          {!current.sample && albums.albums.length > 0 && (
            <div className="checks" role="group" aria-label="Albums this photo is in">
              {albums.albums.map((a) => (
                <label key={a.id} className="check">
                  <input type="checkbox" checked={hasPhoto(a, current.id)} onChange={() => albums.toggle(a.id, current.id)} />
                  {a.name}
                </label>
              ))}
            </div>
          )}
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
