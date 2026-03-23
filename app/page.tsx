'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/store'

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

// ─── Top Bar ───
function TopBar() {
  const timeLeft = useGameStore((s) => s.timeLeft)
  const score = useGameStore((s) => s.score)
  const targetLength = useGameStore((s) => s.targetLength)
  const filledWords = useGameStore((s) => s.filledWords)
  const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
  const remaining = targetLength - filledLen

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const isLow = timeLeft <= 15

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className={`text-lg font-bold tabular-nums ${isLow ? 'text-error animate-pulse' : 'text-white'}`}>
        {timeStr}
      </div>
      <div className="text-lg font-bold text-accent">
        {score} נק׳
      </div>
      <div className="text-sm text-gray-400">
        נשארו {remaining}
      </div>
    </div>
  )
}

// ─── Target Row ───
function TargetRow() {
  const targetLength = useGameStore((s) => s.targetLength)
  const filledWords = useGameStore((s) => s.filledWords)

  // Build array of characters with word boundaries
  const cells: { char: string; wordIdx: number; isFirst: boolean }[] = []
  filledWords.forEach((word, wordIdx) => {
    for (let i = 0; i < word.length; i++) {
      cells.push({ char: word[i], wordIdx, isFirst: i === 0 && wordIdx > 0 })
    }
  })

  // Fill remaining with empty
  const emptyCount = targetLength - cells.length

  return (
    <div className="px-3 py-4">
      <div className="flex flex-row-reverse flex-wrap justify-center gap-[3px]">
        {cells.map((cell, i) => (
          <motion.div
            key={`filled-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`w-[22px] h-[34px] rounded-md flex items-center justify-center text-sm font-bold
              ${cell.wordIdx % 2 === 0 ? 'bg-accent/30 border border-accent/50' : 'bg-purple-900/40 border border-purple-700/50'}
              ${cell.isFirst ? 'mr-[2px]' : ''}
            `}
          >
            {cell.char}
          </motion.div>
        ))}
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

  if (status !== 'playing') return null

  return (
    <div className="mx-4 p-3 rounded-xl bg-builder border border-gray-800/50">
      <div className="flex items-center justify-between gap-3">
        {/* Clear button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={clearWord}
          className="w-12 h-12 rounded-xl bg-error/20 text-error text-xl font-bold flex items-center justify-center"
          aria-label="מחק מילה"
        >
          ✕
        </motion.button>

        {/* Current word display */}
        <div className="flex-1 min-h-[48px] flex items-center justify-center rounded-xl bg-gray-800/30 px-3">
          <span className="text-2xl font-bold tracking-wider">
            {currentWord || <span className="text-gray-600 text-base">הקש על אותיות</span>}
          </span>
        </div>

        {/* Submit button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={submitWord}
          disabled={currentWord.length === 0}
          className={`w-12 h-12 rounded-xl text-xl font-bold flex items-center justify-center
            ${currentWord.length > 0
              ? 'bg-success/20 text-success'
              : 'bg-gray-800/30 text-gray-600'
            }`}
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

  if (status !== 'playing') return null

  return (
    <div className="px-4 py-2 shrink-0">
      <div className="flex flex-wrap justify-center gap-2 max-w-[340px] mx-auto">
        {letters.map((letter, i) => (
          <motion.button
            key={`${letter}-${i}`}
            whileTap={{ scale: 0.92 }}
            onClick={() => addLetter(letter)}
            className="w-[56px] h-[56px] rounded-xl bg-tile border-2 border-transparent
              text-2xl font-bold text-white
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

// ─── Result Screen ───
function ResultScreen() {
  const status = useGameStore((s) => s.status)
  const score = useGameStore((s) => s.score)
  const timeLeft = useGameStore((s) => s.timeLeft)
  const targetLength = useGameStore((s) => s.targetLength)
  const filledWords = useGameStore((s) => s.filledWords)
  const startGame = useGameStore((s) => s.startGame)

  const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
  const remaining = targetLength - filledLen

  if (status !== 'won' && status !== 'lost') return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-bg/95 flex flex-col items-center justify-center z-50 px-6"
    >
      {status === 'won' ? (
        <>
          {/* Confetti-like burst */}
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
            <p className="text-gray-400">
              {filledWords.length} מילים: {filledWords.join(' • ')}
            </p>
          </motion.div>

          {/* Decorative bursts */}
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-5xl mb-4"
          >
            😔
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl font-bold text-gray-300 mb-2"
          >
            נשארו {remaining} תווים
          </motion.h1>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-1 mb-8"
          >
            <p className="text-lg text-gray-400">{score} :ניקוד</p>
            {filledWords.length > 0 && (
              <p className="text-gray-500">
                {filledWords.join(' • ')}
              </p>
            )}
          </motion.div>
        </>
      )}

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: status === 'won' ? 0.6 : 0.4 }}
        whileTap={{ scale: 0.95 }}
        onClick={startGame}
        className="px-8 py-4 rounded-2xl bg-accent text-white text-xl font-bold
          shadow-lg shadow-accent/30"
      >
        !שחק שוב
      </motion.button>
    </motion.div>
  )
}

// ─── Start Screen ───
function StartScreen() {
  const startGame = useGameStore((s) => s.startGame)

  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-50 px-6">
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-5xl font-bold text-accent mb-3"
      >
        FitWord
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-400 text-lg mb-8"
      >
        !מלא את השורה במילים
      </motion.p>
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.95 }}
        onClick={startGame}
        className="px-8 py-4 rounded-2xl bg-accent text-white text-xl font-bold
          shadow-lg shadow-accent/30"
      >
        !התחל לשחק
      </motion.button>
    </div>
  )
}

// ─── Main Page ───
export default function GamePage() {
  const status = useGameStore((s) => s.status)

  useTimer()

  return (
    <main className="h-dvh flex flex-col max-w-md mx-auto overflow-hidden">
      {status === 'idle' && <StartScreen />}

      {/* Top section */}
      <TopBar />
      <TargetRow />
      <FeedbackBar />

      {/* Spacer */}
      <div className="flex-1 min-h-4" />

      {/* Bottom controls — always visible */}
      <div className="shrink-0 pb-safe">
        <WordBuilder />
        <div className="h-2" />
        <LetterTiles />
        <div className="h-2" />
      </div>

      <AnimatePresence>
        {(status === 'won' || status === 'lost') && <ResultScreen />}
      </AnimatePresence>
    </main>
  )
}
