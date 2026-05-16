'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, type GameMode } from '@/lib/store'
import { useGridStore, type Direction } from '@/lib/grid-store'
import { useMultiplayerStore, type MultiplayerStatus } from '@/lib/multiplayer-store'
import { useDesignerStore, type CustomLevel, type LevelPack } from '@/lib/designer-store'
import { playTileTap, playValidWord, playInvalidWord, playPerfectFit, playStageClear, playTimerWarning, playExplosion, playMuteToggle } from '@/lib/sound'
import { fetchLeaderboard, checkQualifies, submitScore, type LeaderboardEntry } from '@/lib/leaderboard'

// ════════════════════════════════════════════════════════════════════
// Shared design primitives — Sunset Coral premium UI
// ════════════════════════════════════════════════════════════════════

function SceneBackground() {
  return (
    <>
      <div className="scene-bg" />
      <div className="scene-vignette" />
    </>
  )
}

const Icon = {
  Crown: ({ size = 36 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 36 36">
      <defs>
        <linearGradient id="crwnG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff7c0" />
          <stop offset="0.5" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#c47b14" />
        </linearGradient>
      </defs>
      <path d="M4 12 L9 22 L13 14 L18 24 L23 14 L27 22 L32 12 L29 26 L7 26 Z"
        fill="url(#crwnG)" stroke="#7a4500" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="4" cy="12" r="2.4" fill="#ec4899" stroke="#7a4500" strokeWidth="1" />
      <circle cx="18" cy="9" r="2.6" fill="#fb7185" stroke="#7a4500" strokeWidth="1" />
      <circle cx="32" cy="12" r="2.4" fill="#22c55e" stroke="#7a4500" strokeWidth="1" />
      <rect x="7" y="26" width="22" height="3" fill="#c47b14" stroke="#7a4500" strokeWidth="1" />
    </svg>
  ),
  Star: ({ size = 22, filled = true }: { size?: number; filled?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id={`starG-${size}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff7c0" />
          <stop offset="0.5" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#f5b942" />
        </linearGradient>
      </defs>
      <path d="M12 2 L14.6 8.6 L22 9.3 L16.3 14.1 L18 21.2 L12 17.3 L6 21.2 L7.7 14.1 L2 9.3 L9.4 8.6 Z"
        fill={filled ? `url(#starG-${size})` : 'rgba(255,255,255,0.1)'}
        stroke={filled ? '#8a5414' : 'rgba(255,255,255,0.2)'} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  ),
  Trophy: ({ size = 28 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 28 28">
      <defs>
        <linearGradient id={`trG-${size}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#c47b14" />
        </linearGradient>
      </defs>
      <path d="M7 4 H21 V11 C21 15 18 18 14 18 C10 18 7 15 7 11 Z" fill={`url(#trG-${size})`} stroke="#7a4500" strokeWidth="1.4" />
      <path d="M3 5 V8 C3 10 5 11 7 11 M25 5 V8 C25 10 23 11 21 11" fill="none" stroke="#7a4500" strokeWidth="1.4" />
      <rect x="10" y="18" width="8" height="4" fill="#c47b14" stroke="#7a4500" strokeWidth="1.4" />
      <rect x="7" y="22" width="14" height="3" rx="1" fill="#7a4500" />
    </svg>
  ),
  Lightning: ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M13 2 L4 14 L11 14 L9 22 L20 9 L13 9 Z" fill="#fde047" stroke="#854d0e" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  ),
  Gem: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id={`gemG-${size}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#c8f0ff" />
          <stop offset="1" stopColor="#4fb3e8" />
        </linearGradient>
      </defs>
      <path d="M12 2 L4 8 L12 22 L20 8 Z" fill={`url(#gemG-${size})`} stroke="#1b5d8a" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 8 L20 8 M12 2 L8 8 L12 22 M12 2 L16 8 L12 22" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" fill="none" />
    </svg>
  ),
}

function TimerRing({ time, totalTime = 90, low = false }: { time: number; totalTime?: number; low?: boolean }) {
  const minutes = Math.floor(time / 60)
  const seconds = time % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const pct = Math.max(0, Math.min(1, time / totalTime))
  const circumference = 2 * Math.PI * 21
  return (
    <div className={`timer-ring${low ? ' low' : ''}`}>
      <svg width="48" height="48">
        <defs>
          <linearGradient id="timerGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#fda4af" />
            <stop offset="1" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id="timerGradLow" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#fca5a5" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="21" className="bg" strokeWidth="4" fill="none" />
        <circle cx="24" cy="24" r="21" className="fg" strokeWidth="4" fill="none"
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)} />
      </svg>
      <div className="lbl">{timeStr}</div>
    </div>
  )
}

// Confetti — purely visual, deterministic per seed so it doesn't reshuffle on re-render
function Confetti({ count = 40, seed = 0 }: { count?: number; seed?: number }) {
  const pieces = useMemo(() => {
    const colors = ['#fb7185', '#ec4899', '#fbbf24', '#22c55e', '#0ea5e9', '#f97316', '#facc15', '#fb923c']
    return Array.from({ length: count }).map((_, i) => {
      const r = (n: number) => ((Math.sin((seed * 9301 + i * 49297 + n * 13) % 233280) + 1) / 2)
      return {
        left: r(1) * 100,
        cx: (r(2) - 0.5) * 200,
        size: 6 + r(3) * 10,
        color: colors[Math.floor(r(4) * colors.length)],
        rot: r(5) * 360,
        delay: r(6) * 0.6,
        dur: 1.6 + r(7) * 1.8,
        shape: r(8) > 0.5 ? 'square' : 'circle',
      }
    })
  }, [count, seed])
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 40 }}>
      {pieces.map((p, i) => (
        <div key={i} className="confetti-piece"
          style={{
            left: `${p.left}%`, top: -20,
            width: p.size, height: p.size,
            background: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rot}deg)`,
            animation: `confetti-fall ${p.dur}s ${p.delay}s linear infinite`,
            ['--cx' as any]: `${p.cx}px`,
            boxShadow: `0 0 8px ${p.color}66`,
          }} />
      ))}
    </div>
  )
}

// Burst rays for WOW splash
function BurstRays({ size = 320 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" style={{ display: 'block', pointerEvents: 'none' }}>
      <defs>
        <radialGradient id="burstG" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255,226,122,0.45)" />
          <stop offset="0.5" stopColor="rgba(245,185,66,0.18)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="rayG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="160" r="150" fill="url(#burstG)" />
      {Array.from({ length: 12 }).map((_, i) => (
        <polygon key={i} points="160,160 154,40 166,40" fill="url(#rayG)"
          transform={`rotate(${i * 30} 160 160)`} opacity="0.7" />
      ))}
    </svg>
  )
}

// eXacto wordmark — lowercase 'e' + 'acto' in coral brand gradient, 'X' in gold gradient
function ExactoLogo({ size = 76 }: { size?: number }) {
  return (
    <div className="brand-text shine"
      style={{
        fontSize: size, lineHeight: 0.9, padding: '4px 0',
        fontFamily: 'Sora, sans-serif', fontWeight: 900, letterSpacing: '-0.05em',
        direction: 'ltr',
      }}>
      e<span style={{
        background: 'linear-gradient(180deg,#fff7c0 0%,#ffe27a 30%,#f5b942 55%,#c47b14 75%,#ffe27a 100%)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      }}>X</span>acto
    </div>
  )
}

// ─── Init Hook ───
function useInit() {
  const initBests = useGameStore((s) => s.initBests)
  const initGridBest = useGridStore((s) => s.initBest)
  const initPacks = useDesignerStore((s) => s.initPacks)
  const didInit = useRef(false)
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true
      initBests()
      initGridBest()
      initPacks()
    }
  }, [initBests, initGridBest, initPacks])
}

// ─── Timer Hook ───
function useTimer() {
  const tick = useGameStore((s) => s.tick)
  const status = useGameStore((s) => s.status)
  const timeLeft = useGameStore((s) => s.timeLeft)
  const muted = useGameStore((s) => s.muted)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pausedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (status === 'playing') {
      intervalRef.current = setInterval(() => {
        tick()
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [status, tick])

  // Timer warning beep each second in the last 10s
  useEffect(() => {
    if (status === 'playing' && timeLeft > 0 && timeLeft <= 10) {
      playTimerWarning(muted)
    }
  }, [timeLeft, status, muted])

  // Pause timer when app is backgrounded, resume when foregrounded
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // App backgrounded — remember when we paused
        pausedAtRef.current = Date.now()
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        // App foregrounded — resume timer (don't deduct time while backgrounded)
        pausedAtRef.current = null
        const currentStatus = useGameStore.getState().status
        if (currentStatus === 'playing') {
          intervalRef.current = setInterval(() => {
            tick()
          }, 1000)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [tick])
}

// ─── Mute Button ───
function MuteButton() {
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const handleClick = () => {
    toggleMute()
    playMuteToggle(useGameStore.getState().muted)
  }

  return (
    <button
      onClick={handleClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
      aria-label={muted ? 'הפעל צלילים' : 'השתק'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

// ─── Leave Confirmation Dialog ───
function LeaveConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] px-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl p-6 max-w-[300px] w-full text-center border border-white/10"
        style={{
          background: 'linear-gradient(180deg, rgba(46,10,31,0.95), rgba(26,5,16,0.95))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 40px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p className="text-white text-lg font-bold mb-2">?לצאת מהמשחק</p>
        <p className="text-gray-400 text-sm mb-5">הפעולה תסיים את התור שלך</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-3d ghost flex-1" style={{ fontSize: 14, padding: '12px 0' }}>
            המשך לשחק
          </button>
          <button onClick={onConfirm} className="btn-3d danger flex-1" style={{ fontSize: 14, padding: '12px 0' }}>
            יציאה
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Top Bar ───
function TopBar() {
  const [showLeave, setShowLeave] = useState(false)
  const goHome = useGameStore((s) => s.goHome)
  const timeLeft = useGameStore((s) => s.timeLeft)
  const score = useGameStore((s) => s.score)
  const targetLength = useGameStore((s) => s.targetLength)
  const filledWords = useGameStore((s) => s.filledWords)
  const mode = useGameStore((s) => s.mode)
  const stage = useGameStore((s) => s.stage)
  const scoreTarget = useGameStore((s) => s.scoreTarget)
  const timerFlash = useGameStore((s) => s.timerFlash)
  const status = useGameStore((s) => s.status)

  const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
  const remaining = targetLength - filledLen
  const isLow = timeLeft <= 15

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        {/* Timer ring */}
        <div className="relative">
          <TimerRing time={timeLeft} totalTime={90} low={isLow} />
          <AnimatePresence>
            {timerFlash && (
              <motion.span
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -28 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className="absolute -top-2 right-0 text-xs font-black text-success"
              >
                +5s
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Center: stage + score */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="stage-badge">
            <Icon.Crown size={14} />
            <span>שלב {stage}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <motion.span
              key={score}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className="score-gold num"
              style={{ fontSize: 26, lineHeight: 1 }}
            >
              {score.toLocaleString()}
            </motion.span>
            <span className="text-[10px] font-bold text-white/50">נק'</span>
            {mode === 'score_rush' && scoreTarget > 0 && (
              <span className="text-[10px] text-white/40">/ {scoreTarget}</span>
            )}
          </div>
        </div>

        {/* Remaining counter + mute + leave */}
        <div className="flex items-center gap-1">
          <div className="hud-pill" style={{ padding: '4px 10px 4px 4px' }}>
            <div className="ico" style={{ width: 22, height: 22, fontSize: 12 }}>
              <span className="num" style={{ fontWeight: 900 }}>{remaining}</span>
            </div>
          </div>
          <MuteButton />
          <button onClick={() => setShowLeave(true)} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-error text-sm" aria-label="יציאה">✕</button>
        </div>
      </div>

      <AnimatePresence>
        {showLeave && <LeaveConfirm onConfirm={() => { setShowLeave(false); goHome() }} onCancel={() => setShowLeave(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ─── Target Row (RTL: filled from right, empty on left) ───
function TargetRow() {
  const targetLength = useGameStore((s) => s.targetLength)
  const filledWords = useGameStore((s) => s.filledWords)

  const cells: { char: string; wordIdx: number }[] = []
  filledWords.forEach((word, wordIdx) => {
    for (let i = 0; i < word.length; i++) cells.push({ char: word[i], wordIdx })
  })
  const emptyCount = Math.max(0, targetLength - cells.length)
  const lastWordIdx = filledWords.length - 1

  return (
    <div className="px-3 py-3">
      <div className="row-rtl flex-wrap justify-center" style={{ gap: 4 }}>
        {cells.map((cell, i) => {
          const isLastWord = cell.wordIdx === lastWordIdx
          const wordStartIdx = cells.findIndex((c) => c.wordIdx === cell.wordIdx)
          const offsetInWord = i - wordStartIdx
          return (
            <div
              key={`filled-${i}`}
              className={`slot filled${cell.wordIdx % 2 === 1 ? ' word-b' : ''}`}
              style={
                isLastWord
                  ? { animation: 'drop-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards', animationDelay: `${offsetInWord * 0.05}s` }
                  : undefined
              }
            >
              {cell.char}
            </div>
          )
        })}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`empty-${i}`} className="slot" />
        ))}
      </div>
    </div>
  )
}

// ─── Word Builder ───
function WordBuilder() {
  const currentWord = useGameStore((s) => s.currentWord)
  const clearWord = useGameStore((s) => s.clearWord)
  const submitWord = useGameStore((s) => s.submitWord)
  const undoLastWord = useGameStore((s) => s.undoLastWord)
  const shuffleLetters = useGameStore((s) => s.shuffleLetters)
  const filledWords = useGameStore((s) => s.filledWords)
  const score = useGameStore((s) => s.score)
  const status = useGameStore((s) => s.status)
  const mode = useGameStore((s) => s.mode)
  const muted = useGameStore((s) => s.muted)

  if (status !== 'playing') return null

  const handleSubmit = () => {
    const prevScore = useGameStore.getState().score
    submitWord()
    const newState = useGameStore.getState()
    if (newState.status === 'won' || newState.status === 'stage_clear') {
      if (newState.feedback?.text.includes('Perfect Fit')) {
        playPerfectFit(muted)
      } else {
        playStageClear(muted)
      }
    } else if (newState.score > prevScore) {
      playValidWord(muted)
    } else if (newState.feedback?.type === 'error') {
      playInvalidWord(muted)
    }
  }

  return (
    <div className="builder">
      <div className="flex items-center gap-2.5">
        <button onClick={clearWord} className="builder-btn clear" aria-label="מחק מילה">✕</button>
        <div className={`builder-display flex-1${currentWord ? '' : ' empty'}`}>
          {currentWord || 'הקש על אותיות'}
        </div>
        <button
          onClick={handleSubmit}
          disabled={currentWord.length === 0}
          className={`builder-btn submit${currentWord.length === 0 ? ' dim' : ''}`}
          aria-label="שלח מילה"
        >✓</button>
      </div>

      {/* Undo + shuffle row — hidden in Score Rush (shuffle is in top bar) */}
      {!currentWord && mode !== 'score_rush' && (
        <div className="flex gap-1.5 mt-2">
          {filledWords.length > 0 && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }}
              onClick={undoLastWord} className="builder-tool">
              ↶ ביטול ({filledWords[filledWords.length - 1]})
            </motion.button>
          )}
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }}
            onClick={shuffleLetters}
            className={`builder-tool gold ${filledWords.length > 0 ? '' : 'flex-1'}`}
            style={score < 50 ? { opacity: 0.5 } : {}}>
            🔀 ערבוב (50-)
          </motion.button>
        </div>
      )}
    </div>
  )
}

// ─── Letter Tiles ───
function LetterTiles() {
  const letters = useGameStore((s) => s.letters)
  const addLetterByIndex = useGameStore((s) => s.addLetterByIndex)
  const usedTileIndices = useGameStore((s) => s.usedTileIndices)
  const status = useGameStore((s) => s.status)
  const muted = useGameStore((s) => s.muted)

  if (status !== 'playing') return null

  const handleTap = (index: number) => {
    if (usedTileIndices.includes(index)) return
    addLetterByIndex(index)
    playTileTap(muted)
  }

  return (
    <div className="px-4 py-2 shrink-0">
      <div className="flex flex-wrap justify-center gap-2 max-w-[360px] mx-auto">
        {letters.map((letter, i) => {
          const isUsed = usedTileIndices.includes(i)
          return (
            <button
              key={`${letter}-${i}`}
              onClick={() => handleTap(i)}
              disabled={isUsed}
              className={`tile${isUsed ? ' used' : ''}`}
            >
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Feedback Bar ───
function FeedbackBar() {
  const feedback = useGameStore((s) => s.feedback)

  return (
    <div className="h-9 flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, y: 12, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`text-sm font-bold px-3 py-1 rounded-full ${
              feedback.type === 'success' ? 'text-success bg-success/10 border border-success/20' :
              feedback.type === 'error' ? 'text-error bg-error/10 border border-error/20' :
              feedback.type === 'warning' ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' :
              'text-neon bg-neon/10 border border-neon/20'
            }`}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Stage Clear Screen (Score Rush stage progression) ───
function StageClearScreen() {
  const status = useGameStore((s) => s.status)
  const score = useGameStore((s) => s.score)
  const stage = useGameStore((s) => s.stage)
  const nextStage = useGameStore((s) => s.nextStage)
  const filledWords = useGameStore((s) => s.filledWords)

  if (status !== 'stage_clear') return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6 overflow-hidden"
    >
      <SceneBackground />
      <Confetti count={50} seed={7} />
      <div className="absolute sunburst-gold pointer-events-none"
        style={{ top: '12%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500 }} />

      <div className="relative flex flex-col items-center gap-3 max-w-[320px]">
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 250, damping: 12 }}>
          <Icon.Crown size={88} />
        </motion.div>

        <motion.div className="stage-banner"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}>
          STAGE COMPLETE
        </motion.div>

        <div className="gold-text inline-flex items-baseline" style={{ fontSize: 64, lineHeight: 0.9, gap: 12, flexDirection: 'row-reverse' }}>
          <span style={{ fontFamily: 'Heebo' }}>שלב</span>
          <span style={{ fontFamily: 'Sora' }}>{stage}</span>
        </div>

        <div className="flex gap-1 mb-2">
          {[1, 2, 3].map((i) => (
            <motion.div key={i}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5 + i * 0.12, type: 'spring', stiffness: 300, damping: 14 }}
              style={{ transform: i === 2 ? 'translateY(-6px)' : undefined }}>
              <Icon.Star size={i === 2 ? 50 : 42} />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full p-4 rounded-2xl border border-white/10"
          style={{
            background: 'linear-gradient(180deg, rgba(15,8,30,0.85), rgba(10,4,20,0.85))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.5)',
          }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/55 font-bold">ניקוד כולל</span>
            <span className="num font-sora font-black text-2xl" style={{ color: '#ffe27a' }}>{score.toLocaleString()}</span>
          </div>
          {filledWords.length > 0 && (
            <p className="text-xs text-white/50 text-center mt-1">{filledWords.slice(-6).join(' • ')}</p>
          )}
        </motion.div>

        <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={nextStage}
          className="btn-3d gold shine w-full max-w-[280px] mt-2"
          style={{ fontSize: 19 }}>
          <span>שלב {stage + 1}</span>
          <span style={{ fontSize: 22, marginRight: 4 }}>‹</span>
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Leaderboard Hook + Component ───

function useLeaderboard(mode: string, value: number, active: boolean) {
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [qualifies, setQualifies] = useState(false)
  const [submittedRank, setSubmittedRank] = useState<number | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!active || value <= 0) return
    checkedRef.current = false
    setSubmittedRank(null)
    setNameInput('')
    fetchLeaderboard(mode).then((b) => {
      setBoard(b)
      if (!checkedRef.current) {
        checkedRef.current = true
        const q = b.length < 5 || value > b[b.length - 1].value
        setQualifies(q)
      }
    })
  }, [mode, value, active])

  const handleSubmit = useCallback(async () => {
    if (!nameInput.trim() || submitting) return
    setSubmitting(true)
    const rank = await submitScore(mode, value, nameInput.trim())
    setSubmittedRank(rank)
    setQualifies(false)
    const updated = await fetchLeaderboard(mode)
    setBoard(updated)
    setSubmitting(false)
  }, [mode, value, nameInput, submitting])

  return { board, qualifies, submittedRank, nameInput, setNameInput, submitting, handleSubmit }
}

function LeaderboardSection({ mode, value, personalBest, personalLabel, active }: {
  mode: string; value: number; personalBest: number; personalLabel: string; active: boolean
}) {
  const { board, qualifies, submittedRank, nameInput, setNameInput, submitting, handleSubmit } = useLeaderboard(mode, value, active)
  const isNewPersonal = value > 0 && value >= personalBest
  const MEDALS = ['🥇', '🥈', '🥉']

  if (!active) return null

  return (
    <div className="w-full max-w-[280px] text-center space-y-2 mb-4">
      {/* Personal record */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-gray-400 text-sm">שיא אישי:</span>
        <span className="text-white text-sm font-bold">{personalBest > 0 ? `${personalBest} ${personalLabel}` : '—'}</span>
        {isNewPersonal && <span className="text-yellow-400 text-xs font-bold">!שיא חדש</span>}
      </div>

      {/* All-time #1 */}
      {board.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-400 text-sm">שיא כל הזמנים:</span>
          <span className="text-accent text-sm font-bold">{board[0].value} {personalLabel}</span>
        </div>
      )}

      {/* Name input when qualifying */}
      {qualifies && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-accent/20 border border-accent/40 rounded-xl p-3 space-y-2">
          <p className="text-accent font-bold text-sm">!נכנסת לטבלת השיאים</p>
          <div className="flex gap-2" dir="rtl">
            <input type="text" maxLength={10} value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="הכנס שם"
              className="flex-1 px-3 py-2 rounded-lg bg-bg border border-gray-600 text-white text-center text-sm outline-none focus:border-accent" autoFocus />
            <button onClick={handleSubmit} disabled={submitting || !nameInput.trim()}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-bold disabled:opacity-50">
              {submitting ? '...' : 'שמור'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Top 5 table */}
      {board.length > 0 && (
        <div className="space-y-1">
          {board.map((entry, i) => (
            <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
              submittedRank === i ? 'bg-accent/20 border border-accent/40' : 'bg-tile/50'
            }`}>
              <div className="flex items-center gap-2">
                <span>{i < 3 ? MEDALS[i] : `${i + 1}.`}</span>
                <span className="text-white">{entry.name}</span>
              </div>
              <span className="text-gray-300 font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Result Screen — Perfect Fit / Loss ───
function ResultScreen() {
  const status = useGameStore((s) => s.status)
  const score = useGameStore((s) => s.score)
  const timeLeft = useGameStore((s) => s.timeLeft)
  const filledWords = useGameStore((s) => s.filledWords)
  const mode = useGameStore((s) => s.mode)
  const stage = useGameStore((s) => s.stage)
  const startGame = useGameStore((s) => s.startGame)
  const goHome = useGameStore((s) => s.goHome)
  const bestScoreRush = useGameStore((s) => s.bestScoreRush)

  const isWin = status === 'won'
  const isNewBest = score > 0 && score >= bestScoreRush

  if (status !== 'won' && status !== 'lost') return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 flex flex-col items-center z-50 px-5 overflow-y-auto py-6"
    >
      <SceneBackground />
      {isWin && <Confetti count={70} seed={11} />}
      {isWin && (
        <div className="absolute sunburst-coral pointer-events-none"
          style={{ top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600 }} />
      )}

      <div className="relative flex flex-col items-center w-full max-w-[340px] gap-3 mt-2">
        {isWin ? (
          <>
            {/* 5 stars */}
            <motion.div className="flex gap-1.5"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Icon.Star key={i} size={i === 3 ? 26 : 20} />
              ))}
            </motion.div>

            {/* PERFECT */}
            <div className="chrome-text" style={{
              fontFamily: 'Sora', fontSize: 48, lineHeight: 0.9, letterSpacing: 0,
              fontWeight: 900, direction: 'ltr', whiteSpace: 'nowrap', marginBottom: -6,
            }}>PERFECT</div>

            {/* FIT! */}
            <div className="gold-text" style={{
              fontFamily: 'Sora', fontSize: 92, lineHeight: 0.9, letterSpacing: '-0.03em',
              fontWeight: 900, direction: 'ltr', whiteSpace: 'nowrap', marginBottom: 6,
            }}>FIT!</div>

            {/* Hebrew subtitle */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-heebo font-black text-white text-center"
              style={{ fontSize: 22, textShadow: '0 0 14px rgba(251,113,133,0.7), 0 2px 4px rgba(0,0,0,0.6)' }}>
              !השורה מולאה במדויק
            </motion.div>

            {/* FINAL SCORE */}
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex flex-col items-center mt-2">
              <div style={{ fontFamily: 'Sora', fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: '0.16em' }}>FINAL SCORE</div>
              <div className="gold-text num" style={{ fontSize: 58, lineHeight: 1 }}>{score.toLocaleString()}</div>
            </motion.div>

            {timeLeft > 0 && (
              <p className="text-xs text-white/50">+{timeLeft} שניות נותרו</p>
            )}

            {isNewBest && (
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.85, type: 'spring', stiffness: 300, damping: 16 }}
                className="pb-pill mt-1">
                <Icon.Trophy size={14} />
                <span>NEW PERSONAL BEST</span>
              </motion.div>
            )}
          </>
        ) : (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 14 }}
              className="text-6xl mb-1">😔</motion.div>
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="text-2xl font-black text-white/85 mb-1">
              {`סיום בשלב ${stage}`}
            </motion.h1>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center">
              <div style={{ fontFamily: 'Sora', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: '0.16em' }}>FINAL SCORE</div>
              <div className="gold-text num" style={{ fontSize: 48, lineHeight: 1 }}>{score.toLocaleString()}</div>
            </motion.div>
            {filledWords.length > 0 && (
              <p className="text-xs text-white/50 text-center max-w-[260px]">{filledWords.slice(-6).join(' • ')}</p>
            )}
            {isNewBest && score > 0 && (
              <div className="pb-pill mt-1">
                <Icon.Trophy size={14} />
                <span>NEW PERSONAL BEST</span>
              </div>
            )}
          </>
        )}

        <div className="w-full mt-3">
          <LeaderboardSection mode={mode} value={score} personalBest={bestScoreRush}
            personalLabel="נק׳" active={status === 'won' || status === 'lost'} />
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: isWin ? 1 : 0.5 }}
          className="flex flex-col gap-2.5 w-full max-w-[280px]">
          <button onClick={() => startGame(mode)} className={`btn-3d ${isWin ? 'success' : ''} shine w-full`}>
            <Icon.Lightning size={18} />
            <span>שחק שוב</span>
          </button>
          <div className="flex gap-2">
            <button onClick={goHome} className="btn-3d ghost flex-1">תפריט</button>
            <button className="btn-3d ghost flex-1">שתף 📤</button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Grid Mode Components ───

