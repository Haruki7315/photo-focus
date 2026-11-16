/**
 * Give the user a file (e.g. the stats CSV).
 * On iPhone/iPad this opens the share sheet so you can "Save to Files",
 * AirDrop or send it; elsewhere it downloads the file.
 */
export type SaveResult = 'shared' | 'downloaded' | 'cancelled'

export async function saveTextFile(name: string, text: string, type = 'text/csv'): Promise<SaveResult> {
  // Byte-order mark so Excel opens UTF-8 (e.g. Japanese task names) correctly.
  return saveFile(new File(['﻿' + text], name, { type }))
}

/** Same for any file (e.g. an exported album). */
export async function saveFile(file: File): Promise<SaveResult> {
  const name = file.name
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  // Touch devices (iPhone/iPad) get the share sheet; computers get a normal download.
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  if (touch && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Fall through to a normal download.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
