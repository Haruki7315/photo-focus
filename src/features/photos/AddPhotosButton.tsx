import { useRef } from 'react'
import { PHOTO_ACCEPT } from '../../platform/imageImport'
import type { ImportSummary, PhotoLibrary } from './usePhotoLibrary'

/** Opens the system picker (Photos, Files, an SSD, iCloud Drive...) and imports the picked files. */
export function AddPhotosButton(props: {
  library: PhotoLibrary
  onDone: (summary: ImportSummary) => void
  className?: string
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const busy = props.library.progress !== null
  const p = props.library.progress
  return (
    <>
      <button type="button" className={props.className ?? 'btn primary'} disabled={busy} onClick={() => input.current?.click()}>
        {p ? `Adding ${p.done + 1 > p.total ? p.total : p.done + 1} of ${p.total}…` : (props.label ?? '+ Add photos')}
      </button>
      <input
        ref={input}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) props.onDone(await props.library.addFiles(files))
        }}
      />
    </>
  )
}

/** A short, friendly message about what happened. */
export function describeImport(s: ImportSummary): string {
  const parts: string[] = []
  if (s.added) parts.push(`Added ${s.added} photo${s.added > 1 ? 's' : ''}.`)
  if (s.raw.length) {
    const names = s.raw.length > 2 ? `${s.raw.slice(0, 2).join(', ')} and ${s.raw.length - 2} more` : s.raw.join(' and ')
    parts.push(`${names}: RAW files can't be shown. Export them as JPEG first (for example from Lightroom or the Photos app), then add the JPEGs.`)
  }
  if (s.failed.length) parts.push(`Couldn't read ${s.failed.length} file${s.failed.length > 1 ? 's' : ''} (${s.failed.slice(0, 2).join(', ')}).`)
  return parts.join(' ') || 'No photos added.'
}
