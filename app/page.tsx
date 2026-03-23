'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, type GameMode } from '@/lib/store'
import { playTileTap, playValidWord, playInvalidWord, playPerfectFit, playStageClear } from '@/lib/sound'

// ─── Init Hook ───
function useInit() {
  const initBests = useGameStore((s) => s.initBests)
  const didInit = useRef(false)
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true
      initBests()
    }
  }, [initBests])
}

// ─── Timer Hook ───
function useTimer() {
  const tick = useGameStore((s) => s.tick)
  const checkStuck = useGameStore((s) => s.checkStuck)
  const status = useGameStore((s) => s.status)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status === 'playing') {
      intervalRef.current = setInterval(() => {
        tick()
        checkStuck()
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [status, tick, checkStuck])
}

// ─── Mute Button ───
function MuteButton() {
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)

  return (
    <button
      onClick={toggleMute}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
      aria-label={muted ? 'הפעל צלילים' : 'השתק'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

// ─── Top Bar ───
function TopBar() {
  const timeLeft = useGameStore((s) => s.timeLeft)
  const score = useGameStore((s) => s.score)
  const targetLength = useGameStore((s) => s.targetLength)
  const filledWords = useGameStore((s) => s.filledWords)
  const mode = useGameStore((s) => s.mode)
  const stage = useGameStore((s) => s.stage)
  const scoreTarget = useGameStore((s) => s.scoreTarget)
  const timerFlash = useGameStore((s) => s.timerFlash)
  const swapsAvailable = useGameStore((s) => s.swapsAvailable)
  const useLetterSwap = useGameStore((s) => s.useLetterSwap)
  const status = useGameStore((s) => s.status)

  const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
  const remaining = targetLength - filledLen

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const isLow = timeLeft <= 15

  return (
    <div className="px-3 py-2 space-y-1">
      <div className="flex items-center justify-between">
        {/* Timer */}
        <div className="relative">
          <span className={`text-lg font-bold tabular-nums ${isLow ? 'text-error animate-pulse' : timerFlash ? 'text-success' : 'text-white'}`}>
            {timeStr}
          </span>
          <AnimatePresence>
            {timerFlash && (
              <motion.span
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute -top-4 right-0 text-xs font-bold text-success"
              >
                +5s
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Stage indicator for multi-stage modes */}
        {mode !== 'quick' && (
          <div className="text-xs text-gray-400">
            שלב {stage}
          </div>
        )}

        {/* Score */}
        <div className="text-lg font-bold text-accent">
          {score} נק׳
          {mode === 'score_rush' && (
            <span className="text-xs text-gray-400 mr-1">/ {scoreTarget}</span>
          )}
        </div>

        {/* Remaining + Mute */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">נשארו {remaining}</span>
          <MuteButton />
        </div>
      </div>

      {/* Swap button for Endless */}
      {mode === 'endless' && status === 'playing' && swapsAvailable > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={useLetterSwap}
          className="text-xs px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/40"
        >
          🔄 החלף אותיות ({swapsAvailable})
        </motion.button>
      )}
    </div>
  )
}

// ─── Target Row (RTL: filled from right, empty on left) ───
function TargetRow() {
  const targetLength = useGameStore((s) => s.targetLength)
  const filledWords = useGameStore((s) => s.filledWords)

  // Build array of characters with word boundaries
  const cells: { char: string; wordIdx: number }[] = []
  filledWords.forEach((word, wordIdx) => {
    for (let i = 0; i < word.length; i++) {
      cells.push({ char: word[i], wordIdx })
    }
  })

  const emptyCount = targetLength - cells.length

  // RTL: empty slots first (left side), then filled chars (right side)
  return (
    <div className="px-3 py-3">
      <div className="flex flex-row-reverse flex-wrap justify-center gap-[3px]">
        {/* Filled characters — from the right */}
        {cells.map((cell, i) => (
          <motion.div
            key={`filled-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`w-[22px] h-[34px] rounded-md flex items-center justify-center text-sm font-bold
              ${cell.wordIdx % 2 === 0 ? 'bg-accent/30 border border-accent/50' : 'bg-purple-900/40 border border-purple-700/50'}
            `}
          >
            {cell.char}
          </motion.div>
        ))}
        {/* Empty slots — on the left */}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-[22px] h-[34px] rounded-md border border-gray-700/50 bg-gray-800/20"
          />
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
  const status = useGameStore((s) => s.status)
  const muted = useGameStore((s) => s.muted)

  if (status !== 'playing') return null

  const handleSubmit = () => {
    const prevScore = useGameStore.getState().score
    submitWord()
    const newState = useGameStore.getState()
    // Play appropriate sound based on outcome
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
    <div className="mx-4 p-3 rounded-xl bg-builder border border-gray-800/50">
      <div className="flex items-center justify-between gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={clearWord}
          className="w-11 h-11 rounded-xl bg-error/20 text-error text-lg font-bold flex items-center justify-center shrink-0"
          aria-label="מחק מילה"
        >
          ✕
        </motion.button>

        <div className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-gray-800/30 px-3">
          <span className="text-2xl font-bold tracking-wider">
            {currentWord || <span className="text-gray-600 text-base">הקש על אותיות</span>}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSubmit}
          disabled={currentWord.length === 0}
          className={`w-11 h-11 rounded-xl text-lg font-bold flex items-center justify-center shrink-0
            ${currentWord.length > 0 ? 'bg-success/20 text-success' : 'bg-gray-800/30 text-gray-600'}`}
          aria-label="שלח מילה"
        >
          ✓
        </motion.button>
      </div>
    </div>
  )
}

// ─── Letter Tiles ───
function LetterTiles() {
  const letters = useGameStore((s) => s.letters)
  const addLetter = useGameStore((s) => s.addLetter)
  const status = useGameStore((s) => s.status)
  const muted = useGameStore((s) => s.muted)

  if (status !== 'playing') return null

  const handleTap = (letter: string) => {
    addLetter(letter)
    playTileTap(muted)
  }

  return (
    <div className="px-4 py-2 shrink-0">
      <div className="flex flex-wrap justify-center gap-2 max-w-[360px] mx-auto">
        {letters.map((letter, i) => (
          <motion.button
            key={`${letter}-${i}`}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleTap(letter)}
            className="w-[52px] h-[52px] rounded-xl bg-tile border-2 border-transparent
              text-xl font-bold text-white
              shadow-lg shadow-black/30
              active:border-accent active:bg-accent/20
              transition-colors duration-100"
          >
            {letter}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Feedback Bar ───
function FeedbackBar() {
  const feedback = useGameStore((s) => s.feedback)

  return (
    <div className="h-8 flex items-center justify-center px-4">
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
              'text-accent'
            }`}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Stage Clear Screen (Endless / Score Rush) ───
function StageClearScreen() {
  const status = useGameStore((s) => s.status)
  const score = useGameStore((s) => s.score)
  const stage = useGameStore((s) => s.stage)
  const mode = useGameStore((s) => s.mode)
  const nextStage = useGameStore((s) => s.nextStage)
  const filledWords = useGameStore((s) => s.filledWords)

  if (status !== 'stage_clear') return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-bg/95 flex flex-col items-center justify-center z-50 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-6xl mb-3"
      >
        ⭐
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-accent mb-2"
      >
        !שלב {stage} הושלם
      </motion.h1>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center space-y-1 mb-6"
      >
        <p className="text-lg text-white">{score} :ניקוד כולל</p>
        <p className="text-gray-400">{filledWords.join(' • ')}</p>
      </motion.div>

      {/* AD_SLOT: between_stages */}

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.95 }}
        onClick={nextStage}
        className="px-8 py-4 rounded-2xl bg-accent text-white text-xl font-bold shadow-lg shadow-accent/30"
      >
        המשך ←
      </motion.button>
    </motion.div>
  )
}

// ─── Result Screen ───
function ResultScreen() {
  const status = useGameStore((s) => s.status)
  const score = useGameStore((s) => s.score)
  const timeLeft = useGameStore((s) => s.timeLeft)
  const targetLength = useGameStore((s) => s.targetLength)
  const filledWords = useGameStore((s) => s.filledWords)
  const mode = useGameStore((s) => s.mode)
  const stage = useGameStore((s) => s.stage)
  const startGame = useGameStore((s) => s.startGame)
  const goHome = useGameStore((s) => s.goHome)

  const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
  const remaining = targetLength - filledLen
  const isWin = status === 'won'

  if (status !== 'won' && status !== 'lost') return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-bg/95 flex flex-col items-center justify-center z-50 px-6"
    >
      {isWin ? (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-7xl mb-4"
          >
            🎉
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-accent mb-2"
          >
            !Perfect Fit
          </motion.h1>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center space-y-1 mb-8"
          >
            <p className="text-xl text-white">{score} :ניקוד</p>
            <p className="text-gray-400">נשארו {timeLeft} שניות</p>
            <p className="text-gray-400">{filledWords.join(' • ')}</p>
          </motion.div>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i * Math.PI) / 4) * 120,
                y: Math.sin((i * Math.PI) / 4) * 120,
              }}
              transition={{ duration: 1, delay: 0.1 * i }}
              className="absolute w-3 h-3 rounded-full bg-accent"
            />
          ))}
        </>
      ) : (
        <>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl mb-4">
            😔
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl font-bold text-gray-300 mb-2"
          >
            {mode !== 'quick' ? `סיום בשלב ${stage}` : `נשארו ${remaining} תווים`}
          </motion.h1>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-1 mb-8"
          >
            <p className="text-lg text-gray-400">{score} :ניקוד</p>
            {filledWords.length > 0 && <p className="text-gray-500">{filledWords.join(' • ')}</p>}
          </motion.div>
        </>
      )}

      <div className="flex flex-col gap-3 w-full max-w-[250px]">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: isWin ? 0.6 : 0.4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => startGame(mode)}
          className="px-8 py-4 rounded-2xl bg-accent text-white text-xl font-bold shadow-lg shadow-accent/30"
        >
          !שחק שוב
        </motion.button>
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: isWin ? 0.7 : 0.5 }}
          whileTap={{ scale: 0.95 }}
          onClick={goHome}
          className="px-8 py-3 rounded-2xl bg-gray-800 text-gray-300 text-base font-medium"
        >
          תפריט ראשי
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Home Screen ───
function HomeScreen() {
  const startGame = useGameStore((s) => s.startGame)
  const bestScoreQuick = useGameStore((s) => s.bestScoreQuick)
  const bestStageEndless = useGameStore((s) => s.bestStageEndless)
  const bestStageScoreRush = useGameStore((s) => s.bestStageScoreRush)

  const modes: { key: GameMode; label: string; best: string; delay: number }[] = [
    {
      key: 'quick',
      label: 'משחק מהיר',
      best: bestScoreQuick > 0 ? `${bestScoreQuick} נק׳` : '—',
      delay: 0.3,
    },
    {
      key: 'endless',
      label: 'אינסוף',
      best: bestStageEndless > 0 ? `שלב ${bestStageEndless}` : '—',
      delay: 0.4,
    },
    {
      key: 'score_rush',
      label: 'ריצת ניקוד',
      best: bestStageScoreRush > 0 ? `שלב ${bestStageScoreRush}` : '—',
      delay: 0.5,
    },
  ]

  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-50 px-6">
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-5xl font-bold text-accent mb-2"
      >
        Exacto
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-400 text-lg mb-8"
      >
        !מלא את השורה במילים
      </motion.p>

      <div className="flex flex-col gap-3 w-full max-w-[280px]">
        {modes.map((m) => (
          <motion.button
            key={m.key}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: m.delay }}
            whileTap={{ scale: 0.95 }}
            onClick={() => startGame(m.key)}
            className="px-6 py-4 rounded-2xl bg-accent/90 hover:bg-accent text-white text-lg font-bold
              shadow-lg shadow-accent/20 flex items-center justify-between"
          >
            <span>{m.label}</span>
            <span className="text-sm font-normal text-white/60">{m.best}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───
export default function GamePage() {
  const status = useGameStore((s) => s.status)

  useInit()
  useTimer()

  return (
    <main className="h-dvh flex flex-col max-w-md mx-auto overflow-hidden">
      {status === 'idle' && <HomeScreen />}

      {/* Top section */}
      <TopBar />
      <TargetRow />
      <FeedbackBar />

      {/* Spacer */}
      <div className="flex-1 min-h-4" />

      {/* Bottom controls */}
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
    </main>
  )
}
