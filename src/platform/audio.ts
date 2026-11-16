import { ambientGain, musicGain, type AmbientKind, type EndSound } from '../core/sound'

/**
 * All sound output (ported from the prototype):
 * - ambient rain / ocean / soft noise, generated with Web Audio (no files)
 * - end sounds: shutter, bell, chime (generated)
 * - music from the user's own files
 *
 * iPhone/iPad notes:
 * - Sound can only start after a tap, so call unlock() inside a tap handler.
 * - iOS ignores `audio.volume`, so music goes through a Web Audio gain node;
 *   that makes the volume slider and the ~1 s fades work there too.
 * - Web apps on iOS stop sound when the screen locks.
 */

type Ctx = AudioContext

function noiseBuffer(ctx: Ctx, type: 'white' | 'pink' | 'brown'): AudioBuffer {
  const len = ctx.sampleRate * 4
  const b = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = b.getChannelData(0)
  let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (type === 'brown') {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    } else if (type === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    } else {
      d[i] = w * 0.5
    }
  }
  return b
}

const FADE = 0.35 // time constant in seconds: ~1 s to reach the target

export class AudioEngine {
  private ctx: Ctx | null = null
  private ambient: { kind: AmbientKind; src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode | null } | null = null
  private buffers = new Map<string, AudioBuffer>()
  private music = new Audio()
  private musicGain: GainNode | null = null
  private musicUrl: string | null = null
  private pauseTimer = 0
  private wantMusic = false
  private primed = false
  /** Called when a track finishes (to play the next one). */
  onTrackEnd: (() => void) | null = null

