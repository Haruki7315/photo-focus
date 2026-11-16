/**
 * Give the user a file (e.g. the stats CSV).
 * On iPhone/iPad this opens the share sheet so you can "Save to Files",
 * AirDrop or send it; elsewhere it downloads the file.
 */
export async function saveTextFile(name: string, text: string, type = 'text/csv'): Promise<'shared' | 'downloaded' | 'cancelled'> {
  // Byte-order mark so Excel opens UTF-8 (e.g. Japanese task names) correctly.
  const file = new File(['﻿' + text], name, { type })
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