const DIR_ARROWS: Record<Direction, string> = { right: '←', down: '↓', left: '→', up: '↑' }

// Pixel configs precomputed once (stable across re-renders — no random() during animation)
function makePixelConfigs(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const baseAngle = (i / count) * Math.PI * 2
    const angle = baseAngle + (Math.random() * 0.7 - 0.35)
    const dist = 22 + Math.random() * 38
    const pSize = 3 + Math.floor(Math.random() * 4)
    const delay = Math.random() * 0.07
    const duration = 0.3 + Math.random() * 0.15
    return { angle, dist, pSize, delay, duration }
  })
}

function ExplodingCell({ size }: { size: number }) {
  // Stable pixel configs — computed once on mount
  const pixels = useMemo(() => makePixelConfigs(12), [])
  return (
    <div className="relative" style={{ width: size, height: size, overflow: 'visible', zIndex: 50 }}>
      {/* Cell: flash white then shrink away */}
      <motion.div
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: [1, 1.15, 0.6], opacity: [1, 1, 0] }}
        transition={{ duration: 0.28, ease: 'easeOut', times: [0, 0.12, 1] }}
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ background: 'white' }}
      />
      {/* Pixel particles — white squares scattering outward */}
      {pixels.map(({ angle, dist, pSize, delay, duration }, i) => (
        <motion.div
          key={i}
          initial={{ x: size / 2 - pSize / 2, y: size / 2 - pSize / 2, opacity: 1, scale: 1 }}
          animate={{ x: size / 2 - pSize / 2 + Math.cos(angle) * dist, y: size / 2 - pSize / 2 + Math.sin(angle) * dist, opacity: 0, scale: 0.4 }}
          transition={{ duration, ease: 'easeOut', delay }}
          className="absolute pointer-events-none"
          style={{ width: pSize, height: pSize, background: 'white', borderRadius: 1 }}
        />
      ))}
    </div>
  )
}

