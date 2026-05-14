/**
 * Sound + haptic feedback.
 *
 * iOS PWA standalone mode silently blocks the Web Audio API even after
 * the unlock dance. The only reliable cross-iOS path is HTMLAudioElement
 * playing real audio files — which is what /public/sounds/wow.wav already
 * proves works.
 *
 * Strategy: at module-load we use an OfflineAudioContext (which has no
 * user-gesture requirement) to synthesize each effect into a WAV blob,
 * then expose play* functions that just trigger pre-built <audio>
 * elements. No live Web Audio scheduling at runtime.
 */

type SoundKey =
  | 'tileTap'
  | 'validWord'
  | 'invalidWord'
  | 'perfectFit'
  | 'stageClear'
  | 'timerWarning'
  | 'muteToggle'
  | 'explosion'

type Builder = (ctx: OfflineAudioContext) => void

// ─── WAV encoder ───────────────────────────────────────────────────
function encodeWAV(buffer: AudioBuffer): Blob {
  const numChannels = 1
  const sampleRate = buffer.sampleRate
  const samples = buffer.getChannelData(0)
  const dataSize = samples.length * 2
  const ab = new ArrayBuffer(44 + dataSize)
  const view = new DataView(ab)

  const writeString = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return new Blob([ab], { type: 'audio/wav' })
}

// ─── Render helpers ────────────────────────────────────────────────
async function render(durationSec: number, builder: Builder): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const Ctor = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext
  if (!Ctor) return null
  try {
    const sampleRate = 44100
    const ctx: OfflineAudioContext = new Ctor(1, Math.ceil(sampleRate * durationSec), sampleRate)
    builder(ctx)
    const buf = await ctx.startRendering()
    return URL.createObjectURL(encodeWAV(buf))
  } catch {
    return null
  }
}

function tone(
  ctx: OfflineAudioContext,
  freq: number,
  startSec: number,
  durSec: number,
  type: OscillatorType = 'sine',
  gain: number = 0.15,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startSec)
  g.gain.setValueAtTime(gain, startSec)
  g.gain.exponentialRampToValueAtTime(0.0001, startSec + durSec)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(startSec)
  osc.stop(startSec + durSec)
}

// ─── Sound builders ────────────────────────────────────────────────
const builders: Record<SoundKey, { dur: number; build: Builder }> = {
  tileTap: { dur: 0.1, build: (c) => tone(c, 800, 0, 0.05, 'sine', 0.18) },
  validWord: { dur: 0.4, build: (c) => {
    tone(c, 523, 0, 0.1, 'sine', 0.2)
    tone(c, 659, 0.06, 0.1, 'sine', 0.2)
    tone(c, 784, 0.12, 0.14, 'sine', 0.2)
  }},
  invalidWord: { dur: 0.2, build: (c) => tone(c, 200, 0, 0.15, 'square', 0.16) },
  perfectFit: { dur: 0.7, build: (c) => {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => tone(c, f, i * 0.12, 0.18, 'sine', 0.22))
  }},
  stageClear: { dur: 0.5, build: (c) => {
    tone(c, 659, 0, 0.12, 'sine', 0.2)
    tone(c, 784, 0.08, 0.12, 'sine', 0.2)
    tone(c, 1047, 0.16, 0.2, 'sine', 0.24)
  }},
  timerWarning: { dur: 0.12, build: (c) => tone(c, 880, 0, 0.08, 'sine', 0.2) },
  muteToggle: { dur: 0.3, build: (c) => {
    tone(c, 523, 0, 0.08, 'sine', 0.22)
    tone(c, 784, 0.07, 0.12, 'sine', 0.22)
  }},
  explosion: { dur: 0.4, build: (c) => {
    // White noise via summing many random-frequency oscillators
    for (let i = 0; i < 24; i++) {
      const f = 200 + Math.random() * 1800
      tone(c, f, 0, 0.3, 'sawtooth', 0.025)
    }
    // Boom sweep
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(130, 0)
    osc.frequency.exponentialRampToValueAtTime(35, 0.25)
    g.gain.setValueAtTime(0.5, 0)
    g.gain.exponentialRampToValueAtTime(0.001, 0.25)
    osc.connect(g)
    g.connect(c.destination)
    osc.start(0)
    osc.stop(0.3)
  }},
}

// ─── Cached <audio> elements ────────────────────────────────────────
const cache: Partial<Record<SoundKey, HTMLAudioElement>> = {}
let initStarted = false

function initSounds() {
  if (initStarted || typeof window === 'undefined') return
  initStarted = true
  ;(Object.keys(builders) as SoundKey[]).forEach(async (key) => {
    const url = await render(builders[key].dur, builders[key].build)
    if (!url) return
    const el = new Audio(url)
    el.preload = 'auto'
    cache[key] = el
  })
}

if (typeof document !== 'undefined') {
  // Run async on next tick so it doesn't block page paint
  setTimeout(initSounds, 0)
}

function play(key: SoundKey, muted: boolean) {
  if (muted) return
  const el = cache[key]
  if (!el) return
  try {
    // Clone so rapid taps overlap instead of cutting each other off
    const c = el.cloneNode(true) as HTMLAudioElement
    c.volume = 1
    void c.play().catch(() => {})
  } catch { /* no-op */ }
}

function vibrate(pattern: number[]) {
  if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
    ;(navigator as any).vibrate(pattern)
  }
}

// ─── Public API ────────────────────────────────────────────────────
export function playTileTap(muted: boolean) {
  play('tileTap', muted)
  vibrate([10])
}

export function playValidWord(muted: boolean) {
  play('validWord', muted)
  vibrate([30])
}

export function playInvalidWord(muted: boolean) {
  play('invalidWord', muted)
  vibrate([50, 30, 50])
}

export function playPerfectFit(muted: boolean) {
  play('perfectFit', muted)
  vibrate([100, 50, 100, 50, 200])
}

export function playStageClear(muted: boolean) {
  play('stageClear', muted)
  vibrate([50, 30, 100])
}

export function playTimerWarning(muted: boolean) {
  play('timerWarning', muted)
}

export function playExplosion(muted: boolean) {
  play('explosion', muted)
  vibrate([80, 30, 120])
}

/** Audible confirmation chirp when toggling unmute. */
export function playMuteToggle(nowMuted: boolean) {
  if (nowMuted) return
  play('muteToggle', false)
}
