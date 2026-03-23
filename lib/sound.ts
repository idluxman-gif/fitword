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