function GridBoard() {
  const grid = useGridStore((s) => s.grid)
  const gridRows = useGridStore((s) => s.gridRows)
  const gridCols = useGridStore((s) => s.gridCols)
  const selectedCell = useGridStore((s) => s.selectedCell)
  const direction = useGridStore((s) => s.direction)
  const selectCell = useGridStore((s) => s.selectCell)
  const status = useGridStore((s) => s.status)
  const explodingCells = useGridStore((s) => s.explodingCells)
  const explodingSet = new Set(explodingCells)

  if (status !== 'playing') return null

  // Fit grid to screen: consider both width and available height
  // Reserve ~280px for top bar + feedback + word builder + tiles + padding
  const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 280 : 400
  const maxByWidth = Math.floor((340 - (gridCols - 1) * 4) / gridCols)
  const maxByHeight = Math.floor((availableHeight - (gridRows - 1) * 4) / gridRows)
  const cellSize = Math.min(maxByWidth, maxByHeight, 56)


  return (
    // Outer div: padding + centering. Inner div: relative positioning that exactly wraps the rows.
    <div className={`flex flex-col items-center px-3 py-2${explodingCells.length > 0 ? ' explosion-shake' : ''}`}>
      <div className="relative flex flex-col gap-1">
        {grid.map((row, r) => (
          <div key={r} className="flex flex-row-reverse gap-1">
            {row.map((cell, c) => {
              const isExploding = explodingSet.has(`${r},${c}`)
              if (isExploding) {
                // Render ExplodingCell in-place — position is inherently correct, no coordinate math needed
                return (
                  <div key={`${r}-${c}`} style={{ width: cellSize, height: cellSize, position: 'relative', overflow: 'visible', zIndex: 50 }}>
                    <ExplodingCell size={cellSize} />
                  </div>
                )
              }
              if (!cell.active) {
                // Inactive cell — invisible spacer
                return <div key={`${r}-${c}`} style={{ width: cellSize, height: cellSize }} />
              }
              // Blocked cell — dark distinct fill, not interactive
              if (cell.blocked) {
                return (
                  <div
                    key={`${r}-${c}`}
                    className="rounded-lg bg-gray-900/80 border-2 border-gray-800/30 flex items-center justify-center"
                    style={{ width: cellSize, height: cellSize }}
                    title="משבצת חסומה"
                  >
                    <span className="text-gray-700 text-[10px]">✕</span>
                  </div>
                )
              }
              const isSelected = selectedCell?.row === r && selectedCell?.col === c
              return (
                <motion.button
                  key={`${r}-${c}`}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => selectCell(r, c)}
                  className={`rounded-lg flex items-center justify-center font-bold text-sm transition-all duration-150
                    ${cell.filled
                      ? 'bg-white text-bg border-2 border-white/80'
                      : isSelected
                        ? 'bg-accent/40 border-2 border-accent text-white'
                        : 'bg-gray-800/60 border-2 border-gray-700/40 text-gray-500'
                    }`}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {cell.filled ? '' : isSelected ? (
                    <span className="text-white text-2xl font-black drop-shadow-[0_0_6px_rgba(124,58,237,0.8)]">{DIR_ARROWS[direction]}</span>
                  ) : ''}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function GridTopBar() {
  const [showLeave, setShowLeave] = useState(false)
  const timeLeft = useGridStore((s) => s.timeLeft)
  const score = useGridStore((s) => s.score)
  const stage = useGridStore((s) => s.stage)
  const grid = useGridStore((s) => s.grid)
  const muted = useGridStore((s) => s.muted)
  const toggleMute = useGridStore((s) => s.toggleMute)
  const goHome = useGridStore((s) => s.goHome)

  const activeCells = grid.flat().filter((c) => c.active && !c.blocked)
  const totalCells = activeCells.length
  const filledCells = activeCells.filter((c) => c.filled).length
  const isLow = timeLeft <= 15

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <TimerRing time={timeLeft} totalTime={120} low={isLow} />
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="stage-badge">
            <Icon.Crown size={14} />
            <span>שלב {stage}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <motion.span key={score}
              initial={{ scale: 1.4 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className="score-gold num" style={{ fontSize: 26, lineHeight: 1 }}>
              {score.toLocaleString()}
            </motion.span>
            <span className="text-[10px] font-bold text-white/50">נק'</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="hud-pill" style={{ padding: '4px 10px 4px 4px' }}>
            <div className="ico" style={{ width: 22, height: 22, fontSize: 10 }}>
              <span className="num" style={{ fontWeight: 900 }}>{filledCells}/{totalCells}</span>
            </div>
          </div>
          <button onClick={() => { toggleMute(); playMuteToggle(useGridStore.getState().muted) }} className="w-8 h-8 flex items-center justify-center text-white/60" aria-label={muted ? 'בטל השתקה' : 'השתק'}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button onClick={() => setShowLeave(true)} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-error text-sm" aria-label="יציאה">✕</button>
        </div>
      </div>
      <AnimatePresence>
        {showLeave && <LeaveConfirm onConfirm={() => { setShowLeave(false); goHome() }} onCancel={() => setShowLeave(false)} />}
      </AnimatePresence>
    </div>
  )
}

function GridWordBuilder() {
  const currentWord = useGridStore((s) => s.currentWord)
  const clearWord = useGridStore((s) => s.clearWord)
  const submitWord = useGridStore((s) => s.submitWord)
  const undoLastWord = useGridStore((s) => s.undoLastWord)
  const shuffleLetters = useGridStore((s) => s.shuffleLetters)
  const placedWords = useGridStore((s) => s.placedWords)
  const selectedCell = useGridStore((s) => s.selectedCell)
  const score = useGridStore((s) => s.score)
  const status = useGridStore((s) => s.status)
  const muted = useGridStore((s) => s.muted)

  if (status !== 'playing') return null

  const handleSubmit = () => {
    const prev = useGridStore.getState().score
    submitWord()
    const next = useGridStore.getState()
    if (next.explodingCells.length > 0) {
      // Explosion animation running — boom now; stage_clear fanfare fires via useGridTimer effect
      playExplosion(muted)
    } else if (next.status === 'stage_clear') {
      // Fanfare fires via useGridTimer effect — skip validWord to avoid double sound
    } else if (next.score > prev) {
      playValidWord(muted)
    } else if (next.feedback?.type === 'error') {
      playInvalidWord(muted)
    }
  }

  return (
    <div className="builder">
      {!selectedCell && (
        <p className="text-center text-white/50 text-sm py-2">בחר משבצת ברשת</p>
      )}
      {selectedCell && (
        <div className="flex items-center gap-2.5">
          <button onClick={clearWord} className="builder-btn clear" aria-label="מחק">✕</button>
          <div className={`builder-display flex-1${currentWord ? '' : ' empty'}`}>
            {currentWord || 'הקש על אותיות'}
          </div>
          <button onClick={handleSubmit} disabled={!currentWord}
            className={`builder-btn submit${!currentWord ? ' dim' : ''}`} aria-label="שלח">✓</button>
        </div>
      )}
      {!currentWord && (
        <div className="flex gap-1.5 mt-2">
          {placedWords.length > 0 && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }}
              onClick={undoLastWord} className="builder-tool">
              ↶ ביטול ({placedWords[placedWords.length - 1].word})
            </motion.button>
          )}
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }}
            onClick={shuffleLetters}
            className={`builder-tool gold ${placedWords.length > 0 ? '' : 'flex-1'}`}
            style={score < 50 ? { opacity: 0.5 } : {}}>
            🔀 ערבוב (50-)
          </motion.button>
        </div>
      )}
    </div>
  )
}

function GridLetterTiles() {
  const letters = useGridStore((s) => s.letters)
  const addLetterByIndex = useGridStore((s) => s.addLetterByIndex)
  const usedTileIndices = useGridStore((s) => s.usedTileIndices)
  const status = useGridStore((s) => s.status)
  const muted = useGridStore((s) => s.muted)

  if (status !== 'playing') return null

  return (
    <div className="px-4 py-2 shrink-0">
      <div className="flex flex-wrap justify-center gap-2 max-w-[360px] mx-auto">
        {letters.map((letter, i) => {
          const isUsed = usedTileIndices.includes(i)
          return (
            <button key={`${letter}-${i}`}
              onClick={() => { if (!isUsed) { addLetterByIndex(i); playTileTap(muted) } }}
              disabled={isUsed}
              className={`tile${isUsed ? ' used' : ''}`}>
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GridFeedbackBar() {
  const feedback = useGridStore((s) => s.feedback)
  // Hide text feedback when WOW — the overlay handles that visually
  const isWow = feedback?.text?.includes('וואו') ?? false
  return (
    <div className="h-12 flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {feedback && !isWow && (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: [0.6, 1.12, 1], y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="px-5 py-1.5 font-black text-xl tracking-widest"
            style={{
              background: 'rgba(0,0,0,0.82)',
              color: feedback.type === 'error' ? '#ef4444' : feedback.type === 'warning' ? '#facc15' : '#ffffff',
              textShadow: feedback.type === 'success'
                ? '0 0 8px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,220,100,0.3)'
                : 'none',
            }}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function WowOverlay() {
  const feedback = useGridStore((s) => s.feedback)
  const muted = useGridStore((s) => s.muted)
  const [visible, setVisible] = useState(false)
  const [bonusValue, setBonusValue] = useState<number | null>(null)
  const lastWowText = useRef<string | null>(null)

  useEffect(() => {
    if (feedback?.text?.includes('וואו') && feedback.text !== lastWowText.current) {
      lastWowText.current = feedback.text
      // Try to extract the +N number from the feedback text
      const match = feedback.text.match(/\+(\d+)/)
      setBonusValue(match ? parseInt(match[1], 10) : null)
      setVisible(true)
      if (!muted) {
        new Audio('/sounds/wow.wav').play().catch(() => {})
      }
      const t = setTimeout(() => setVisible(false), 1800)
      return () => clearTimeout(t)
    }
  }, [feedback?.text, muted])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="wow-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 9000 }}
        >
          {/* Burst behind */}
          <div style={{ position: 'absolute', display: 'grid', placeItems: 'center' }}>
            <BurstRays size={360} />
          </div>

          {/* WOW! chrome lockup */}
          <div className="flex flex-col items-center" style={{ marginTop: -20 }}>
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.25, 0.92, 1.06, 1], opacity: 1 }}
              transition={{ duration: 0.55, times: [0, 0.35, 0.55, 0.75, 1], ease: 'easeOut' }}
              className="chrome-text"
              style={{
                fontFamily: 'Sora', fontSize: 110, lineHeight: 0.9, letterSpacing: '-0.04em',
                fontWeight: 900, direction: 'ltr',
              }}>
              WOW!
            </motion.div>
            {bonusValue !== null && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.18, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ marginTop: 12 }}>
                <div style={{
                  padding: '8px 22px', borderRadius: 14,
                  background: 'linear-gradient(180deg,#1a0510,#2e0a1f)',
                  border: '2px solid rgba(255,255,255,0.22)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                  direction: 'ltr',
                }}>
                  <div className="gold-text" style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em' }}>
                    +{bonusValue} POINTS!
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function GridResultScreen() {
  const status = useGridStore((s) => s.status)
  const score = useGridStore((s) => s.score)
  const stage = useGridStore((s) => s.stage)
  const placedWords = useGridStore((s) => s.placedWords)
  const startGrid = useGridStore((s) => s.startGrid)
  const nextGridStage = useGridStore((s) => s.nextGridStage)
  const goHome = useGridStore((s) => s.goHome)
  const difficulty = useGridStore((s) => s.difficulty)
  const bestStageGrid = useGridStore((s) => s.bestStageGrid)
  const bestScoreShapes = useGridStore((s) => s.bestScoreShapes)
  const bestScoreShapesV2 = useGridStore((s) => s.bestScoreShapesV2)

  const isShapes = difficulty === 'shapes'
  const isShapesV2 = difficulty === 'shapes_v2'
  const lbMode = isShapesV2 ? 'shapes_v2' : isShapes ? 'shapes' : 'grid'
  const lbBest = isShapesV2 ? bestScoreShapesV2 : isShapes ? bestScoreShapes : bestStageGrid

  if (status === 'stage_clear') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6 overflow-hidden">
        <SceneBackground />
        <Confetti count={50} seed={stage} />
        <div className="absolute sunburst-gold pointer-events-none"
          style={{ top: '12%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500 }} />

        <div className="relative flex flex-col items-center gap-3 max-w-[320px]">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 12 }}>
            <Icon.Crown size={88} />
          </motion.div>

          <motion.div className="stage-banner"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}>
            STAGE COMPLETE
          </motion.div>

          <div className="gold-text inline-flex items-baseline" style={{ fontSize: 64, lineHeight: 0.9, gap: 12, flexDirection: 'row-reverse' }}>
            <span style={{ fontFamily: 'Heebo' }}>שלב</span>
            <span style={{ fontFamily: 'Sora' }}>{stage}</span>
          </div>

          <div className="flex gap-1 mb-2">
            {[1, 2, 3].map((i) => (
              <motion.div key={i}
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5 + i * 0.12, type: 'spring', stiffness: 300, damping: 14 }}
                style={{ transform: i === 2 ? 'translateY(-6px)' : undefined }}>
                <Icon.Star size={i === 2 ? 50 : 42} />
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="w-full p-4 rounded-2xl border border-white/10"
            style={{
              background: 'linear-gradient(180deg, rgba(15,8,30,0.85), rgba(10,4,20,0.85))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.5)',
            }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/55 font-bold">ניקוד שלב</span>
              <span className="num font-sora font-black text-2xl" style={{ color: '#ffe27a' }}>{score.toLocaleString()}</span>
            </div>
            {placedWords.length > 0 && (
              <p className="text-xs text-white/50 text-center mt-2">{placedWords.slice(-6).map((p) => p.word).join(' • ')}</p>
            )}
          </motion.div>

          <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            onClick={nextGridStage}
            className="btn-3d gold shine w-full max-w-[280px] mt-2"
            style={{ fontSize: 19 }}>
            <span>שלב {stage + 1}</span>
            <span style={{ fontSize: 22, marginRight: 4 }}>‹</span>
          </motion.button>
        </div>
      </motion.div>
    )
  }

  if (status === 'lost') {
    const lbValue = (isShapes || isShapesV2) ? score : stage
    const isNewBest = lbValue > 0 && lbValue >= lbBest

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 flex flex-col items-center z-50 px-5 py-6 overflow-y-auto">
        <SceneBackground />

        <div className="relative flex flex-col items-center gap-3 w-full max-w-[340px]">
          <motion.div initial={{ scale: 1.5 }} animate={{ scale: 1, rotate: [0, -5, 5, -3, 0] }}
            transition={{ duration: 0.5 }} className="text-6xl mt-2">💔</motion.div>
          <h1 className="text-2xl font-black text-white/85">נגמר הזמן</h1>
          <div className="flex flex-col items-center">
            <div style={{ fontFamily: 'Sora', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: '0.16em' }}>FINAL SCORE</div>
            <div className="gold-text num" style={{ fontSize: 48, lineHeight: 1 }}>{score.toLocaleString()}</div>
          </div>
          <p className="text-sm text-white/55">הגעת לשלב {stage}</p>

          {isNewBest && lbValue > 0 && (
            <div className="pb-pill">
              <Icon.Trophy size={14} />
              <span>NEW PERSONAL BEST</span>
            </div>
          )}

          <div className="w-full mt-2">
            <LeaderboardSection mode={lbMode} value={lbValue} personalBest={lbBest}
              personalLabel={(isShapes || isShapesV2) ? 'נק׳' : 'שלב'} active={true} />
          </div>

          <div className="flex flex-col gap-2.5 w-full max-w-[280px] mt-2">
            <button onClick={() => startGrid(difficulty)} className="btn-3d shine w-full">
              <Icon.Lightning size={18} />
              <span>שחק שוב</span>
            </button>
            <button onClick={goHome} className="btn-3d ghost w-full">תפריט ראשי</button>
          </div>
        </div>
      </motion.div>
    )
  }

  return null
}

function useGridTimer() {
  const tick = useGridStore((s) => s.tick)
  const status = useGridStore((s) => s.status)
  const timeLeft = useGridStore((s) => s.timeLeft)
  const muted = useGridStore((s) => s.muted)
  const ref = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (status === 'playing') {
      ref.current = setInterval(tick, 1000)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [status, tick])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (ref.current) { clearInterval(ref.current); ref.current = null }
      } else {
        const s = useGridStore.getState().status
        if (s === 'playing') ref.current = setInterval(tick, 1000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [tick])

  useEffect(() => {
    if (status === 'playing' && timeLeft > 0 && timeLeft <= 10) {
      playTimerWarning(muted)
    }
  }, [timeLeft, status, muted])

  // Play stage-clear fanfare when status transitions from playing → stage_clear
  // (covers both regular grid fill and delayed explosion stage clear)
  const prevStatusRef = useRef<string>('')
  useEffect(() => {
    if (status === 'stage_clear' && prevStatusRef.current === 'playing') {
      playPerfectFit(muted)
    }
    prevStatusRef.current = status
  }, [status, muted])
}


function GridGame() {
  useGridTimer()

  return (
    <>
      <GridTopBar />
      <GridBoard />
      <GridFeedbackBar />
      <WowOverlay />
      <div className="flex-1 min-h-2" />
      <div className="shrink-0 pb-safe">
        <GridWordBuilder />
        <div className="h-2" />
        <GridLetterTiles />
        <div className="h-2" />
      </div>
      <AnimatePresence>
        <GridResultScreen />
      </AnimatePresence>
    </>
  )
}

// ─── Multiplayer Components ───

const MODE_NAMES: Record<string, string> = { quick: 'משחק מהיר', endless: 'אינסוף', score_rush: 'ריצת ניקוד', grid: 'מלא את הרשת' }

function MultiplayerLobby() {
  const startMatch = useMultiplayerStore((s) => s.startMatch)
  const leaveGame = useMultiplayerStore((s) => s.leaveGame)
  const setPlayerName = useMultiplayerStore((s) => s.setPlayerName)
  const toggleReady = useMultiplayerStore((s) => s.toggleReady)
  const roomCode = useMultiplayerStore((s) => s.roomCode)
  const players = useMultiplayerStore((s) => s.players)
  const playerId = useMultiplayerStore((s) => s.playerId)
  const playerName = useMultiplayerStore((s) => s.playerName)
  const isHost = useMultiplayerStore((s) => s.isHost)
  const status = useMultiplayerStore((s) => s.status)
  const gameMode = useMultiplayerStore((s) => s.gameMode)
  const maxPlayers = useMultiplayerStore((s) => s.maxPlayers)

  const allReady = players.length >= 2 && players.every((p) => p.ready)
  const myReady = players.find((p) => p.id === playerId)?.ready ?? false

  if (status === 'creating' || status === 'joining') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6">
        <SceneBackground />
        <div className="relative">
          <div className="gold-text text-2xl animate-pulse">...מתחבר</div>
        </div>
      </div>
    )
  }

  if (status !== 'waiting' && status !== 'lobby') return null

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6 overflow-y-auto py-8">
      <SceneBackground />
      <div className="relative flex flex-col items-center w-full max-w-[320px]">
        <h2 className="gold-text" style={{ fontSize: 30, lineHeight: 1, marginBottom: 4 }}>חדר משחק</h2>
        <p className="text-white/55 text-sm mb-4">{MODE_NAMES[gameMode] || gameMode}</p>

        <div className="mb-5 text-center">
          <p className="text-white/55 text-xs mb-1 font-bold tracking-wider">:קוד חדר</p>
          <div className="num" style={{
            fontFamily: 'Sora', fontWeight: 900, fontSize: 48,
            background: 'linear-gradient(180deg, #fff 0%, #ffe27a 60%, #f5b942 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            letterSpacing: '0.3em', lineHeight: 1,
            filter: 'drop-shadow(0 1px 0 #c47b14) drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
          }}>{roomCode}</div>
          <p className="text-white/40 text-xs mt-1">שתפו את הקוד עם חברים</p>
        </div>

        <input
          type="text" value={playerName}
          onChange={(e) => setPlayerName(e.target.value.slice(0, 12))}
          placeholder="השם שלך" maxLength={12}
          className="w-full text-center text-lg font-bold rounded-xl py-2 px-3 text-white placeholder-white/30 outline-none mb-3"
          style={{
            background: 'rgba(15, 8, 30, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
          }}
        />

        <p className="text-white/55 text-xs mb-2 self-stretch text-right font-bold">
          {players.length}/{maxPlayers} :שחקנים
        </p>
        <div className="w-full space-y-1.5 mb-4">
          {players.map((p, i) => {
            const isMe = p.id === playerId
            return (
              <motion.div key={p.id}
                initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between px-3.5 py-2 rounded-xl"
                style={{
                  background: p.ready ? 'rgba(34,197,94,0.1)' : 'rgba(15,8,30,0.6)',
                  border: `1px solid ${p.ready ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${p.ready ? 'text-success' : 'text-white/40'}`}>{p.ready ? '✓' : '○'}</span>
                  <span className="text-white text-sm font-bold">{p.name}</span>
                  {i === 0 && <Icon.Crown size={14} />}
                </div>
                {isMe && (
                  <button onClick={toggleReady}
                    className="text-xs px-3 py-1 rounded-full font-black"
                    style={p.ready
                      ? { background: 'rgba(74,222,128,0.2)', color: '#86efac', border: '1px solid rgba(74,222,128,0.4)' }
                      : { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.16)' }}>
                    {p.ready ? '!מוכן' : 'מוכן?'}
                  </button>
                )}
              </motion.div>
            )
          })}
          {players.length < maxPlayers && (
            <div className="flex items-center justify-center px-3.5 py-2 rounded-xl border border-dashed border-white/10">
              <span className="text-white/35 text-xs animate-pulse">...ממתין לשחקנים</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          {isHost && (
            <button onClick={allReady ? startMatch : undefined}
              disabled={!allReady}
              className={`btn-3d ${allReady ? 'success shine' : ''} w-full`}>
              {allReady ? <><Icon.Lightning size={18} /><span>!התחל משחק</span></> : <span>...ממתינים שכולם יהיו מוכנים</span>}
            </button>
          )}
          {!isHost && !myReady && (
            <p className="text-center text-white/45 text-sm">לחץ &quot;?מוכן&quot; כשאתה מוכן</p>
          )}
          <button onClick={leaveGame} className="btn-3d ghost w-full">יציאה</button>
        </div>
      </div>
    </div>
  )
}

function MultiplayerCountdown() {
  const countdownValue = useMultiplayerStore((s) => s.countdownValue)
  const status = useMultiplayerStore((s) => s.status)

  if (status !== 'countdown' || countdownValue === null) return null

  return (
    <motion.div className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ background: 'rgba(10,4,16,0.92)', backdropFilter: 'blur(8px)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={countdownValue}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={countdownValue === 0 ? 'gold-text' : 'chrome-text'}
          style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 130, lineHeight: 1, direction: 'ltr' }}
        >
          {countdownValue === 0 ? 'GO!' : countdownValue}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

function MultiplayerOpponentBars() {
  const players = useMultiplayerStore((s) => s.players)
  const playerId = useMultiplayerStore((s) => s.playerId)
  const targetLength = useMultiplayerStore((s) => s.targetLength)
  const status = useMultiplayerStore((s) => s.status)

  if (status !== 'playing' && status !== 'finished') return null
  const opponents = players.filter((p) => p.id !== playerId)
  if (opponents.length === 0) return null

  return (
    <div className="px-3 py-1 space-y-1">
      {opponents.map((opp) => (
        <div key={opp.id} className="flex items-center gap-2 text-xs">
          <span className="text-amber-400 w-12 truncate">{opp.name}</span>
          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${opp.perfectFit ? 'bg-success' : 'bg-amber-400/60'}`}
              animate={{ width: `${Math.min(100, (opp.filledLength / targetLength) * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-amber-400 w-10 text-left tabular-nums">{opp.score}</span>
          {opp.finished && <span className="text-success">✓</span>}
        </div>
      ))}
    </div>
  )
}

function MultiplayerTopBar() {
  const timeLeft = useMultiplayerStore((s) => s.timeLeft)
  const mpScore = useMultiplayerStore((s) => s.score)
  const targetLength = useMultiplayerStore((s) => s.targetLength)
  const filledWords = useMultiplayerStore((s) => s.filledWords)
  const muted = useMultiplayerStore((s) => s.muted)
  const toggleMute = useMultiplayerStore((s) => s.toggleMute)
  const showLeaveConfirm = useMultiplayerStore((s) => s.showLeaveConfirm)
  const setShowLeaveConfirm = useMultiplayerStore((s) => s.setShowLeaveConfirm)
  const leaveGame = useMultiplayerStore((s) => s.leaveGame)
  const stage = useMultiplayerStore((s) => s.stage)
  const maxLevels = useMultiplayerStore((s) => s.maxLevels)
  const gameMode = useMultiplayerStore((s) => s.gameMode)

  const score = mpScore
  const filledLen = filledWords.reduce((s, w) => s + w.length, 0)
  const remaining = Math.max(0, targetLength - filledLen)
  const isLow = timeLeft <= 15

  // Pick the right side-indicator per mode:
  // - quick/endless (row): "remaining slots"
  // - score_rush: total words played
  // - grid/shapes/shapes_v2: nothing (the grid itself shows progress)
  const isRowMode = gameMode === 'quick' || gameMode === 'endless'
  const isScoreRush = gameMode === 'score_rush'

  const stageLabel = isScoreRush
    ? 'ריצת ניקוד'
    : maxLevels > 0 ? `${stage}/${maxLevels}` : `שלב ${stage}`

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <TimerRing time={timeLeft} totalTime={90} low={isLow} />
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="stage-badge">
            {isScoreRush ? <Icon.Lightning size={12} /> : <Icon.Crown size={14} />}
            <span>{stageLabel}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <motion.span key={score}
              initial={{ scale: 1.4 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className="score-gold num" style={{ fontSize: 26, lineHeight: 1 }}>
              {score.toLocaleString()}
            </motion.span>
            <span className="text-[10px] font-bold text-white/50">נק'</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isRowMode && (
            <div className="hud-pill" style={{ padding: '4px 10px 4px 4px' }}>
              <div className="ico" style={{ width: 22, height: 22, fontSize: 12 }}>
                <span className="num" style={{ fontWeight: 900 }}>{remaining}</span>
              </div>
            </div>
          )}
          {isScoreRush && (
            <div className="hud-pill" style={{ padding: '4px 10px 4px 4px' }}>
              <div className="ico" style={{ width: 22, height: 22, fontSize: 11 }}>
                <span className="num" style={{ fontWeight: 900 }}>{filledWords.length}</span>
              </div>
            </div>
          )}
          <button onClick={() => { toggleMute(); playMuteToggle(useMultiplayerStore.getState().muted) }} className="w-8 h-8 flex items-center justify-center text-white/60">{muted ? '🔇' : '🔊'}</button>
          <button onClick={() => setShowLeaveConfirm(true)} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-error text-sm">✕</button>
        </div>
      </div>
      <AnimatePresence>
        {showLeaveConfirm && <LeaveConfirm onConfirm={() => { setShowLeaveConfirm(false); leaveGame() }} onCancel={() => setShowLeaveConfirm(false)} />}
      </AnimatePresence>
    </div>
  )
}

function MultiplayerTargetRow() {
  const targetLength = useMultiplayerStore((s) => s.targetLength)
  const filledWords = useMultiplayerStore((s) => s.filledWords)

  const cells: { char: string; wordIdx: number }[] = []
  filledWords.forEach((word, wordIdx) => {
    for (const char of word) cells.push({ char, wordIdx })
  })
  const emptyCount = Math.max(0, targetLength - cells.length)
  const lastWordIdx = filledWords.length - 1

  return (
    <div className="px-3 py-3">
      <div className="row-rtl flex-wrap justify-center" style={{ gap: 4 }}>
        {cells.map((cell, i) => {
          const isLastWord = cell.wordIdx === lastWordIdx
          const wordStartIdx = cells.findIndex((c) => c.wordIdx === cell.wordIdx)
          const offsetInWord = i - wordStartIdx
          return (
            <div key={`f-${i}`}
              className={`slot filled${cell.wordIdx % 2 === 1 ? ' word-b' : ''}`}
              style={isLastWord
                ? { animation: 'drop-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards', animationDelay: `${offsetInWord * 0.05}s` }
                : undefined}>
              {cell.char}
            </div>
          )
        })}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`e-${i}`} className="slot" />
        ))}
      </div>
    </div>
  )
}

function MultiplayerWordBuilder() {
  const currentWord = useMultiplayerStore((s) => s.currentWord)
  const clearWord = useMultiplayerStore((s) => s.clearWord)
  const submitWord = useMultiplayerStore((s) => s.submitWord)
  const undoLastWord = useMultiplayerStore((s) => s.undoLastWord)
  const filledWords = useMultiplayerStore((s) => s.filledWords)
  const status = useMultiplayerStore((s) => s.status)
  const muted = useMultiplayerStore((s) => s.muted)

  if (status !== 'playing') return null

  const handleSubmit = () => {
    const prev = useMultiplayerStore.getState().score
    submitWord()
    const next = useMultiplayerStore.getState()
    if (next.status === 'finished') playPerfectFit(muted)
    else if (next.score > prev) playValidWord(muted)
    else if (next.feedback?.type === 'error') playInvalidWord(muted)
  }

  return (
    <div className="builder">
      <div className="flex items-center gap-2.5">
        <button onClick={clearWord} className="builder-btn clear" aria-label="מחק">✕</button>
        <div className={`builder-display flex-1${currentWord ? '' : ' empty'}`}>
          {currentWord || 'הקש על אותיות'}
        </div>
        <button onClick={handleSubmit} disabled={!currentWord}
          className={`builder-btn submit${!currentWord ? ' dim' : ''}`} aria-label="שלח">✓</button>
      </div>
      {filledWords.length > 0 && !currentWord && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }} onClick={undoLastWord}
          className="builder-tool w-full mt-2">
          ↶ הסר מילה אחרונה ({filledWords[filledWords.length - 1]})
        </motion.button>
      )}
    </div>
  )
}

function MultiplayerLetterTiles() {
  const letters = useMultiplayerStore((s) => s.letters)
  const addLetterByIndex = useMultiplayerStore((s) => s.addLetterByIndex)
  const usedTileIndices = useMultiplayerStore((s) => s.usedTileIndices)
  const status = useMultiplayerStore((s) => s.status)
  const muted = useMultiplayerStore((s) => s.muted)

  if (status !== 'playing') return null

  return (
    <div className="px-4 py-2 shrink-0">
      <div className="flex flex-wrap justify-center gap-2 max-w-[360px] mx-auto">
        {letters.map((letter, i) => {
          const isUsed = usedTileIndices.includes(i)
          return (
            <button key={`${letter}-${i}`}
              onClick={() => { if (!isUsed) { addLetterByIndex(i); playTileTap(muted) } }}
              disabled={isUsed}
              className={`tile${isUsed ? ' used' : ''}`}>
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MultiplayerFeedback() {
  const feedback = useMultiplayerStore((s) => s.feedback)
  return (
    <div className="h-8 flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div key={feedback.text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`text-sm font-medium ${feedback.type === 'success' ? 'text-success' : feedback.type === 'error' ? 'text-error' : feedback.type === 'warning' ? 'text-yellow-400' : 'text-accent'}`}>
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MultiplayerResults() {
  const status = useMultiplayerStore((s) => s.status)
  const players = useMultiplayerStore((s) => s.players)
  const playerId = useMultiplayerStore((s) => s.playerId)
  const score = useMultiplayerStore((s) => s.score)
  const filledWords = useMultiplayerStore((s) => s.filledWords)
  const targetLength = useMultiplayerStore((s) => s.targetLength)
  const stage = useMultiplayerStore((s) => s.stage)
  const maxLevels = useMultiplayerStore((s) => s.maxLevels)
  const isHost = useMultiplayerStore((s) => s.isHost)
  const nextRound = useMultiplayerStore((s) => s.nextRound)
  const leaveGame = useMultiplayerStore((s) => s.leaveGame)
  const [phase, setPhase] = useState<'waiting' | 'winner' | 'scoreboard' | 'final'>('waiting')
  const [countdown, setCountdown] = useState<number | null>(null)
  const autoTriggeredRef = useRef(false)

  const MEDALS = ['🥇', '🥈', '🥉']

  const isFinished = status === 'finished'
  const allFinished = isFinished && players.every((p) => p.finished || p.id === playerId)
  const myLen = isFinished ? filledWords.reduce((s, w) => s + w.length, 0) : 0

  const allPlayers = isFinished
    ? players.map((p) =>
        p.id === playerId ? { ...p, score, filledLength: myLen, finished: true } : p
      ).sort((a, b) => b.score - a.score)
    : []

  const winner = allPlayers[0] || null

  // Auto-advance: show winner → scoreboard with countdown → next round
  // ALL hooks must be called before any conditional return
  useEffect(() => {
    if (!isFinished) {
      // Reset when leaving finished state
      if (autoTriggeredRef.current) {
        autoTriggeredRef.current = false
        setPhase('waiting')
        setCountdown(null)
      }
      return
    }
    if (!allFinished || autoTriggeredRef.current) return
    autoTriggeredRef.current = true

    const isFinalLevel = maxLevels > 0 && stage >= maxLevels

    // Phase 1: Show winner for 2 seconds
    setPhase('winner')

    if (isFinalLevel) {
      // Final level — show winner then final scoreboard (no countdown, no next round)
      const t1 = setTimeout(() => setPhase('final'), 2000)
      return () => clearTimeout(t1)
    }

    // Phase 2: Show scoreboard + countdown 3-2-1
    const t1 = setTimeout(() => { setPhase('scoreboard'); setCountdown(3) }, 2000)
    const t2 = setTimeout(() => setCountdown(2), 3000)
    const t3 = setTimeout(() => setCountdown(1), 4000)
    const t4 = setTimeout(() => {
      setCountdown(null)
      if (isHost) nextRound()
    }, 5000)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [isFinished, allFinished, isHost, nextRound, maxLevels, stage])

  if (!isFinished) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6">
      <SceneBackground />
      {phase === 'final' && <Confetti count={50} seed={stage} />}

      <div className="relative w-full max-w-[320px] flex flex-col items-center">
        {phase === 'waiting' && !allFinished && (
          <div className="text-center">
            <div className="text-4xl mb-2">⏳</div>
            <p className="text-white/55 animate-pulse text-sm">...ממתין לשחקנים אחרים</p>
            <div className="gold-text num mt-4" style={{ fontSize: 36 }}>{score.toLocaleString()}</div>
          </div>
        )}

        {phase === 'winner' && winner && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 250, damping: 14 }}
            className="text-center flex flex-col items-center gap-2">
            <Icon.Crown size={88} />
            <div className="gold-text" style={{ fontSize: 32, lineHeight: 1.05 }}>!{winner.name} מוביל</div>
            <div className="num text-white/85 font-sora font-black" style={{ fontSize: 24 }}>{winner.score.toLocaleString()} נק'</div>
            <p className="text-white/55 text-xs mt-1">{maxLevels > 0 ? `שלב ${stage}/${maxLevels} הושלם` : `שלב ${stage} הושלם`}</p>
          </motion.div>
        )}

        {phase === 'scoreboard' && (
          <div className="text-center w-full">
            <div className="stage-badge mb-3">
              <Icon.Crown size={14} />
              <span>{maxLevels > 0 ? `שלב ${stage}/${maxLevels}` : `שלב ${stage}`}</span>
            </div>
            <h2 className="gold-text mb-4" style={{ fontSize: 24 }}>טבלת ניקוד</h2>

            <div className="w-full space-y-2 mb-4">
              {allPlayers.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                  style={{
                    background: p.id === playerId ? 'rgba(251,113,133,0.15)' : 'rgba(15,8,30,0.7)',
                    border: `1px solid ${p.id === playerId ? 'rgba(251,113,133,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg w-6">{i < 3 ? MEDALS[i] : `${i + 1}.`}</span>
                    <span className="text-white font-bold text-sm">{p.name}</span>
                    {p.id === playerId && <span className="text-[10px] text-accent font-black">(אתה)</span>}
                  </div>
                  <span className="num font-sora font-black text-white">{p.score.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>

            {countdown !== null && (
              <motion.div key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="gold-text num"
                style={{ fontSize: 80, lineHeight: 1, fontFamily: 'Sora', fontWeight: 900 }}>
                {countdown}
              </motion.div>
            )}
          </div>
        )}

        {phase === 'final' && (
          <div className="text-center w-full">
            <div className="flex flex-col items-center mb-3">
              <Icon.Trophy size={56} />
            </div>
            <div className="gold-text mb-1" style={{ fontSize: 28 }}>!המשחק נגמר</div>
            <p className="text-white/55 text-sm mb-4">{maxLevels} שלבים הושלמו</p>

            <div className="w-full space-y-2 mb-4">
              {allPlayers.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.12 }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{
                    background: i === 0
                      ? 'linear-gradient(180deg, rgba(245,185,66,0.2), rgba(196,123,20,0.12))'
                      : p.id === playerId ? 'rgba(251,113,133,0.15)' : 'rgba(15,8,30,0.7)',
                    border: i === 0
                      ? '1px solid rgba(245,185,66,0.5)'
                      : `1px solid ${p.id === playerId ? 'rgba(251,113,133,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg w-6">{i < 3 ? MEDALS[i] : `${i + 1}.`}</span>
                    <span className="text-white font-bold text-sm">{p.name}</span>
                    {p.id === playerId && <span className="text-[10px] text-accent font-black">(אתה)</span>}
                  </div>
                  <span className="num font-sora font-black text-white">{p.score.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <button onClick={leaveGame} className="btn-3d ghost mt-3">יציאה</button>
      </div>
    </motion.div>
  )
}

function useMultiplayerTimer() {
  const tick = useMultiplayerStore((s) => s.tick)
  const status = useMultiplayerStore((s) => s.status)
  const ref = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (status === 'playing') {
      ref.current = setInterval(tick, 1000)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [status, tick])
}

// Bridge: initializes grid store with multiplayer shared letters, runs grid timer, syncs completion
function MultiplayerGridBridge() {
  const mpStatus = useMultiplayerStore((s) => s.status)
  const mpLetters = useMultiplayerStore((s) => s.letters)
  const mpGameMode = useMultiplayerStore((s) => s.gameMode)
  const mpStage = useMultiplayerStore((s) => s.stage)
  const gridStatus = useGridStore((s) => s.status)
  const gridScore = useGridStore((s) => s.score)
  const gridTick = useGridStore((s) => s.tick)
  const startGridWithShape = useGridStore((s) => s.startGridWithShape)
  const startGridWithLetters = useGridStore((s) => s.startGridWithLetters)
  const finishRound = useMultiplayerStore((s) => s.finishRound)
  const broadcastState = useMultiplayerStore((s) => s.broadcastState)
  const mpShapeData = useMultiplayerStore((s) => s.shapeData)
  const initRef = useRef(false)
  const stageRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize grid when multiplayer starts playing — use shared shape from Firebase
  useEffect(() => {
    if (mpStatus === 'playing' && mpLetters.length > 0 && stageRef.current !== mpStage) {
      const isNewStage = stageRef.current > 0 && mpStage > stageRef.current
      stageRef.current = mpStage
      const difficulty = mpGameMode === 'shapes' ? 'shapes' :
                         mpGameMode === 'shapes_v2' ? 'shapes_v2' : 'normal'

      if (isNewStage) {
        // Start next stage — score already synced to mp store by grid won/lost effects
        if (mpShapeData) {
          useGridStore.getState().nextGridStageWithShape(mpShapeData, mpLetters)
        } else {
          useGridStore.getState().nextGridStageWithLetters(mpLetters)
        }
      } else {
        // First stage — use shared shape data from Firebase
        if (mpShapeData) {
          startGridWithShape(mpShapeData, mpLetters, mpStage, difficulty as any)
        } else {
          startGridWithLetters(difficulty, mpLetters, mpStage)
        }
      }
      initRef.current = true
    }
  }, [mpStatus, mpLetters, mpStage, mpGameMode, mpShapeData, startGridWithShape, startGridWithLetters])

  // When multiplayer round ends (another player finished), stop the grid too
  useEffect(() => {
    if (mpStatus === 'finished' && initRef.current) {
      const gs = useGridStore.getState()
      if (gs.status === 'playing') {
        // Lock in base + current level score
        baseScoreRef.current = baseScoreRef.current + gs.score
        useMultiplayerStore.setState({ score: baseScoreRef.current })
        useMultiplayerStore.getState().broadcastState()
        // Stop the grid
        useGridStore.setState({ status: 'lost' })
      }
    }
  }, [mpStatus])

  // Reset grid store when leaving multiplayer
  useEffect(() => {
    if (mpStatus === 'idle' && initRef.current) {
      useGridStore.getState().goHome()
      initRef.current = false
      stageRef.current = 0
    }
  }, [mpStatus])

  // Run grid timer (since useGridTimer only runs inside GridGame)
  useEffect(() => {
    if (gridStatus === 'playing') {
      timerRef.current = setInterval(gridTick, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gridStatus, gridTick])

  // Pause multiplayer grid timer when app is backgrounded
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      } else {
        if (useGridStore.getState().status === 'playing') {
          timerRef.current = setInterval(gridTick, 1000)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [gridTick])

  // Track accumulated base score from previous levels
  const baseScoreRef = useRef(0)

  // Sync grid score to multiplayer store in real-time (base + current level)
  useEffect(() => {
    if (initRef.current && gridStatus === 'playing') {
      useMultiplayerStore.setState({ score: baseScoreRef.current + gridScore })
      useMultiplayerStore.getState().broadcastState()
    }
  }, [gridScore, gridStatus])

  // When grid completes (stage_clear or won), lock in score and finish round
  useEffect(() => {
    if (initRef.current && (gridStatus === 'won' || gridStatus === 'stage_clear')) {
      baseScoreRef.current = baseScoreRef.current + gridScore
      useMultiplayerStore.setState({ score: baseScoreRef.current })
      broadcastState()
      finishRound()
    }
  }, [gridStatus, gridScore, broadcastState, finishRound])

  // When grid is lost (timer/stuck), lock in score and finish round
  useEffect(() => {
    if (initRef.current && gridStatus === 'lost') {
      baseScoreRef.current = baseScoreRef.current + gridScore
      useMultiplayerStore.setState({ score: baseScoreRef.current })
      broadcastState()
      finishRound()
    }
  }, [gridStatus, gridScore, broadcastState, finishRound])

  // Reset base score when leaving multiplayer
  useEffect(() => {
    if (mpStatus === 'idle') baseScoreRef.current = 0
  }, [mpStatus])

  return null
}

// Grid-mode feedback using grid store
function MultiplayerGridFeedback() {
  const feedback = useGridStore((s) => s.feedback)
  return (
    <div className="h-10 flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`text-sm font-medium ${
              feedback.type === 'success' ? 'text-success' :
              feedback.type === 'error' ? 'text-error' :
              feedback.type === 'warning' ? 'text-yellow-400' :
              'text-gray-400'
            }`}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Grid-mode word builder using grid store
function MultiplayerGridWordBuilder() {
  const currentWord = useGridStore((s) => s.currentWord)
  const clearWord = useGridStore((s) => s.clearWord)
  const submitWord = useGridStore((s) => s.submitWord)
  const status = useGridStore((s) => s.status)

  if (status !== 'playing') return null

  return (
    <div className="mx-4 p-3 rounded-xl bg-builder border border-gray-800/50">
      <div className="flex items-center justify-between gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={clearWord}
          className="w-12 h-12 rounded-xl bg-error/20 text-error text-xl font-bold flex items-center justify-center">
          ✕
        </motion.button>
        <div className="flex-1 min-h-[48px] flex items-center justify-center rounded-xl bg-gray-800/30 px-3">
          <span className="text-2xl font-bold tracking-wider">
            {currentWord || <span className="text-gray-600 text-base">הקש על אותיות</span>}
          </span>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={submitWord}
          disabled={currentWord.length === 0}
          className={`w-12 h-12 rounded-xl text-xl font-bold flex items-center justify-center
            ${currentWord.length > 0 ? 'bg-success/20 text-success' : 'bg-gray-800/30 text-gray-600'}`}>
          ✓
        </motion.button>
      </div>
    </div>
  )
}

// Grid-mode letter tiles using grid store
function MultiplayerGridLetterTiles() {
  const letters = useGridStore((s) => s.letters)
  const addLetterByIndex = useGridStore((s) => s.addLetterByIndex)
  const usedTileIndices = useGridStore((s) => s.usedTileIndices)
  const status = useGridStore((s) => s.status)

  if (status !== 'playing') return null

  return (
    <div className="px-4 py-2 shrink-0">
      <div className="flex flex-wrap justify-center gap-2 max-w-[340px] mx-auto">
        {letters.map((letter, i) => (
          <motion.button
            key={`${letter}-${i}`}
            whileTap={{ scale: 0.92 }}
            onClick={() => addLetterByIndex(i)}
            className={`w-[56px] h-[56px] rounded-xl border-2 text-2xl font-bold text-white
              shadow-lg shadow-black/30 transition-colors duration-100
              ${usedTileIndices.includes(i)
                ? 'bg-accent/30 border-accent'
                : 'bg-tile border-transparent active:border-accent active:bg-accent/20'}`}
          >
            {letter}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function MultiplayerGame() {
  useMultiplayerTimer()
  const status = useMultiplayerStore((s) => s.status)
  const gameMode = useMultiplayerStore((s) => s.gameMode)

  const isGridMode = gameMode === 'grid' || gameMode === 'shapes' || gameMode === 'shapes_v2'
  const isScoreRush = gameMode === 'score_rush'

  return (
    <>
      {(status === 'waiting' || status === 'lobby' || status === 'creating' || status === 'joining') && (
        <MultiplayerLobby />
      )}
      <MultiplayerCountdown />
      {(status === 'playing' || status === 'finished') && (
        <>
          {isGridMode && <MultiplayerGridBridge />}
          <MultiplayerTopBar />
          <MultiplayerOpponentBars />
          {isGridMode ? (
            <>
              <GridBoard />
              <MultiplayerGridFeedback />
              <div className="flex-1 min-h-2" />
              <div className="shrink-0 pb-safe">
                <MultiplayerGridWordBuilder />
                <div className="h-2" />
                <MultiplayerGridLetterTiles />
                <div className="h-2" />
              </div>
            </>
          ) : isScoreRush ? (
            <>
              <MultiplayerFeedback />
              <div className="flex-1 flex items-center justify-center px-4">
                {/* Score Rush has no target row — center area shows mode hint */}
                <p className="text-white/35 text-xs text-center max-w-[200px]">
                  שלח מילים ברצף · כל מילה מוסיפה זמן · 10 מילים = ערבוב
                </p>
              </div>
              <div className="shrink-0 pb-safe">
                <MultiplayerWordBuilder />
                <div className="h-2" />
                <MultiplayerLetterTiles />
                <div className="h-2" />
              </div>
            </>
          ) : (
            <>
              <MultiplayerTargetRow />
              <MultiplayerFeedback />
              <div className="flex-1 min-h-2" />
              <div className="shrink-0 pb-safe">
                <MultiplayerWordBuilder />
                <div className="h-2" />
                <MultiplayerLetterTiles />
                <div className="h-2" />
              </div>
            </>
          )}
        </>
      )}
      <AnimatePresence>
        <MultiplayerResults />
      </AnimatePresence>
      <MultiplayerGameOver />
    </>
  )
}

function MultiplayerGameOver() {
  const status = useMultiplayerStore((s) => s.status)
  const players = useMultiplayerStore((s) => s.players)
  const playerId = useMultiplayerStore((s) => s.playerId)
  const score = useMultiplayerStore((s) => s.score)
  const stage = useMultiplayerStore((s) => s.stage)
  const maxLevels = useMultiplayerStore((s) => s.maxLevels)
  const leaveGame = useMultiplayerStore((s) => s.leaveGame)
  const MEDALS = ['🥇', '🥈', '🥉']

  if (status !== 'game_over') return null

  const allPlayers = players.map((p) =>
    p.id === playerId ? { ...p, score } : p
  ).sort((a, b) => b.score - a.score)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6">
      <SceneBackground />
      <Confetti count={50} seed={stage} />
      <div className="relative w-full max-w-[320px] flex flex-col items-center">
        <Icon.Trophy size={64} />
        <div className="gold-text mt-2 mb-1" style={{ fontSize: 28 }}>!המשחק נגמר</div>
        <p className="text-white/55 text-sm mb-4">{maxLevels > 0 ? `${maxLevels} שלבים הושלמו` : `${stage} שלבים`}</p>

        <div className="w-full space-y-2 mb-5">
          {allPlayers.map((p, i) => (
            <motion.div key={p.id}
              initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.12 }}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{
                background: i === 0
                  ? 'linear-gradient(180deg, rgba(245,185,66,0.22), rgba(196,123,20,0.12))'
                  : p.id === playerId ? 'rgba(251,113,133,0.15)' : 'rgba(15,8,30,0.7)',
                border: i === 0
                  ? '1px solid rgba(245,185,66,0.5)'
                  : `1px solid ${p.id === playerId ? 'rgba(251,113,133,0.45)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              <div className="flex items-center gap-2">
                <span className="text-lg w-6">{i < 3 ? MEDALS[i] : `${i + 1}.`}</span>
                <span className="text-white font-bold text-sm">{p.name}</span>
                {p.id === playerId && <span className="text-[10px] text-accent font-black">(אתה)</span>}
              </div>
              <span className="num font-sora font-black text-white">{p.score.toLocaleString()}</span>
            </motion.div>
          ))}
        </div>

        <button onClick={leaveGame} className="btn-3d shine">
          <Icon.Lightning size={18} />
          <span>תפריט ראשי</span>
        </button>
      </div>
    </motion.div>
  )
}

// ─── Score Rush Mode ───

function ScoreRushTopBar() {
  const timeLeft = useGameStore((s) => s.timeLeft)
  const score = useGameStore((s) => s.score)
  const srWordsUntilShuffle = useGameStore((s) => s.srWordsUntilShuffle)
  const srShuffleTokens = useGameStore((s) => s.srShuffleTokens)
  const srTotalWords = useGameStore((s) => s.srTotalWords)
  const timerFlash = useGameStore((s) => s.timerFlash)
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const goHome = useGameStore((s) => s.goHome)
  const shuffleLetters = useGameStore((s) => s.shuffleLetters)
  const [showLeave, setShowLeave] = useState(false)

  const isLow = timeLeft <= 10

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <TimerRing time={timeLeft} totalTime={90} low={isLow} />
          <AnimatePresence>
            {timerFlash && (
              <motion.span
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -28 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className="absolute -top-2 right-0 text-xs font-black text-success">
                +
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="stage-badge">
            <Icon.Lightning size={12} />
            <span>ריצת ניקוד</span>
          </div>
          <div className="flex items-baseline gap-1">
            <motion.span key={score}
              initial={{ scale: 1.4 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className="score-gold num" style={{ fontSize: 28, lineHeight: 1 }}>
              {score.toLocaleString()}
            </motion.span>
            <span className="text-[10px] font-bold text-white/50">נק'</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { toggleMute(); playMuteToggle(useGameStore.getState().muted) }} className="w-8 h-8 flex items-center justify-center text-white/60">{muted ? '🔇' : '🔊'}</button>
          <button onClick={() => setShowLeave(true)} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-error text-sm">✕</button>
        </div>
      </div>

      <AnimatePresence>
        {showLeave && <LeaveConfirm onConfirm={() => { setShowLeave(false); goHome() }} onCancel={() => setShowLeave(false)} />}
      </AnimatePresence>

      {/* Row 2: words counter + shuffle tokens / buy */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/55 font-semibold">
          מילים <span className="num text-white/85 font-black">{srTotalWords}</span> · לערבוב <span className="num text-white/85 font-black">{srWordsUntilShuffle}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {srShuffleTokens > 0 && (
            <button onClick={shuffleLetters}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-black"
              style={{
                background: 'linear-gradient(180deg, rgba(251,113,133,0.2), rgba(190,18,60,0.18))',
                color: '#fda4af',
                border: '1px solid rgba(251,113,133,0.4)',
              }}>
              🔀 ×{srShuffleTokens}
            </button>
          )}
          <button onClick={shuffleLetters}
            className="text-xs px-2.5 py-1 rounded-full font-bold"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
            🔀 קנה 50-
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreRushScorePopup() {
  const srLastWordScore = useGameStore((s) => s.srLastWordScore)

  return (
    <AnimatePresence>
      {srLastWordScore !== null && (
        <motion.div
          key={srLastWordScore + '-' + Date.now()}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -40 }}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
          className="gold-text text-center pointer-events-none num"
          style={{ fontSize: 76, lineHeight: 1, fontFamily: 'Sora', fontWeight: 900, direction: 'ltr' }}
        >
          +{srLastWordScore}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ScoreRushResult() {
  const status = useGameStore((s) => s.status)
  const score = useGameStore((s) => s.score)
  const srTotalWords = useGameStore((s) => s.srTotalWords)
  const bestScoreRush = useGameStore((s) => s.bestScoreRush)
  const startGame = useGameStore((s) => s.startGame)
  const goHome = useGameStore((s) => s.goHome)
  const isNewBest = score > 0 && score >= bestScoreRush

  if (status !== 'lost') return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 flex flex-col items-center z-50 px-5 py-6 overflow-y-auto">
      <SceneBackground />
      <div className="relative flex flex-col items-center gap-3 w-full max-w-[340px]">
        <div className="text-6xl mt-2">⏱️</div>
        <h1 className="text-2xl font-black text-white/85">!נגמר הזמן</h1>
        <div className="flex flex-col items-center">
          <div style={{ fontFamily: 'Sora', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: '0.16em' }}>FINAL SCORE</div>
          <div className="gold-text num" style={{ fontSize: 56, lineHeight: 1 }}>{score.toLocaleString()}</div>
        </div>
        <p className="text-sm text-white/55"><span className="num font-black text-white/80">{srTotalWords}</span> מילים</p>

        {isNewBest && (
          <div className="pb-pill">
            <Icon.Trophy size={14} />
            <span>NEW PERSONAL BEST</span>
          </div>
        )}

        <div className="w-full mt-2">
          <LeaderboardSection mode="score_rush" value={score} personalBest={bestScoreRush}
            personalLabel="נק׳" active={status === 'lost'} />
        </div>

        <div className="flex flex-col gap-2.5 w-full max-w-[280px] mt-2">
          <button onClick={() => startGame('score_rush')} className="btn-3d shine w-full">
            <Icon.Lightning size={18} />
            <span>שחק שוב</span>
          </button>
          <button onClick={goHome} className="btn-3d ghost w-full">תפריט ראשי</button>
        </div>
      </div>
    </motion.div>
  )
}

function ScoreRushGame() {
  return (
    <>
      <ScoreRushTopBar />
      <FeedbackBar />
      <div className="flex-1 flex items-center justify-center">
        <ScoreRushScorePopup />
      </div>
      <div className="shrink-0 pb-safe">
        <WordBuilder />
        <div className="h-2" />
        <LetterTiles />
        <div className="h-2" />
      </div>
      <AnimatePresence>
        <ScoreRushResult />
      </AnimatePresence>
    </>
  )
}

// ─── Designer Components ───

function DesignerHub() {
  const packs = useDesignerStore((s) => s.packs)
  const createNewPack = useDesignerStore((s) => s.createNewPack)
  const editPack = useDesignerStore((s) => s.editPack)
  const deletePack = useDesignerStore((s) => s.deletePack)
  const startPlayPack = useDesignerStore((s) => s.startPlayPack)
  const sharePack = useDesignerStore((s) => s.sharePack)
  const shareCode = useDesignerStore((s) => s.shareCode)
  const goHome = useDesignerStore((s) => s.goHome)
  const importCode = useDesignerStore((s) => s.importCode)
  const setImportCode = useDesignerStore((s) => s.setImportCode)
  const importPack = useDesignerStore((s) => s.importPack)
  const importError = useDesignerStore((s) => s.importError)
  const [showImport, setShowImport] = useState(false)

  return (
    <div className="fixed inset-0 flex flex-col items-center z-50 px-4 py-8 overflow-y-auto">
      <SceneBackground />
      <button onClick={goHome} className="absolute top-4 left-4 text-white/50 text-2xl z-10" aria-label="סגור">✕</button>

      <div className="relative w-full max-w-[320px] flex flex-col items-center">
        <h1 className="gold-text mb-5" style={{ fontSize: 32 }}>🎨 עיצוב שלבים</h1>

        <div className="flex gap-2.5 mb-5 w-full">
          <button onClick={createNewPack} className="btn-3d flex-1" style={{ fontSize: 14, padding: '12px 12px' }}>
            + חבילה חדשה
          </button>
          <button onClick={() => setShowImport(!showImport)} className="btn-3d ghost flex-1" style={{ fontSize: 14 }}>
            📥 הכנס קוד
          </button>
        </div>

        {showImport && (
          <div className="w-full mb-4 p-4 rounded-2xl border border-white/10"
            style={{ background: 'linear-gradient(180deg, rgba(15,8,30,0.85), rgba(10,4,20,0.85))' }}>
            <input type="text" value={importCode} onChange={(e) => setImportCode(e.target.value)}
              placeholder="הכנס קוד חבילה" maxLength={8}
              className="w-full text-center text-lg font-mono rounded-lg py-2 text-white placeholder-white/30 outline-none mb-3"
              style={{ background: 'rgba(15,8,30,0.85)', border: '1px solid rgba(255,255,255,0.12)' }} />
            {importError && <p className="text-error text-sm text-center mb-2">{importError}</p>}
            <button onClick={importPack}
              className={`btn-3d ${importCode.length > 0 ? 'success' : ''} w-full`}
              style={{ fontSize: 14, padding: '10px 0' }}
              disabled={importCode.length === 0}>
              ייבא
            </button>
          </div>
        )}

        {shareCode && (
          <div className="w-full mb-4 p-4 rounded-2xl text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(74,222,128,0.16), rgba(22,163,74,0.08))',
              border: '1px solid rgba(74,222,128,0.4)',
            }}>
            <p className="text-success text-xs font-black tracking-wider mb-1">!קוד שיתוף</p>
            <p className="text-2xl font-mono font-black text-white tracking-widest">{shareCode}</p>
          </div>
        )}

        {packs.length === 0 ? (
          <p className="text-white/40 text-sm mt-8 text-center">אין חבילות עדיין — צור חבילה חדשה</p>
        ) : (
          <div className="w-full space-y-2.5">
            {packs.map((pack) => (
              <div key={pack.id} className="p-4 rounded-2xl border border-white/10"
                style={{ background: 'linear-gradient(180deg, rgba(15,8,30,0.85), rgba(10,4,20,0.85))' }}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-black text-white text-sm">{pack.name || 'ללא שם'}</h3>
                  <span className="text-xs text-white/45">{pack.levels.length} שלבים</span>
                </div>
                {pack.author && <p className="text-xs text-white/55 mb-3">מאת: {pack.author}</p>}
                <div className="flex gap-1.5">
                  <button onClick={() => startPlayPack(pack.id)}
                    disabled={pack.levels.length === 0}
                    className="btn-3d success flex-1" style={{ fontSize: 13, padding: '8px 0' }}>
                    ▶ שחק
                  </button>
                  <button onClick={() => editPack(pack.id)}
                    className="btn-icon" style={{ width: 36, height: 36 }}>✏️</button>
                  <button onClick={() => sharePack(pack.id)}
                    className="btn-icon" style={{ width: 36, height: 36 }}>📤</button>
                  <button onClick={() => { if (confirm('למחוק חבילה?')) deletePack(pack.id) }}
                    className="btn-icon" style={{ width: 36, height: 36, color: '#fca5a5' }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DesignerEditor() {
  const editingPack = useDesignerStore((s) => s.editingPack)
  const editingLevelIdx = useDesignerStore((s) => s.editingLevelIdx)
  const editorShape = useDesignerStore((s) => s.editorShape)
  const editorGridSize = useDesignerStore((s) => s.editorGridSize)
  const editorTimer = useDesignerStore((s) => s.editorTimer)
  const updatePackName = useDesignerStore((s) => s.updatePackName)
  const updatePackAuthor = useDesignerStore((s) => s.updatePackAuthor)
  const addLevel = useDesignerStore((s) => s.addLevel)
  const removeLevel = useDesignerStore((s) => s.removeLevel)
  const selectLevel = useDesignerStore((s) => s.selectLevel)
  const setEditorGridSize = useDesignerStore((s) => s.setEditorGridSize)
  const toggleCell = useDesignerStore((s) => s.toggleCell)
  const setEditorTimer = useDesignerStore((s) => s.setEditorTimer)
  const saveLevelTopack = useDesignerStore((s) => s.saveLevelTopack)
  const savePack = useDesignerStore((s) => s.savePack)
  const openHub = useDesignerStore((s) => s.openHub)

  if (!editingPack) return null

  const activeCells = editorShape.flat().filter(Boolean).length
  const gridSizes = [
    { r: 3, c: 3 }, { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 4, c: 5 },
    { r: 5, c: 5 }, { r: 5, c: 6 }, { r: 6, c: 6 }, { r: 6, c: 7 },
    { r: 7, c: 7 }, { r: 7, c: 8 }, { r: 8, c: 8 }, { r: 9, c: 9 },
  ]

  // Cell size for editor preview
  const maxCellSize = Math.min(Math.floor(280 / editorGridSize.cols), Math.floor(200 / editorGridSize.rows), 40)

  return (
    <div className="fixed inset-0 flex flex-col z-50 overflow-y-auto">
      <SceneBackground />
      <div className="relative px-4 py-3 flex items-center justify-between border-b border-white/8" style={{ background: 'rgba(10,4,20,0.7)', backdropFilter: 'blur(8px)' }}>
        <button onClick={() => { savePack(); openHub() }} className="font-black text-sm" style={{ color: '#ffe27a' }}>← שמור וחזור</button>
        <h2 className="font-black text-white">עורך חבילה</h2>
        <div className="w-20" />
      </div>

      <div className="relative px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        <div className="space-y-2">
          <input type="text" value={editingPack.name} onChange={(e) => updatePackName(e.target.value)}
            placeholder="שם החבילה" maxLength={30}
            className="w-full rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none text-sm"
            style={{ background: 'rgba(15,8,30,0.7)', border: '1px solid rgba(255,255,255,0.12)' }} />
          <input type="text" value={editingPack.author} onChange={(e) => updatePackAuthor(e.target.value)}
            placeholder="שם היוצר" maxLength={20}
            className="w-full rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none text-sm"
            style={{ background: 'rgba(15,8,30,0.7)', border: '1px solid rgba(255,255,255,0.12)' }} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-white/85">שלבים ({editingPack.levels.length})</h3>
            <button onClick={addLevel} className="text-xs px-3 py-1 rounded-full font-black"
              style={{ background: 'rgba(251,113,133,0.18)', color: '#fda4af', border: '1px solid rgba(251,113,133,0.4)' }}>
              + הוסף שלב
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editingPack.levels.map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <button onClick={() => selectLevel(i)}
                  className="w-10 h-10 rounded-xl font-black text-sm"
                  style={editingLevelIdx === i
                    ? { background: 'linear-gradient(180deg,#fb7185,#be123c)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 3px 0 #5b0f1f' }
                    : { background: 'rgba(15,8,30,0.7)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {i + 1}
                </button>
                <button onClick={() => removeLevel(i)} className="text-error text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>

        {editingLevelIdx >= 0 && (
          <div className="p-4 rounded-2xl border border-white/10 space-y-4"
            style={{ background: 'linear-gradient(180deg, rgba(15,8,30,0.85), rgba(10,4,20,0.85))' }}>
            <h4 className="font-black text-white text-sm">שלב {editingLevelIdx + 1}</h4>

            <div>
              <label className="text-xs text-white/55 mb-1 block font-bold">גודל רשת</label>
              <select
                value={`${editorGridSize.rows}x${editorGridSize.cols}`}
                onChange={(e) => { const [r, c] = e.target.value.split('x').map(Number); setEditorGridSize(r, c) }}
                className="rounded-lg px-3 py-2 text-sm w-full outline-none text-white"
                style={{ background: 'rgba(15,8,30,0.85)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {gridSizes.map(({ r, c }) => (
                  <option key={`${r}x${c}`} value={`${r}x${c}`} style={{ background: '#1a0510' }}>{r}×{c} ({r * c} משבצות)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-white/55 mb-2 block font-bold">הקש על משבצות לציור הצורה ({activeCells} פעילות)</label>
              <div className="flex flex-col items-center gap-1">
                {editorShape.map((row, r) => (
                  <div key={r} className="flex gap-1">
                    {row.map((active, c) => (
                      <button key={`${r}-${c}`} onClick={() => { toggleCell(r, c); saveLevelTopack() }}
                        className="rounded transition-colors"
                        style={{
                          width: maxCellSize, height: maxCellSize,
                          background: active ? '#fff' : 'rgba(15,8,30,0.85)',
                          border: active ? '1px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                        }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/55 mb-1 block font-bold">טיימר: <span className="num text-white/85 font-black">{editorTimer}</span> שניות</label>
              <input type="range" min={30} max={300} step={10} value={editorTimer}
                onChange={(e) => { setEditorTimer(Number(e.target.value)); saveLevelTopack() }}
                className="w-full accent-accent" />
              <div className="flex justify-between text-xs text-white/40">
                <span>30</span><span>120</span><span>300</span>
              </div>
            </div>

            <button onClick={saveLevelTopack} className="btn-3d success w-full" style={{ fontSize: 14, padding: '10px 0' }}>
              ✓ שמור שלב
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CustomPackGame() {
  const playingPack = useDesignerStore((s) => s.playingPack)
  const playingLevelIdx = useDesignerStore((s) => s.playingLevelIdx)
  const playTotalScore = useDesignerStore((s) => s.playTotalScore)
  const onLevelComplete = useDesignerStore((s) => s.onLevelComplete)
  const onLevelFail = useDesignerStore((s) => s.onLevelFail)
  const goHome = useDesignerStore((s) => s.goHome)
  const openHub = useDesignerStore((s) => s.openHub)
  const startFromCustomLevel = useGridStore((s) => s.startFromCustomLevel)
  const gridStatus = useGridStore((s) => s.status)
  const gridScore = useGridStore((s) => s.score)
  const gridGoHome = useGridStore((s) => s.goHome)
  const startedRef = useRef(false)
  const prevGridStatus = useRef(gridStatus)

  if (!playingPack) return null

  const allDone = playingLevelIdx >= playingPack.levels.length
  const currentLevel = allDone ? null : playingPack.levels[playingLevelIdx]

  // Start the current level
  useEffect(() => {
    if (currentLevel && !allDone && gridStatus === 'idle') {
      startFromCustomLevel(currentLevel.shape, currentLevel.rows, currentLevel.cols, currentLevel.timer, playingLevelIdx + 1)
      startedRef.current = true
    }
  }, [currentLevel, allDone, gridStatus, playingLevelIdx, startFromCustomLevel])

  // Detect level completion
  useEffect(() => {
    if (startedRef.current && prevGridStatus.current === 'playing') {
      if (gridStatus === 'stage_clear' || gridStatus === 'won') {
        onLevelComplete(gridScore)
        gridGoHome() // reset grid store for next level
        startedRef.current = false
      } else if (gridStatus === 'lost') {
        onLevelFail()
      }
    }
    prevGridStatus.current = gridStatus
  }, [gridStatus, gridScore, onLevelComplete, onLevelFail, gridGoHome])

  // All levels completed
  if (allDone) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6">
        <SceneBackground />
        <Confetti count={50} seed={playingLevelIdx} />
        <div className="absolute sunburst-gold pointer-events-none"
          style={{ top: '15%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500 }} />
        <div className="relative flex flex-col items-center gap-3 max-w-[320px]">
          <Icon.Trophy size={88} />
          <div className="gold-text" style={{ fontSize: 32, lineHeight: 1.05 }}>!סיימת את החבילה</div>
          <div className="flex flex-col items-center mt-1">
            <div style={{ fontFamily: 'Sora', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: '0.16em' }}>FINAL SCORE</div>
            <div className="gold-text num" style={{ fontSize: 56, lineHeight: 1 }}>{playTotalScore.toLocaleString()}</div>
          </div>
          <p className="text-white/55 text-sm">{playingPack.levels.length} שלבים הושלמו</p>
          <div className="flex flex-col gap-2.5 w-full max-w-[280px] mt-3">
            <button onClick={openHub} className="btn-3d gold shine w-full">
              חזרה לעורך
            </button>
            <button onClick={() => { gridGoHome(); goHome() }} className="btn-3d ghost w-full">
              תפריט ראשי
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // Level failed
  if (gridStatus === 'lost') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6">
        <SceneBackground />
        <div className="relative flex flex-col items-center gap-3 max-w-[320px]">
          <div className="text-6xl">😔</div>
          <h1 className="text-2xl font-black text-white/85">שלב {playingLevelIdx + 1} נכשל</h1>
          <div className="flex flex-col items-center">
            <div style={{ fontFamily: 'Sora', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: '0.16em' }}>FINAL SCORE</div>
            <div className="gold-text num" style={{ fontSize: 48, lineHeight: 1 }}>{playTotalScore.toLocaleString()}</div>
          </div>
          <p className="text-white/55 text-sm">הגעת לשלב {playingLevelIdx + 1} מתוך {playingPack.levels.length}</p>
          <div className="flex flex-col gap-2.5 w-full max-w-[280px] mt-3">
            <button onClick={openHub} className="btn-3d shine w-full">
              <Icon.Lightning size={18} />
              <span>חזרה לעורך</span>
            </button>
            <button onClick={() => { gridGoHome(); goHome() }} className="btn-3d ghost w-full">
              תפריט ראשי
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // During play, render the grid game
  return null // GridGame renders via grid store status
}

// ─── Pre-Game Screen ───
const MODE_INFO: Record<string, {
  emoji: string; title: string; desc: string; lbMode: string; lbLabel: string
}> = {
  score_rush: { emoji: '🔥', title: 'ריצת ניקוד',  desc: 'שלח מילים ברצף ואסוף ניקוד כמה שאפשר. מילה ארוכה = יותר זמן. ניצחון בניקוד גבוה!',           lbMode: 'score_rush', lbLabel: 'נק׳' },
  grid:       { emoji: '🔲', title: 'רשת',          desc: 'מלא לוח רשת בצלב-מילים. הנח מילים לימין ולמטה כך שיחפפו בחרות. מלא את כל הלוח!',            lbMode: 'grid',       lbLabel: 'שלב' },
  shapes:     { emoji: '🔷', title: 'צורות',        desc: 'כמו רשת, רק שהלוח בצורה מיוחדת. השלם את הצורה עם מילים בכל כיוון. האתגר הגדול!',              lbMode: 'shapes',     lbLabel: 'נק׳' },
  shapes_v2:  { emoji: '💥', title: 'צורות V2',     desc: 'מלא שורות ועמודות כדי לפוצץ אותן! כל שורה/עמודה מלאה מתפוצצת ונותנת בונוס נקודות. פנה את הלוח!', lbMode: 'shapes_v2',  lbLabel: 'נק׳' },
}

function PreGameScreen({ modeKey, onStart, onBack }: {
  modeKey: string; onStart: () => void; onBack: () => void
}) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const info = MODE_INFO[modeKey]
  const MEDALS = ['🥇', '🥈', '🥉']
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (info) fetchLeaderboard(info.lbMode).then(setBoard)
  }, [modeKey])

  // Cleanup countdown timers on unmount
  useEffect(() => {
    return () => { timerRefs.current.forEach(clearTimeout) }
  }, [])

  const handleStart = () => {
    setCountdown(3)
    timerRefs.current = [
      setTimeout(() => setCountdown(2), 1000),
      setTimeout(() => setCountdown(1), 2000),
      setTimeout(() => { setCountdown(null); onStart() }, 3000),
    ]
  }

  if (!info) return null

  if (countdown !== null) {
    return (
      <motion.div key="cd" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 flex flex-col items-center justify-center z-50">
        <SceneBackground />
        <motion.div
          key={countdown}
          initial={{ scale: 2.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className={countdown === 1 ? 'chrome-text' : 'gold-text'}
          style={{
            fontFamily: 'Sora', fontWeight: 900, fontSize: 140, lineHeight: 1, direction: 'ltr',
          }}
        >
          {countdown}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      exit={{ x: -40, opacity: 0 }}
      className="fixed inset-0 flex flex-col z-50 px-6 pt-safe pb-safe overflow-y-auto">
      <SceneBackground />

      <div className="relative flex flex-col flex-1 w-full max-w-[340px] mx-auto">
        <button onClick={onBack} className="self-start mt-4 mb-5 flex items-center gap-1 text-white/55 text-sm font-bold">
          <span>→</span><span>חזרה</span>
        </button>

        <div className="text-center mb-5">
          <div className="text-6xl mb-3">{info.emoji}</div>
          <div className="gold-text" style={{ fontSize: 32, lineHeight: 1.05 }}>{info.title}</div>
          <p className="text-white/65 text-sm leading-relaxed mt-2 px-2">{info.desc}</p>
        </div>

        <div className="mb-5">
          <h2 className="text-center text-white/45 text-xs font-black mb-3 tracking-[0.32em] uppercase">
            טבלת שיאים
          </h2>
          {board.length === 0 ? (
            <p className="text-center text-white/40 text-sm">אין שיאים עדיין — היה הראשון!</p>
          ) : (
            <div className="space-y-2 mx-auto">
              {board.map((entry, i) => (
                <motion.div key={i}
                  initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{
                    background: i === 0
                      ? 'linear-gradient(180deg, rgba(245,185,66,0.18), rgba(196,123,20,0.08))'
                      : 'rgba(15,8,30,0.7)',
                    border: i === 0 ? '1px solid rgba(245,185,66,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center">{i < 3 ? MEDALS[i] : `${i + 1}.`}</span>
                    <span className="text-white font-bold text-sm">{entry.name}</span>
                  </div>
                  <span className="num font-sora font-black" style={{ color: '#ffe27a' }}>{entry.value} <span className="text-white/55 text-xs">{info.lbLabel}</span></span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto pb-6 w-full">
          <button onClick={handleStart} className="btn-3d shine w-full" style={{ fontSize: 22, padding: '18px' }}>
            <Icon.Lightning size={22} />
            <span>!התחל משחק</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Home Screen ───
function HomeScreen() {
  const [isMulti, setIsMulti] = useState(false)
  const [multiStep, setMultiStep] = useState<'menu' | 'create_mode' | 'join'>('menu')
  const [playerCount, setPlayerCount] = useState(2)
  const [levelCount, setLevelCount] = useState(5)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [preGameMode, setPreGameMode] = useState<string | null>(null)
  const startGame = useGameStore((s) => s.startGame)
  const bestScoreRush = useGameStore((s) => s.bestScoreRush)
  const bestStageGrid = useGridStore((s) => s.bestStageGrid)
  const bestScoreShapes = useGridStore((s) => s.bestScoreShapes)
  const bestScoreShapesV2 = useGridStore((s) => s.bestScoreShapesV2)
  const startGrid = useGridStore((s) => s.startGrid)
  const createRoom = useMultiplayerStore((s) => s.createRoom)
  const joinRoom = useMultiplayerStore((s) => s.joinRoom)

  const MODE_LABELS: Record<string, string> = {
    score_rush: 'ריצת ניקוד',
    grid: '🔲 רשת',
    shapes: '🔷 צורות',
    shapes_v2: '💥 צורות V2',
  }

  const modes: { key: string; label: string; best: string; delay: number }[] = [
    { key: 'score_rush', label: MODE_LABELS.score_rush, best: bestScoreRush > 0 ? `${bestScoreRush} נק׳` : '—', delay: 0.3 },
    { key: 'grid', label: MODE_LABELS.grid, best: bestStageGrid > 0 ? `שלב ${bestStageGrid}` : '—', delay: 0.4 },
    { key: 'shapes', label: MODE_LABELS.shapes, best: bestScoreShapes > 0 ? `${bestScoreShapes} נק׳` : '—', delay: 0.5 },
    { key: 'shapes_v2', label: MODE_LABELS.shapes_v2, best: bestScoreShapesV2 > 0 ? `${bestScoreShapesV2} נק׳` : '—', delay: 0.6 },
    { key: 'designer', label: '🎨 עיצוב שלבים', best: '', delay: 0.7 },
  ]

  const openDesigner = useDesignerStore((s) => s.openHub)

  // Single player mode click — show pre-game screen first
  const handleSingleModeClick = (key: string) => {
    if (key === 'designer') { openDesigner(); return }
    setPreGameMode(key)
  }

  // Called when player hits "Start" on pre-game screen (after 3-2-1)
  const handlePreGameStart = (key: string) => {
    setPreGameMode(null)
    if (key === 'grid') startGrid('normal')
    else if (key === 'shapes') startGrid('shapes')
    else if (key === 'shapes_v2') startGrid('shapes_v2')
    else startGame(key as GameMode)
  }

  // Multiplayer: creator picks mode → creates room
  const handleCreateModeClick = async (key: string) => {
    // Grid/shapes/shapes_v2 are stage-based — use the player-chosen level count.
    // Score Rush is timer-based (no stages) — ignore level count.
    const stageBased = key === 'grid' || key === 'shapes' || key === 'shapes_v2'
    const levels = stageBased ? levelCount : 0
    useMultiplayerStore.setState({ status: 'creating', gameMode: key as any, maxPlayers: playerCount, maxLevels: levels })
    await createRoom(key as any, playerCount, levels)
  }

  // Multiplayer: joiner submits code
  const handleJoin = async () => {
    if (joinCode.length !== 4) return
    const res = await joinRoom(joinCode)
    if (!res.ok) setJoinError(res.error || 'שגיאה')
  }

  if (preGameMode) {
    return (
      <PreGameScreen
        modeKey={preGameMode}
        onStart={() => handlePreGameStart(preGameMode)}
        onBack={() => setPreGameMode(null)}
      />
    )
  }

  // Best score for the footer line — Score Rush is the canonical "personal best"
  const personalBestLine = bestScoreRush > 0
    ? <>שיא אישי <span style={{ color: '#ffe27a', fontWeight: 800 }} className="num">{bestScoreRush.toLocaleString()}</span> נק׳</>
    : <>שחק כדי לקבע שיא אישי</>

  return (
    <div className="fixed inset-0 flex flex-col items-center z-50 px-6 overflow-y-auto">
      <SceneBackground />

      <div className="relative flex flex-col items-center w-full max-w-[340px] py-6">
        {/* Eyebrow + Logo */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            fontFamily: 'Sora', fontWeight: 900, fontSize: 13, letterSpacing: '0.42em',
            color: 'rgba(255,255,255,0.45)', marginBottom: 8,
          }}>
          HEBREW WORD CHALLENGE
        </motion.div>

        <motion.div
          initial={{ y: -10, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
          <ExactoLogo size={72} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mt-2 mb-5 px-4"
          style={{ fontFamily: 'Heebo', fontWeight: 500, fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
          מלא את השורה במילים<br />
          <span style={{ color: '#ffe27a', fontWeight: 800 }}>בדיוק לפני שנגמר הזמן</span>
        </motion.p>

        {/* Single / Multi toggle pill */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-4">
          <div className="flex rounded-full p-1"
            style={{ background: 'rgba(15,8,30,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => { setIsMulti(false); setMultiStep('menu') }}
              className="px-5 py-1.5 rounded-full text-sm font-bold transition-all"
              style={!isMulti
                ? { background: 'linear-gradient(180deg,#fb7185,#be123c)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }
                : { color: 'rgba(255,255,255,0.55)' }}>
              יחיד
            </button>
            <button onClick={() => { setIsMulti(true); setMultiStep('menu') }}
              className="px-5 py-1.5 rounded-full text-sm font-bold transition-all"
              style={isMulti
                ? { background: 'linear-gradient(180deg,#fb7185,#be123c)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }
                : { color: 'rgba(255,255,255,0.55)' }}>
              מולטי 👥
            </button>
          </div>
        </motion.div>

        {/* ─── SINGLE PLAYER: mode buttons ─── */}
        {!isMulti && (
          <div className="flex flex-col gap-2.5 w-full">
            {modes.map((m, i) => {
              const isDesigner = m.key === 'designer'
              return (
                <motion.button
                  key={m.key}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  onClick={() => handleSingleModeClick(m.key)}
                  className={`btn-3d ${isDesigner ? 'gold' : ''} w-full justify-between`}
                  style={{ fontSize: 17, padding: '14px 20px' }}>
                  <span>{m.label}</span>
                  {m.best && <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.75 }} className="num">{m.best}</span>}
                </motion.button>
              )
            })}
          </div>
        )}

        {/* ─── MULTIPLAYER: menu step ─── */}
        {isMulti && multiStep === 'menu' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2.5 w-full">
            <button onClick={() => setMultiStep('create_mode')} className="btn-3d shine w-full">
              🏠 <span>צור משחק</span>
            </button>
            <button onClick={() => setMultiStep('join')} className="btn-3d ghost w-full" style={{ fontSize: 18 }}>
              🔗 <span>הצטרף למשחק</span>
            </button>
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'rgba(15,8,30,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-white/70 text-sm font-bold">מספר שחקנים</span>
              <select value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="bg-transparent text-white text-sm font-black outline-none cursor-pointer">
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n} style={{ background: '#1a0510' }}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'rgba(15,8,30,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-white/70 text-sm font-bold">מספר שלבים</span>
              <select value={levelCount} onChange={(e) => setLevelCount(Number(e.target.value))}
                className="bg-transparent text-white text-sm font-black outline-none cursor-pointer">
                {[3, 5, 7, 10, 15, 0].map((n) => (
                  <option key={n} value={n} style={{ background: '#1a0510' }}>{n === 0 ? '♾ אינסוף' : String(n)}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}

        {/* ─── MULTIPLAYER: creator picks game mode ─── */}
        {isMulti && multiStep === 'create_mode' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2.5 w-full">
            <p className="text-white/60 text-center text-sm font-bold mb-1">:בחר מצב משחק</p>
            {modes.filter((m) => m.key !== 'designer').map((m, i) => (
              <motion.button key={m.key}
                initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleCreateModeClick(m.key)}
                className="btn-3d w-full justify-between"
                style={{ fontSize: 17, padding: '14px 20px' }}>
                <span>{m.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.7 }}>{playerCount}👥</span>
              </motion.button>
            ))}
            <button onClick={() => setMultiStep('menu')} className="text-white/55 text-sm mt-2 font-bold">← חזרה</button>
          </motion.div>
        )}

        {/* ─── MULTIPLAYER: joiner enters code ─── */}
        {isMulti && multiStep === 'join' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 w-full items-center">
            <p className="text-white/60 text-sm font-bold">:הכנס קוד חדר</p>
            <input
              type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={4}
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '')); setJoinError('') }}
              placeholder="0000"
              className="text-center font-mono num text-white outline-none rounded-xl py-3 w-full"
              style={{
                fontFamily: 'Sora', fontWeight: 900, fontSize: 40, letterSpacing: '0.4em',
                background: 'rgba(15,8,30,0.7)',
                border: '2px solid rgba(255,255,255,0.12)',
                color: '#fff',
              }}
              autoFocus
            />
            {joinError && <p className="text-error text-sm font-bold">{joinError}</p>}
            <button disabled={joinCode.length !== 4} onClick={handleJoin}
              className="btn-3d shine w-full" style={{ fontSize: 18 }}>
              הצטרף
            </button>
            <button onClick={() => { setMultiStep('menu'); setJoinCode(''); setJoinError('') }}
              className="text-white/55 text-sm font-bold">← חזרה</button>
          </motion.div>
        )}

        {/* Footer line */}
        {!isMulti && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="text-center text-xs font-bold mt-5"
            style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
            {personalBestLine}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───
// ─── Back Button Hook ───
// Global back-button leave dialog state
let _showBackLeave = false
let _setShowBackLeave: ((v: boolean) => void) | null = null

function useBackButton() {
  const status = useGameStore((s) => s.status)
  const gridStatus = useGridStore((s) => s.status)
  const mpStatus = useMultiplayerStore((s) => s.status)
  const designerStatus = useDesignerStore((s) => s.status)
  const goHome = useGameStore((s) => s.goHome)
  const gridGoHome = useGridStore((s) => s.goHome)
  const leaveGame = useMultiplayerStore((s) => s.leaveGame)
  const designerGoHome = useDesignerStore((s) => s.goHome)

  const [showBackLeave, setShowBackLeave] = useState(false)
  _setShowBackLeave = setShowBackLeave

  const isInGame = status !== 'idle' || gridStatus !== 'idle' || mpStatus !== 'idle' || designerStatus !== 'idle'
  const wasInGameRef = useRef(false)

  useEffect(() => {
    if (isInGame && !wasInGameRef.current) {
      // Push TWO history entries so back button has something to pop without leaving the page
      window.history.pushState({ inGame: true }, '')
      window.history.pushState({ inGame: true }, '')
      wasInGameRef.current = true
    } else if (!isInGame && wasInGameRef.current) {
      wasInGameRef.current = false
    }
  }, [isInGame])

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Check current state directly — don't rely only on ref
      const mpActive = useMultiplayerStore.getState().status !== 'idle'
      const gridActive = useGridStore.getState().status !== 'idle'
      const gameActive = useGameStore.getState().status !== 'idle'
      const anyActive = mpActive || gridActive || gameActive || wasInGameRef.current

      if (anyActive) {
        e.preventDefault()
        // Re-push history so back button can be pressed again if user cancels
        window.history.pushState({ inGame: true }, '')
        // Show the leave dialog instead of exiting directly
        setShowBackLeave(true)
      }
    }

    // Prevent accidental page close during game
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const mpActive = useMultiplayerStore.getState().status !== 'idle'
      const gridActive = useGridStore.getState().status !== 'idle'
      const gameActive = useGameStore.getState().status !== 'idle'
      if (mpActive || gridActive || gameActive) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const handleConfirmLeave = () => {
    setShowBackLeave(false)
    wasInGameRef.current = false
    // Check all stores — multiplayer first since it may wrap grid/row modes
    const mpState = useMultiplayerStore.getState().status
    const gridState = useGridStore.getState().status
    const designerState = useDesignerStore.getState().status
    if (mpState !== 'idle') {
      leaveGame()
      // Also reset grid store if it was active under multiplayer
      if (gridState !== 'idle') gridGoHome()
    } else if (gridState !== 'idle') {
      gridGoHome()
    } else if (designerState !== 'idle') {
      designerGoHome()
    } else {
      goHome()
    }
  }

  return { showBackLeave, setShowBackLeave, handleConfirmLeave }
}

export default function GamePage() {
  const status = useGameStore((s) => s.status)
  const gridStatus = useGridStore((s) => s.status)
  const mpStatus = useMultiplayerStore((s) => s.status)
  const designerStatus = useDesignerStore((s) => s.status)

  useInit()
  useTimer()
  const { showBackLeave, setShowBackLeave, handleConfirmLeave } = useBackButton()

  const gameMode = useGameStore((s) => s.mode)
  const isGridMode = gridStatus !== 'idle'
  const isMultiplayerMode = mpStatus !== 'idle'
  const isDesignerMode = designerStatus !== 'idle'
  const isScoreRush = status !== 'idle' && gameMode === 'score_rush'
  const showHome = status === 'idle' && gridStatus === 'idle' && mpStatus === 'idle' && !isDesignerMode

  return (
    <main className="h-dvh flex flex-col max-w-md mx-auto overflow-x-hidden relative pt-safe">
      {/* Persistent scene background — visible behind every mode */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <SceneBackground />
      </div>
      {showHome && <HomeScreen />}

      {/* Back button leave confirmation dialog */}
      <AnimatePresence>
        {showBackLeave && (
          <LeaveConfirm
            onConfirm={handleConfirmLeave}
            onCancel={() => setShowBackLeave(false)}
          />
        )}
      </AnimatePresence>

      {/* Designer screens */}
      {designerStatus === 'hub' && <DesignerHub />}
      {designerStatus === 'editing' && <DesignerEditor />}
      {designerStatus === 'playing' && <CustomPackGame />}

      {isMultiplayerMode ? (
        <MultiplayerGame />
      ) : isGridMode ? (
        <GridGame />
      ) : isScoreRush ? (
        <ScoreRushGame />
      ) : status !== 'idle' ? (
        <>
          <TopBar />
          <TargetRow />
          <FeedbackBar />
          <div className="flex-1 min-h-4" />
          <div className="shrink-0 pb-safe">
            <WordBuilder />
            <div className="h-2" />
            <LetterTiles />
            <div className="h-2" />
          </div>
          <AnimatePresence>
            {status === 'stage_clear' && <StageClearScreen />}
            {(status === 'won' || status === 'lost') && <ResultScreen />}
          </AnimatePresence>
        </>
      ) : null}
    </main>
  )
}
