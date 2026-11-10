// Draws the app icon (amber ring + clock hands on dark) as PNG files.
// No dependencies: a tiny rasterizer with anti-aliasing and Node's zlib.
// Run: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [17, 19, 23], RING = [225, 165, 86], HAND = [230, 232, 237]

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y)
      const i = y * (size * 3 + 1) + 1 + x * 3
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

// Shapes in a 64-unit grid (same as public/favicon.svg). `scale` < 1 shrinks the art for maskable icons.
function distSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
function color(u, v) {
  // returns [r,g,b] at grid point (u, v)
  const ring = Math.abs(Math.hypot(u - 32, v - 32) - 18) <= 2.5
  const hand = distSegment(u, v, 32, 20, 32, 32) <= 2 || distSegment(u, v, 32, 32, 40, 37) <= 2
  return hand ? HAND : ring ? RING : BG
}
function icon(size, scale = 1) {
  const SS = 4 // 4x4 samples per pixel for smooth edges
  return png(size, (x, y) => {
    let r = 0, g = 0, b = 0
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const u = 32 + (((x + (sx + 0.5) / SS) / size) * 64 - 32) / scale
      const v = 32 + (((y + (sy + 0.5) / SS) / size) * 64 - 32) / scale
      const c = color(u, v); r += c[0]; g += c[1]; b += c[2]
    }
    const n = SS * SS
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
  })
}

const out = 'public/icons/'
writeFileSync(out + 'icon-192.png', icon(192, 1.25))
writeFileSync(out + 'icon-512.png', icon(512, 1.25))
writeFileSync(out + 'icon-maskable-512.png', icon(512, 1.0)) // smaller art stays inside Android's safe zone
writeFileSync(out + 'apple-touch-icon.png', icon(180, 1.25))
console.log('icons written')