  constructor() {
    this.music.preload = 'auto'
    this.music.addEventListener('ended', () => this.onTrackEnd?.())
    // iOS pauses audio in the background; resume when we're visible again.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => {})
    })
  }

  /** Create/resume audio. Must be called from a tap (iOS rule). Returns false if audio isn't available. */
  unlock(): boolean {
    if (!this.ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!C) return false
      this.ctx = new C()
      // Send music through a gain node so volume and fades work on iOS.
      const src = this.ctx.createMediaElementSource(this.music)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0
      src.connect(this.musicGain).connect(this.ctx.destination)
    }
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {})
    this.primeMusic()
    return true
  }

  /**
   * iOS only lets an audio element start from a tap. Starting it once
   * (silently, at volume 0) during a tap "unlocks" it, so it can start
   * later on its own, e.g. when a break ends.
   */
  private primeMusic() {
    if (this.primed || !this.musicUrl || !this.music.paused) return
    this.primed = true
    this.music
      .play()
      .then(() => {
        if (!this.wantMusic) this.music.pause()
      })
      .catch(() => {
        this.primed = false
      })
  }

  private buffer(kind: 'white' | 'pink' | 'brown'): AudioBuffer {
    let b = this.buffers.get(kind)
    if (!b) {
      b = noiseBuffer(this.ctx!, kind)
      this.buffers.set(kind, b)
    }
    return b
  }

  /* ---------- Ambient ---------- */

  /** Start, change or stop the ambient sound. `on` false fades it out. */
  setAmbient(kind: AmbientKind, volume: number, on: boolean) {
    const ctx = this.ctx
    if (!ctx) return
    const want = on && kind !== 'none'
    if (this.ambient && (!want || this.ambient.kind !== kind)) this.stopAmbient()
    if (!want) return
    if (this.ambient) {
      this.ambient.gain.gain.setTargetAtTime(ambientGain(volume), ctx.currentTime, 0.1)
      return
    }
    const src = ctx.createBufferSource()
    src.buffer = this.buffer(kind === 'rain' ? 'pink' : 'brown')
    src.loop = true
    let node: AudioNode = src
    if (kind === 'rain') {
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 450
      src.connect(hp)
      node = hp
    }
    const shape = ctx.createGain()
    const gain = ctx.createGain()
    gain.gain.value = 0
    node.connect(shape).connect(gain).connect(ctx.destination)
    let lfo: OscillatorNode | null = null
    if (kind === 'ocean') {
      // Slow swell, like waves (about one every 12 seconds).
      lfo = ctx.createOscillator()
      lfo.frequency.value = 0.085
      const depth = ctx.createGain()
      depth.gain.value = 0.45
      shape.gain.value = 0.55
      lfo.connect(depth).connect(shape.gain)
      lfo.start()
    }
    src.start()
    gain.gain.setTargetAtTime(ambientGain(volume), ctx.currentTime, 0.5)
    this.ambient = { kind, src, gain, lfo }
  }

  private stopAmbient() {
    const a = this.ambient
    const ctx = this.ctx
    if (!a || !ctx) return
    this.ambient = null
    a.gain.gain.cancelScheduledValues(ctx.currentTime)
    a.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
    window.setTimeout(() => {
      try {
        a.src.stop()
        a.lfo?.stop()
      } catch {
        /* already stopped */
      }
    }, 1600)
  }

  /* ---------- Music ---------- */

  /** Load a track (does not start playing). */
  loadTrack(file: Blob) {
    if (this.musicUrl) URL.revokeObjectURL(this.musicUrl)
    this.musicUrl = URL.createObjectURL(file)
    this.music.src = this.musicUrl
  }

  hasTrack(): boolean {
    return this.musicUrl !== null
  }

  clearTrack() {
    this.music.pause()
    this.music.removeAttribute('src')
    this.music.load()
    if (this.musicUrl) URL.revokeObjectURL(this.musicUrl)
    this.musicUrl = null
  }

  /** Fade music in (or keep it playing) at this volume. Resolves false if the browser blocked it. */
  async playMusic(volume: number): Promise<boolean> {
    if (!this.ctx || !this.musicGain || !this.musicUrl) return false
    this.wantMusic = true
    window.clearTimeout(this.pauseTimer)
    const g = this.musicGain.gain
    g.cancelScheduledValues(this.ctx.currentTime)
    g.setTargetAtTime(musicGain(volume), this.ctx.currentTime, FADE)
    if (!this.music.paused) return true
    try {
      await this.music.play()
      return true
    } catch {
      return false
    }
  }

  setMusicVolume(volume: number) {
    if (this.ctx && this.musicGain && !this.music.paused) this.musicGain.gain.setTargetAtTime(musicGain(volume), this.ctx.currentTime, 0.1)
  }

  /** Fade music out, then pause. */
  pauseMusic() {
    this.wantMusic = false
    if (!this.ctx || !this.musicGain || this.music.paused) return
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime)
    this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, FADE * 0.8)
    window.clearTimeout(this.pauseTimer)
    this.pauseTimer = window.setTimeout(() => {
      if (!this.wantMusic) this.music.pause()
    }, 1100)
  }

  isMusicPlaying(): boolean {
    return !this.music.paused
  }

  /* ---------- End sounds ---------- */

  playEnd(kind: EndSound) {
    const ctx = this.ctx
    if (!ctx || kind === 'none') return
    const t = ctx.currentTime
    const tone = (f: number, start: number, d: number, vol: number) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0, t + start)
      g.gain.linearRampToValueAtTime(vol, t + start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + d)
      o.connect(g).connect(ctx.destination)
      o.start(t + start)
      o.stop(t + start + d + 0.05)
    }
    if (kind === 'bell') {
      tone(880, 0, 2.6, 0.25)
      tone(1760, 0, 1.4, 0.08)
      tone(2640, 0, 0.8, 0.04)
    } else if (kind === 'chime') {
      tone(784, 0, 1.6, 0.18)
      tone(988, 0.18, 1.6, 0.16)
      tone(1175, 0.36, 2.2, 0.16)
    } else {
      // Shutter: two short filtered clicks.
      const burst = (start: number, d: number, freq: number, vol: number) => {
        const s = ctx.createBufferSource()
        s.buffer = this.buffer('white')
        const f = ctx.createBiquadFilter()
        f.type = 'bandpass'
        f.frequency.value = freq
        f.Q.value = 0.9
        const g = ctx.createGain()
        g.gain.setValueAtTime(vol, t + start)
        g.gain.exponentialRampToValueAtTime(0.001, t + start + d)
        s.connect(f).connect(g).connect(ctx.destination)
        s.start(t + start, Math.random())
        s.stop(t + start + d + 0.02)
      }
      burst(0, 0.035, 2600, 1)
      burst(0.075, 0.06, 1700, 0.8)
    }
  }
}

/** One shared engine for the whole app. */
export const audioEngine = new AudioEngine()
