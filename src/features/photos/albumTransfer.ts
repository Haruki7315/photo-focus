import { AlbumFileError, albumFileName, mergeImportedAlbum, type Album } from '../../core/albums'
import { makeAlbumFile, readAlbumFile } from '../../platform/albumFile'
import { saveFile } from '../../platform/saveFile'
import { getPhotoFiles } from './photoUrls'
import type { Albums } from './useAlbums'
import type { PhotoLibrary } from './usePhotoLibrary'

/** Export an album as a .pfalbum file (share sheet on iPhone/iPad, download on Mac). Returns a message. */
export async function exportAlbum(album: Album, library: PhotoLibrary): Promise<string> {
  const { file, count } = await makeAlbumFile(album, library.photos, getPhotoFiles, albumFileName(album.name))
  if (count === 0) return 'This album has no photos to export yet.'
  const how = await saveFile(file)
  if (how === 'cancelled') return 'Export cancelled.'
  const size = file.size > 1e6 ? `${(file.size / 1e6).toFixed(0)} MB` : `${Math.ceil(file.size / 1e3)} KB`
  return how === 'shared'
    ? `Exported "${album.name}" (${count} photo${count > 1 ? 's' : ''}, ${size}).`
    : `Saved ${file.name} (${count} photo${count > 1 ? 's' : ''}, ${size}) to your Downloads. AirDrop it or put it in iCloud Drive, then tap Import album on the other device.`
}

/** Import a .pfalbum file: adds its photos (skipping ones you already have) and switches to the album. */
export async function importAlbum(
  file: File,
  library: PhotoLibrary,
  albums: Albums,
  onProgress: (done: number, total: number) => void,
): Promise<string> {
  try {
    const read = await readAlbumFile(file)
    if (!read.photos.length) return `"${read.manifest.album.name}" has no photos in it.`
    onProgress(0, read.photos.length)
    const { ids, added } = await library.addPrepared(read.photos, (done) => onProgress(done, read.photos.length))
    const { album, isNew } = mergeImportedAlbum(albums.albums, read.manifest, ids)
    albums.save(album)
    albums.setActive(album.id)
    const already = ids.length - added
    const failed = read.photos.length - ids.length
    return [
      `${isNew ? 'Imported' : 'Updated'} "${album.name}": ${added} new photo${added === 1 ? '' : 's'}`,
      already ? ` (${already} you already had)` : '',
      '.',
      failed ? ` ${failed} couldn't be saved (the device may be out of space).` : '',
      ' Now showing this album.',
    ].join('')
  } catch (e) {
    if (e instanceof AlbumFileError) return e.message
    return `Couldn't import "${file.name}". The device may be out of space.`
  }
}
