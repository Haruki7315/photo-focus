import { useEffect, useRef, useState } from 'react'
import { photosInAlbum } from '../../core/albums'
import { Group } from '../../ui/Row'
import { exportAlbum, importAlbum } from '../photos/albumTransfer'
import type { Albums } from '../photos/useAlbums'
import type { PhotoLibrary } from '../photos/usePhotoLibrary'

/** Pick the active album, make/rename/delete albums, and export/import .pfalbum files. */
export function AlbumsGroup(props: {
  library: PhotoLibrary
  albums: Albums
  editing: boolean
  onEditing: (on: boolean) => void
  onMessage: (text: string) => void
}) {
  const { library, albums } = props
  const active = albums.active
  const [naming, setNaming] = useState<'new' | 'rename' | null>(null)
  const [name, setName] = useState('')
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // "Tap again to delete" turns itself off after a few seconds.
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(t)
  }, [armed])

  const realPhotos = library.usingSamples ? [] : library.photos

  const submitName = () => {
    if (naming === 'new') {
      albums.create(name)
      props.onEditing(true)
    } else if (naming === 'rename' && active) albums.rename(active.id, name)
    setNaming(null)
  }

  return (
    <Group title="Album">
      {!library.usingSamples && (
        <select
          aria-label="Album to show"
          value={active?.id ?? ''}
          onChange={(e) => {
            albums.setActive(e.target.value || null)
            props.onEditing(false)
            setNaming(null)
            setArmed(false)
          }}
        >
          <option value="">All photos ({realPhotos.length})</option>
          {albums.albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({photosInAlbum(realPhotos, a).length})
            </option>
          ))}
        </select>
      )}

      {naming ? (
        <form
          className="inline"
          onSubmit={(e) => {
            e.preventDefault()
            submitName()
          }}
        >
          <input type="text" autoFocus maxLength={40} placeholder="Album name" aria-label="Album name" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn primary">{naming === 'new' ? 'Create' : 'Save'}</button>
          <button type="button" className="btn" onClick={() => setNaming(null)}>Cancel</button>
        </form>
      ) : (
        <div className="inline">
          {!library.usingSamples && (
            <button type="button" className="btn" onClick={() => { setName(''); setNaming('new') }}>
              New album
            </button>
          )}
          {active && (
            <>
              <button type="button" className={`btn${props.editing ? ' primary' : ''}`} onClick={() => props.onEditing(!props.editing)}>
                {props.editing ? 'Done' : 'Choose photos'}
              </button>
              <button type="button" className="btn" onClick={() => { setName(active.name); setNaming('rename') }}>
                Rename
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy !== null}
                onClick={async () => {
                  setBusy('Exporting…')
                  try {
                    props.onMessage(await exportAlbum(active, library))
                  } catch {
                    props.onMessage("Couldn't export this album.")
                  }
                  setBusy(null)
                }}
              >
                Export album
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  if (!armed) return setArmed(true)
                  setArmed(false)
                  props.onEditing(false)
                  albums.remove(active.id)
                  props.onMessage(`Deleted the album "${active.name}". Its photos are still in All photos.`)
                }}
              >
                {armed ? 'Tap again to delete' : 'Delete album'}
              </button>
            </>
          )}
          <button type="button" className="btn" disabled={busy !== null} onClick={() => fileInput.current?.click()}>
            Import album
          </button>
          {/* No "accept" filter: iPhone/iPad would grey out .pfalbum files it doesn't know. */}
          <input
            ref={fileInput}
            type="file"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              props.onEditing(false)
              setBusy('Opening album…')
              props.onMessage(await importAlbum(file, library, albums, (done, total) => setBusy(`Importing ${done} of ${total}…`)))
              setBusy(null)
            }}
          />
        </div>
      )}
      {busy && <p className="note" aria-live="polite">{busy}</p>}
      <p className="note">
        {library.usingSamples
          ? 'Got a .pfalbum file from your Mac or another device? Tap Import album.'
          : active
            ? props.editing
              ? `Tap photos below to add them to "${active.name}" or take them out. A photo can be in several albums.`
              : `The timer shows photos from "${active.name}". Photos you add now go into it too. Export makes a .pfalbum file you can AirDrop or save to iCloud Drive, then import on your iPad or iPhone.`
            : 'Make albums to choose which photos show up, e.g. one for work and one for evenings.'}
      </p>
    </Group>
  )
}
