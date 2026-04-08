/**
 * Sound & Haptic feedback system.
 * All sounds generated via Web Audio API — no external files.
 */

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain: number = 0.15) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function vibrate(pattern: number[]) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

// ─── Public API ───

export function playTileTap(muted: boolean) {
  if (!muted) playTone(800, 0.05, 'sine', 0.08)
  vibrate([10])
}

export function playValidWord(muted: boolean) {
  if (!muted) {
    playTone(523, 0.08, 'sine', 0.12)
    setTimeout(() => playTone(659, 0.08, 'sine', 0.12), 50)
    setTimeout(() => playTone(784, 0.1, 'sine', 0.12), 100)
  }
  vibrate([30])
}

export function playInvalidWord(muted: boolean) {
  if (!muted) playTone(200, 0.1, 'square', 0.08)
  vibrate([50, 30, 50])
}

export function playPerfectFit(muted: boolean) {
  if (!muted) {
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.15, 'sine', 0.15), i * 120)
    })
  }
  vibrate([100, 50, 100, 50, 200])
}

export function playStageClear(muted: boolean) {
  if (!muted) {
    playTone(659, 0.1, 'sine', 0.12)
    setTimeout(() => playTone(784, 0.1, 'sine', 0.12), 80)
    setTimeout(() => playTone(1047, 0.15, 'sine', 0.15), 160)
  }
  vibrate([50, 30, 100])
}

export function playTimerWarning(muted: boolean) {
  if (!muted) playTone(880, 0.07, 'sine', 0.1)
}

export function playExplosion(muted: boolean) {
  if (muted) return
  const ctx = getCtx()

  // White noise burst (sharp crack)
  const bufferSize = Math.floor(ctx.sampleRate * 0.35)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    // Amplitude envelope: sharp attack, fast decay
    const env = Math.pow(1 - i / bufferSize, 2.5)
    data[i] = (Math.random() * 2 - 1) * env
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 600
  noiseFilter.Q.value = 0.8

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.5, ctx.currentTime)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(ctx.currentTime)

  // Low-frequency boom
  const boom = ctx.createOscillator()
  boom.type = 'sine'
  boom.frequency.setValueAtTime(130, ctx.currentTime)
  boom.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.25)

  const boomGain = ctx.createGain()
  boomGain.gain.setValueAtTime(0.45, ctx.currentTime)
  boomGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

  boom.connect(boomGain)
  boomGain.connect(ctx.destination)
  boom.start(ctx.currentTime)
  boom.stop(ctx.currentTime + 0.25)

  // High "snap" transient
  const snap = ctx.createOscillator()
  snap.type = 'square'
  snap.frequency.setValueAtTime(800, ctx.currentTime)
  snap.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05)

  const snapGain = ctx.createGain()
  snapGain.gain.setValueAtTime(0.15, ctx.currentTime)
  snapGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)

  snap.connect(snapGain)
  snapGain.connect(ctx.destination)
  snap.start(ctx.currentTime)
  snap.stop(ctx.currentTime + 0.05)

  vibrate([80, 30, 120])
}
