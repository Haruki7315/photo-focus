import { useRef } from 'react'
import { importAlbum } from './albumTransfer'
import type { Albums } from './useAlbums'
import type { PhotoLibrary } from './usePhotoLibrary'

/** Picks a .pfalbum file and imports it. `onBusy` gets progress text (null when finished). */
export function ImportAlbumButton(props: {
  library: PhotoLibrary
  albums: Albums
  busy: boolean
  onBusy: (text: string | null) => void
  onDone: (message: string, ok: boolean) => void
  className?: string
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={props.className ?? 'btn'} disabled={props.busy} onClick={() => input.current?.click()}>
        {props.label ?? 'Import album'}
      </button>
      {/* No "accept" filter: iPhone/iPad would grey out .pfalbum files it doesn't know. */}
      <input
        ref={input}
        type="file"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          props.onBusy('Opening album…')
          const { message, ok } = await importAlbum(file, props.library, props.albums, (done, total) => props.onBusy(`Importing ${done} of ${total}…`))
          props.onBusy(null)
          props.onDone(message, ok)
        }}
      />
    </>
  )
}
