import type { PhotoMeta } from '../../core/photos'
import type { PhotoFiles } from '../../platform/types'

/**
 * The 3 sample photos, drawn on a canvas (ported from the prototype), so the
 * app is never blank and we don't ship any image files we didn't make.
 */

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

const ridge: Draw = (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h)
  gr.addColorStop(0, '#26304f'); gr.addColorStop(0.45, '#b05a4a'); gr.addColorStop(0.7, '#f0a95a'); gr.addColorStop(1, '#f6d29a')
  g.fillStyle = gr; g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(255,226,170,.9)'; g.beginPath(); g.arc(w * 0.62, h * 0.66, 70, 0, 7); g.fill()
  for (const [col, base, ph] of [['#3b2b3a', 0.62, 0], ['#291e2b', 0.72, 1.7], ['#170f19', 0.84, 3.1]] as const) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, h)
    for (let x = 0; x <= w; x += 20) g.lineTo(x, h * base - Math.sin(x / 210 + ph) * 60 - Math.sin(x / 70 + ph) * 14)
    g.lineTo(w, h); g.fill()
  }
}

const milkyWay: Draw = (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h)
  gr.addColorStop(0, '#04060f'); gr.addColorStop(0.7, '#14203d'); gr.addColorStop(1, '#2a3555')
  g.fillStyle = gr; g.fillRect(0, 0, w, h)
  const r = seeded(42)
  g.save(); g.translate(w * 0.5, h * 0.35); g.rotate(-0.5)
  const mw = g.createRadialGradient(0, 0, 10, 0, 0, 420)
  mw.addColorStop(0, 'rgba(200,190,255,.22)'); mw.addColorStop(1, 'rgba(200,190,255,0)')
  g.fillStyle = mw; g.scale(2.4, 0.45); g.beginPath(); g.arc(0, 0, 420, 0, 7); g.fill(); g.restore()
  for (let i = 0; i < 1400; i++) {
    const s = r() * 1.6 + 0.2
    g.fillStyle = `rgba(255,255,255,${r() * 0.8 + 0.2})`; g.fillRect(r() * w, r() * h * 0.85, s, s)
  }
  g.fillStyle = '#020306'; g.beginPath(); g.moveTo(0, h)
  for (let x = 0; x <= w; x += 8) {
    const peak = x > w * 0.55 && x < w * 0.62 ? 260 * Math.sin(((x - w * 0.55) / (w * 0.07)) * Math.PI) : 0
    g.lineTo(x, h * 0.86 - Math.sin(x / 90) * 18 - peak)
  }
  g.lineTo(w, h); g.fill()
}

const cityBokeh: Draw = (g, w, h) => {
  g.fillStyle = '#0b0d14'; g.fillRect(0, 0, w, h)
  const r = seeded(7)
  const cols = ['255,190,110', '255,120,90', '120,180,255', '255,230,180', '180,255,220']
  for (let i = 0; i < 90; i++) {
    const x = r() * w, y = r() * h, rad = 30 + r() * 110, c = cols[Math.floor(r() * cols.length)]
    const gr = g.createRadialGradient(x, y, rad * 0.2, x, y, rad)
    gr.addColorStop(0, `rgba(${c},${0.25 + r() * 0.35})`); gr.addColorStop(0.85, `rgba(${c},.12)`); gr.addColorStop(1, `rgba(${c},0)`)
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill()
  }
}

const SAMPLES: Array<{ id: string; title: string; w: number; h: number; draw: Draw; exif: PhotoMeta['exif'] }> = [
  { id: 'sample-ridge', title: 'Sample · Ridge at dusk', w: 1800, h: 1200, draw: ridge, exif: { model: 'α7 IV', focalLength: 70, fNumber: 8, exposureTime: 1 / 250, iso: 100 } },
  { id: 'sample-milkyway', title: 'Sample · Milky Way', w: 1100, h: 1650, draw: milkyWay, exif: { model: 'α7 IV', focalLength: 20, fNumber: 1.8, exposureTime: 15, iso: 3200 } },
  { id: 'sample-city', title: 'Sample · City bokeh', w: 1400, h: 1400, draw: cityBokeh, exif: { model: 'α7 IV', focalLength: 50, fNumber: 1.4, exposureTime: 1 / 60, iso: 1600 } },
]

function canvasBlob(c: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality))
}

let cache: Promise<Array<{ meta: PhotoMeta; files: PhotoFiles }>> | null = null

/** Draw the samples once and reuse them. */
export function loadSamples() {
  cache ??= Promise.all(
    SAMPLES.map(async (s) => {
      const c = document.createElement('canvas')
      c.width = s.w; c.height = s.h
      s.draw(c.getContext('2d')!, s.w, s.h)
      const display = await canvasBlob(c, 0.88)
      const k = 300 / Math.max(s.w, s.h)
      const t = document.createElement('canvas')
      t.width = Math.round(s.w * k); t.height = Math.round(s.h * k)
      t.getContext('2d')!.drawImage(c, 0, 0, t.width, t.height)
      const thumb = await canvasBlob(t, 0.8)
      c.width = c.height = t.width = t.height = 0
      const meta: PhotoMeta = { id: s.id, title: s.title, addedAt: 0, width: s.w, height: s.h, favorite: false, hidden: false, exif: s.exif, sample: true }
      return { meta, files: { display, thumb } }
    }),
  )
  return cache
}
