'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, type GameMode } from '@/lib/store'
import { useGridStore, type Direction } from '@/lib/grid-store'
import { useMultiplayerStore, type MultiplayerStatus } from '@/lib/multiplayer-store'
import { useDesignerStore, type CustomLevel, type LevelPack } from '@/lib/designer-store'
import { playTileTap, playValidWord, playInvalidWord, playPerfectFit, playStageClear } from '@/lib/sound'

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
        className="bg-builder rounded-2xl p-6 max-w-[300px] w-full text-center border border-gray-700/50"
      >
        <p className="text-white text-lg font-bold mb-2">?לצאת מהמשחק</p>
        <p className="text-gray-400 text-sm mb-5">הפעולה תסיים את התור שלך</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium">
            המשך לשחק
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-error text-white font-medium">
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

        {/* Remaining + Mute + Leave */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-400">נשארו {remaining}</span>
          <MuteButton />
          <button onClick={() => setShowLeave(true)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-error text-sm">✕</button>
        </div>
      </div>

      <AnimatePresence>
        {showLeave && <LeaveConfirm onConfirm={goHome} onCancel={() => setShowLeave(false)} />}
      </AnimatePresence>

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
  const undoLastWord = useGameStore((s) => s.undoLastWord)
  const shuffleLetters = useGameStore((s) => s.shuffleLetters)
  const filledWords = useGameStore((s) => s.filledWords)
  const score = useGameStore((s) => s.score)
  const status = useGameStore((s) => s.status)
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
    <div className="mx-4 p-3 rounded-xl bg-builder border border-gray-800/50 space-y-2">
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

      {/* Undo last word button */}
      {!currentWord && (
        <div className="flex gap-2">
          {filledWords.length > 0 && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }}
              onClick={undoLastWord}
              className="flex-1 py-1.5 rounded-lg text-xs text-gray-400 bg-gray-800/30 hover:text-white transition-colors">
              ↩ ביטול ({filledWords[filledWords.length - 1]})
            </motion.button>
          )}
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }}
            onClick={shuffleLetters}
            className={`${filledWords.length > 0 ? '' : 'flex-1'} px-3 py-1.5 rounded-lg text-xs transition-colors ${score >= 50 ? 'text-accent bg-accent/10 hover:bg-accent/20' : 'text-gray-600 bg-gray-800/20'}`}>
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
          <motion.button
            key={`${letter}-${i}`}
            whileTap={isUsed ? {} : { scale: 0.92 }}
            onClick={() => handleTap(i)}
            disabled={isUsed}
            className={`w-[52px] h-[52px] rounded-xl border-2
              text-xl font-bold
              shadow-lg shadow-black/30
              transition-colors duration-100
              ${isUsed
                ? 'bg-tile/30 border-transparent text-white/25 cursor-not-allowed'
                : 'bg-tile border-transparent text-white active:border-accent active:bg-accent/20'
              }`}
          >
            {letter}
          </motion.button>
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

// ─── Grid Mode Components ───

const DIR_ARROWS: Record<Direction, string> = { right: '←', down: '↓', left: '→', up: '↑' }

function GridBoard() {
  const grid = useGridStore((s) => s.grid)
  const gridRows = useGridStore((s) => s.gridRows)
  const gridCols = useGridStore((s) => s.gridCols)
  const selectedCell = useGridStore((s) => s.selectedCell)
  const direction = useGridStore((s) => s.direction)
  const selectCell = useGridStore((s) => s.selectCell)
  const status = useGridStore((s) => s.status)

  if (status !== 'playing') return null

  // Fit grid to screen: consider both width and available height
  // Reserve ~280px for top bar + feedback + word builder + tiles + padding
  const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 280 : 400
  const maxByWidth = Math.floor((340 - (gridCols - 1) * 4) / gridCols)
  const maxByHeight = Math.floor((availableHeight - (gridRows - 1) * 4) / gridRows)
  const cellSize = Math.min(maxByWidth, maxByHeight, 56)

  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2">
      {grid.map((row, r) => (
        <div key={r} className="flex flex-row-reverse gap-1">
          {row.map((cell, c) => {
            if (!cell.active) {
              // Inactive cell — invisible spacer
              return <div key={`${r}-${c}`} style={{ width: cellSize, height: cellSize }} />
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
                  <span className="text-accent text-lg">{DIR_ARROWS[direction]}</span>
                ) : ''}
              </motion.button>
            )
          })}
        </div>
      ))}
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

  const totalCells = grid.flat().length
  const filledCells = grid.flat().filter((c) => c.filled).length

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const isLow = timeLeft <= 15

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className={`text-lg font-bold tabular-nums ${isLow ? 'text-error animate-pulse' : 'text-white'}`}>
        {timeStr}
      </span>
      <span className="text-xs text-gray-400">שלב {stage}</span>
      <span className="text-lg font-bold text-accent">{score} נק׳</span>
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-400">{filledCells}/{totalCells}</span>
        <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center text-gray-400">
          {muted ? '🔇' : '🔊'}
        </button>
        <button onClick={() => setShowLeave(true)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-error text-sm">✕</button>
      </div>
      <AnimatePresence>
        {showLeave && <LeaveConfirm onConfirm={goHome} onCancel={() => setShowLeave(false)} />}
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
    if (next.status === 'stage_clear') playPerfectFit(muted)
    else if (next.score > prev) playValidWord(muted)
    else if (next.feedback?.type === 'error') playInvalidWord(muted)
  }

  return (
    <div className="mx-4 p-3 rounded-xl bg-builder border border-gray-800/50 space-y-2">
      {!selectedCell && (
        <p className="text-center text-gray-500 text-sm py-2">בחר משבצת ברשת</p>
      )}
      {selectedCell && (
        <div className="flex items-center justify-between gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={clearWord}
            className="w-11 h-11 rounded-xl bg-error/20 text-error text-lg font-bold flex items-center justify-center shrink-0">
            ✕
          </motion.button>
          <div className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-gray-800/30 px-3">
            <span className="text-2xl font-bold tracking-wider">
              {currentWord || <span className="text-gray-600 text-base">הקש על אותיות</span>}
            </span>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleSubmit}
            disabled={!currentWord}
            className={`w-11 h-11 rounded-xl text-lg font-bold flex items-center justify-center shrink-0
              ${currentWord ? 'bg-success/20 text-success' : 'bg-gray-800/30 text-gray-600'}`}>
            ✓
          </motion.button>
        </div>
      )}
      {!currentWord && (
        <div className="flex gap-2">
          {placedWords.length > 0 && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }}
              onClick={undoLastWord}
              className="flex-1 py-1.5 rounded-lg text-xs text-gray-400 bg-gray-800/30 hover:text-white transition-colors">
              ↩ ביטול ({placedWords[placedWords.length - 1].word})
            </motion.button>
          )}
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }}
            onClick={shuffleLetters}
            className={`${placedWords.length > 0 ? '' : 'flex-1'} px-3 py-1.5 rounded-lg text-xs transition-colors ${score >= 50 ? 'text-accent bg-accent/10 hover:bg-accent/20' : 'text-gray-600 bg-gray-800/20'}`}>
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
            <motion.button key={`${letter}-${i}`}
              whileTap={isUsed ? {} : { scale: 0.92 }}
              onClick={() => { if (!isUsed) { addLetterByIndex(i); playTileTap(muted) } }}
              disabled={isUsed}
              className={`w-[52px] h-[52px] rounded-xl border-2 text-xl font-bold shadow-lg shadow-black/30 transition-colors duration-100
                ${isUsed ? 'bg-tile/30 border-transparent text-white/25' : 'bg-tile border-transparent text-white active:border-accent active:bg-accent/20'}`}>
              {letter}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function GridFeedbackBar() {
  const feedback = useGridStore((s) => s.feedback)
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

function GridResultScreen() {
  const status = useGridStore((s) => s.status)
  const score = useGridStore((s) => s.score)
  const stage = useGridStore((s) => s.stage)
  const placedWords = useGridStore((s) => s.placedWords)
  const startGrid = useGridStore((s) => s.startGrid)
  const nextGridStage = useGridStore((s) => s.nextGridStage)
  const goHome = useGridStore((s) => s.goHome)

  if (status === 'stage_clear') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 bg-bg/95 flex flex-col items-center justify-center z-50 px-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-6xl mb-3">💥</motion.div>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-accent mb-2">!שלב {stage} הושלם</motion.h1>
        <p className="text-lg text-white mb-1">{score} :ניקוד</p>
        <p className="text-gray-400 mb-6 text-sm">{placedWords.map((p) => p.word).join(' • ')}</p>
        {/* Burst particles */}
        {[...Array(10)].map((_, i) => (
          <motion.div key={i} initial={{ scale: 0, x: 0, y: 0 }}
            animate={{ scale: [0, 1, 0], x: Math.cos((i * Math.PI) / 5) * 100, y: Math.sin((i * Math.PI) / 5) * 100 }}
            transition={{ duration: 0.8, delay: 0.05 * i }}
            className="absolute w-2 h-2 rounded-full bg-accent" />
        ))}
        <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.95 }} onClick={nextGridStage}
          className="px-8 py-4 rounded-2xl bg-accent text-white text-xl font-bold shadow-lg shadow-accent/30">
          !שלב הבא
        </motion.button>
      </motion.div>
    )
  }

  if (status === 'lost') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 bg-bg/95 flex flex-col items-center justify-center z-50 px-6">
        <motion.div initial={{ scale: 1.5 }} animate={{ scale: 1, rotate: [0, -5, 5, -3, 0] }}
          transition={{ duration: 0.5 }} className="text-5xl mb-4">💔</motion.div>
        <h1 className="text-2xl font-bold text-gray-300 mb-2">נגמר הזמן</h1>
        <p className="text-lg text-gray-400 mb-1">{score} :ניקוד</p>
        <p className="text-gray-500 mb-6">הגעת לשלב {stage}</p>
        <div className="flex flex-col gap-3 w-full max-w-[250px]">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => startGrid()}
            className="px-8 py-4 rounded-2xl bg-accent text-white text-xl font-bold shadow-lg shadow-accent/30">!שחק שוב</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={goHome}
            className="px-8 py-3 rounded-2xl bg-gray-800 text-gray-300 text-base font-medium">תפריט ראשי</motion.button>
        </div>
      </motion.div>
    )
  }

  return null
}

function useGridTimer() {
  const tick = useGridStore((s) => s.tick)
  const status = useGridStore((s) => s.status)
  const ref = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (status === 'playing') {
      ref.current = setInterval(tick, 1000)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [status, tick])
}

function GridGame() {
  useGridTimer()

  return (
    <>
      <GridTopBar />
      <GridBoard />
      <GridFeedbackBar />
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
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [tab, setTab] = useState<'choose' | 'create' | 'join'>('choose')
  const createRoom = useMultiplayerStore((s) => s.createRoom)
  const joinRoom = useMultiplayerStore((s) => s.joinRoom)
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
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-50 px-6">
        <div className="text-2xl text-accent animate-pulse">...מתחבר</div>
      </div>
    )
  }

  if (status === 'waiting' || status === 'lobby') {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-50 px-6">
        <h2 className="text-2xl font-bold text-accent mb-1">חדר משחק</h2>
        <p className="text-gray-400 text-sm mb-3">{MODE_NAMES[gameMode] || gameMode}</p>

        {/* Room code */}
        <div className="mb-4 text-center">
          <p className="text-gray-400 text-sm mb-1">קוד חדר:</p>
          <div className="text-5xl font-bold text-white tracking-[0.3em] font-mono">{roomCode}</div>
          <p className="text-gray-500 text-xs mt-1">שתפו את הקוד עם חברים</p>
        </div>

        {/* My name input */}
        <div className="w-full max-w-[280px] mb-3">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 12))}
            placeholder="השם שלך"
            maxLength={12}
            className="w-full text-center text-lg font-bold bg-tile border-2 border-gray-700 rounded-xl py-2 px-3 text-white placeholder-gray-600 focus:border-accent outline-none"
          />
        </div>

        {/* Player list */}
        <div className="w-full max-w-[280px] mb-4">
          <p className="text-gray-400 text-sm mb-2">{players.length}/{maxPlayers} :שחקנים</p>
          <div className="space-y-2">
            {players.map((p, i) => {
              const isMe = p.id === playerId
              return (
                <motion.div
                  key={p.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center justify-between px-4 py-2 rounded-xl border ${
                    p.ready ? 'bg-success/10 border-success/40' : 'bg-tile border-gray-700/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${p.ready ? 'text-success' : 'text-gray-500'}`}>
                      {p.ready ? '✓' : '○'}
                    </span>
                    <span className="text-white">{p.name}</span>
                    {i === 0 && <span className="text-xs text-accent">👑</span>}
                  </div>
                  {isMe && (
                    <button onClick={toggleReady}
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        p.ready ? 'bg-success/20 text-success' : 'bg-gray-700 text-gray-300'
                      }`}>
                      {p.ready ? '!מוכן' : 'מוכן?'}
                    </button>
                  )}
                </motion.div>
              )
            })}
            {players.length < maxPlayers && (
              <div className="flex items-center justify-center px-4 py-2 rounded-xl border border-dashed border-gray-700/40">
                <span className="text-gray-600 text-sm animate-pulse">...ממתין לשחקנים</span>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          {isHost && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={allReady ? { scale: 0.95 } : {}}
              onClick={allReady ? startMatch : undefined}
              className={`px-8 py-4 rounded-2xl text-xl font-bold shadow-lg ${
                allReady
                  ? 'bg-success text-white shadow-success/30'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {allReady ? '!התחל משחק' : '...ממתין שכולם יהיו מוכנים'}
            </motion.button>
          )}
          {!isHost && !myReady && (
            <p className="text-center text-gray-500 text-sm">לחץ &quot;?מוכן&quot; כשאתה מוכן</p>
          )}
          <button onClick={leaveGame} className="px-8 py-3 rounded-2xl bg-gray-800 text-gray-300 text-base font-medium">
            יציאה
          </button>
        </div>
      </div>
    )
  }

  // Choose: create or join
  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-50 px-6">
      <h2 className="text-3xl font-bold text-accent mb-2">{MODE_NAMES[gameMode] || 'מולטיפלייר'}</h2>
      <p className="text-gray-400 mb-8">{maxPlayers} שחקנים</p>

      {tab === 'choose' && (
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              setTab('create')
              await createRoom(gameMode, maxPlayers)
            }}
            className="px-6 py-4 rounded-2xl bg-accent text-white text-lg font-bold shadow-lg shadow-accent/20"
          >
            🏠 צור משחק
          </motion.button>
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTab('join')}
            className="px-6 py-4 rounded-2xl bg-tile text-white text-lg font-bold border border-gray-700/40"
          >
            🔗 הצטרף למשחק
          </motion.button>
          <button onClick={leaveGame} className="px-8 py-3 rounded-2xl bg-gray-800 text-gray-300 text-base font-medium mt-2">
            חזרה
          </button>
        </div>
      )}

      {tab === 'join' && (
        <div className="flex flex-col gap-4 w-full max-w-[280px] items-center">
          <p className="text-gray-400 text-sm">הכנס קוד חדר:</p>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '')); setJoinError('') }}
            placeholder="0000"
            className="text-center text-4xl font-bold font-mono tracking-[0.4em] bg-tile border-2 border-gray-700 rounded-xl py-3 w-full text-white placeholder-gray-600 focus:border-accent outline-none"
            autoFocus
          />
          {joinError && <p className="text-error text-sm">{joinError}</p>}
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={joinCode.length !== 4}
            onClick={async () => {
              const res = await joinRoom(joinCode)
              if (!res.ok) setJoinError(res.error || 'שגיאה')
            }}
            className={`px-8 py-3 rounded-2xl text-white text-lg font-bold w-full ${joinCode.length === 6 ? 'bg-accent' : 'bg-gray-700 text-gray-500'}`}
          >
            הצטרף
          </motion.button>
          <button onClick={() => { setTab('choose'); setJoinCode(''); setJoinError('') }}
            className="text-gray-400 text-sm">← חזרה</button>
        </div>
      )}
    </div>
  )
}

function MultiplayerCountdown() {
  const countdownValue = useMultiplayerStore((s) => s.countdownValue)
  const status = useMultiplayerStore((s) => s.status)

  if (status !== 'countdown' || countdownValue === null) return null

  return (
    <motion.div
      className="fixed inset-0 bg-bg/95 flex items-center justify-center z-[60]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={countdownValue}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`text-8xl font-bold ${countdownValue === 0 ? 'text-accent' : 'text-white'}`}
        >
          {countdownValue === 0 ? '!GO' : countdownValue}
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
  const gameMode = useMultiplayerStore((s) => s.gameMode)
  const gridScore = useGridStore((s) => s.score)

  // In grid/shapes mode, show grid store score (real-time); in row modes, show multiplayer store score
  const isGridMode = gameMode === 'grid' || gameMode === 'shapes'
  const score = isGridMode ? gridScore : mpScore

  const filledLen = filledWords.reduce((s, w) => s + w.length, 0)
  const remaining = targetLength - filledLen
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isLow = timeLeft <= 15

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className={`text-lg font-bold tabular-nums ${isLow ? 'text-error animate-pulse' : 'text-white'}`}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <span className="text-lg font-bold text-accent">{score} נק׳</span>
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-400">נשארו {remaining}</span>
        <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center text-gray-400">{muted ? '🔇' : '🔊'}</button>
        <button onClick={() => setShowLeaveConfirm(true)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-error text-sm">✕</button>
      </div>
      <AnimatePresence>
        {showLeaveConfirm && <LeaveConfirm onConfirm={leaveGame} onCancel={() => setShowLeaveConfirm(false)} />}
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
  const emptyCount = targetLength - cells.length

  return (
    <div className="px-3 py-3">
      <div className="flex flex-row-reverse flex-wrap justify-center gap-[3px]">
        {cells.map((cell, i) => (
          <motion.div key={`f-${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }}
            className={`w-[22px] h-[34px] rounded-md flex items-center justify-center text-sm font-bold
              ${cell.wordIdx % 2 === 0 ? 'bg-accent/30 border border-accent/50' : 'bg-purple-900/40 border border-purple-700/50'}`}>
            {cell.char}
          </motion.div>
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`e-${i}`} className="w-[22px] h-[34px] rounded-md border border-gray-700/50 bg-gray-800/20" />
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
    <div className="mx-4 p-3 rounded-xl bg-builder border border-gray-800/50 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={clearWord}
          className="w-11 h-11 rounded-xl bg-error/20 text-error text-lg font-bold flex items-center justify-center shrink-0">✕</motion.button>
        <div className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-gray-800/30 px-3">
          <span className="text-2xl font-bold tracking-wider">
            {currentWord || <span className="text-gray-600 text-base">הקש על אותיות</span>}
          </span>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleSubmit} disabled={!currentWord}
          className={`w-11 h-11 rounded-xl text-lg font-bold flex items-center justify-center shrink-0
            ${currentWord ? 'bg-success/20 text-success' : 'bg-gray-800/30 text-gray-600'}`}>✓</motion.button>
      </div>
      {filledWords.length > 0 && !currentWord && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }} onClick={undoLastWord}
          className="w-full py-1.5 rounded-lg text-xs text-gray-400 bg-gray-800/30 hover:text-white transition-colors">
          ↩ הסר מילה אחרונה ({filledWords[filledWords.length - 1]})
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
            <motion.button key={`${letter}-${i}`}
              whileTap={isUsed ? {} : { scale: 0.92 }}
              onClick={() => { if (!isUsed) { addLetterByIndex(i); playTileTap(muted) } }}
              disabled={isUsed}
              className={`w-[52px] h-[52px] rounded-xl border-2 text-xl font-bold shadow-lg shadow-black/30 transition-colors duration-100
                ${isUsed ? 'bg-tile/30 border-transparent text-white/25' : 'bg-tile border-transparent text-white active:border-accent active:bg-accent/20'}`}>
              {letter}
            </motion.button>
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
  const isHost = useMultiplayerStore((s) => s.isHost)
  const nextRound = useMultiplayerStore((s) => s.nextRound)
  const leaveGame = useMultiplayerStore((s) => s.leaveGame)

  if (status !== 'finished') return null

  // Check if all players finished
  const allFinished = players.every((p) => p.finished || p.id === playerId)
  const myLen = filledWords.reduce((s, w) => s + w.length, 0)
  const myPerfectFit = myLen === targetLength

  // Update own state in player list for display
  const allPlayers = players.map((p) =>
    p.id === playerId ? { ...p, score, filledLength: myLen, finished: true, perfectFit: myPerfectFit } : p
  ).sort((a, b) => b.score - a.score)

  const winner = allPlayers[0]
  const isWinner = winner?.id === playerId

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 bg-bg/95 flex flex-col items-center justify-center z-50 px-6">

      {!allFinished && (
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">{myPerfectFit ? '🎉' : '⏳'}</div>
          <p className="text-gray-400 animate-pulse">...ממתין לשחקנים אחרים</p>
        </div>
      )}

      <h2 className="text-2xl font-bold text-accent mb-4">{allFinished ? '!תוצאות' : 'הניקוד שלך'}</h2>

      {/* Scoreboard */}
      <div className="w-full max-w-[300px] space-y-2 mb-6">
        {allPlayers.map((p, i) => (
          <motion.div key={p.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              p.id === playerId ? 'bg-accent/20 border border-accent/50' : 'bg-tile border border-gray-700/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{i === 0 && allFinished ? '👑' : `${i + 1}.`}</span>
              <span className="text-white font-medium">{p.name}</span>
              {p.id === playerId && <span className="text-xs text-accent">(אתה)</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{p.score}</span>
              {p.perfectFit && <span className="text-success text-xs">Perfect</span>}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[250px]">
        {isHost && (
          <button onClick={nextRound}
            className="px-8 py-4 rounded-2xl bg-success text-white text-xl font-bold shadow-lg shadow-success/30">
            !שלב {stage + 1} — המשך
          </button>
        )}
        {!isHost && (
          <p className="text-center text-gray-400 text-sm animate-pulse">...ממתין למנהל להמשיך</p>
        )}
        <button onClick={leaveGame}
          className="px-8 py-3 rounded-2xl bg-gray-800 text-gray-300 text-base font-medium">
          יציאה
        </button>
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
  const startGridWithLetters = useGridStore((s) => s.startGridWithLetters)
  const finishRound = useMultiplayerStore((s) => s.finishRound)
  const broadcastState = useMultiplayerStore((s) => s.broadcastState)
  const initRef = useRef(false)
  const stageRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize grid when multiplayer starts playing
  useEffect(() => {
    if (mpStatus === 'playing' && mpLetters.length > 0 && stageRef.current !== mpStage) {
      stageRef.current = mpStage
      const difficulty = mpGameMode === 'shapes' ? 'shapes' : 'normal'
      startGridWithLetters(difficulty, mpLetters, mpStage)
      initRef.current = true
    }
  }, [mpStatus, mpLetters, mpStage, mpGameMode, startGridWithLetters])

  // When multiplayer round ends (another player finished), stop the grid too
  useEffect(() => {
    if (mpStatus === 'finished' && initRef.current) {
      const gs = useGridStore.getState()
      if (gs.status === 'playing') {
        // Sync whatever score we accumulated so far
        useMultiplayerStore.setState({ score: useMultiplayerStore.getState().score + gs.score })
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

  // Sync grid score to multiplayer store in real-time (for opponent bars)
  useEffect(() => {
    if (initRef.current && gridStatus === 'playing') {
      useMultiplayerStore.setState({ score: gridScore })
      useMultiplayerStore.getState().broadcastState()
    }
  }, [gridScore, gridStatus])

  // When grid completes (stage_clear or won), sync score to multiplayer and finish round
  useEffect(() => {
    if (initRef.current && (gridStatus === 'won' || gridStatus === 'stage_clear')) {
      useMultiplayerStore.setState({ score: useMultiplayerStore.getState().score + gridScore })
      broadcastState()
      finishRound()
    }
  }, [gridStatus, gridScore, broadcastState, finishRound])

  // When grid is lost (timer/stuck), also end the round
  useEffect(() => {
    if (initRef.current && gridStatus === 'lost') {
      useMultiplayerStore.setState({ score: useMultiplayerStore.getState().score + gridScore })
      broadcastState()
      finishRound()
    }
  }, [gridStatus, gridScore, broadcastState, finishRound])

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

  const isGridMode = gameMode === 'grid' || gameMode === 'shapes'

  return (
    <>
      {(status === 'choose' || status === 'waiting' || status === 'lobby' || status === 'creating' || status === 'joining') && (
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
    <div className="fixed inset-0 bg-bg flex flex-col items-center z-50 px-4 py-8 overflow-y-auto">
      <button onClick={goHome} className="absolute top-4 left-4 text-gray-400 text-2xl">✕</button>

      <h1 className="text-2xl font-bold text-accent mb-6">🎨 עיצוב שלבים</h1>

      <div className="flex gap-3 mb-6 w-full max-w-[320px]">
        <motion.button whileTap={{ scale: 0.95 }} onClick={createNewPack}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-bold text-sm">
          + חבילה חדשה
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowImport(!showImport)}
          className="flex-1 py-3 rounded-xl bg-tile border border-gray-700 text-white font-bold text-sm">
          📥 הכנס קוד
        </motion.button>
      </div>

      {showImport && (
        <div className="w-full max-w-[320px] mb-4 p-4 rounded-xl bg-builder border border-gray-800">
          <input type="text" value={importCode} onChange={(e) => setImportCode(e.target.value)}
            placeholder="הכנס קוד חבילה" maxLength={8}
            className="w-full text-center text-lg font-mono bg-tile border border-gray-700 rounded-lg py-2 text-white placeholder-gray-600 focus:border-accent outline-none mb-3" />
          {importError && <p className="text-error text-sm text-center mb-2">{importError}</p>}
          <button onClick={importPack}
            className={`w-full py-2 rounded-lg font-bold ${importCode.length > 0 ? 'bg-accent text-white' : 'bg-gray-700 text-gray-500'}`}>
            ייבא
          </button>
        </div>
      )}

      {shareCode && (
        <div className="w-full max-w-[320px] mb-4 p-4 rounded-xl bg-success/10 border border-success/30 text-center">
          <p className="text-success text-sm mb-1">!קוד שיתוף</p>
          <p className="text-2xl font-bold font-mono text-white tracking-widest">{shareCode}</p>
        </div>
      )}

      {packs.length === 0 ? (
        <p className="text-gray-500 text-sm mt-8">אין חבילות עדיין — צור חבילה חדשה</p>
      ) : (
        <div className="w-full max-w-[320px] space-y-3">
          {packs.map((pack) => (
            <div key={pack.id} className="p-4 rounded-xl bg-tile border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white">{pack.name || 'ללא שם'}</h3>
                <span className="text-xs text-gray-500">{pack.levels.length} שלבים</span>
              </div>
              {pack.author && <p className="text-xs text-gray-400 mb-3">מאת: {pack.author}</p>}
              <div className="flex gap-2">
                <button onClick={() => startPlayPack(pack.id)}
                  disabled={pack.levels.length === 0}
                  className="flex-1 py-2 rounded-lg bg-success/20 text-success font-bold text-sm disabled:opacity-30">
                  ▶ שחק
                </button>
                <button onClick={() => editPack(pack.id)}
                  className="py-2 px-3 rounded-lg bg-accent/20 text-accent text-sm">✏️</button>
                <button onClick={() => sharePack(pack.id)}
                  className="py-2 px-3 rounded-lg bg-blue-500/20 text-blue-400 text-sm">📤</button>
                <button onClick={() => { if (confirm('למחוק חבילה?')) deletePack(pack.id) }}
                  className="py-2 px-3 rounded-lg bg-error/20 text-error text-sm">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
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
    <div className="fixed inset-0 bg-bg flex flex-col z-50 overflow-y-auto">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <button onClick={() => { savePack(); openHub() }} className="text-accent font-bold text-sm">← שמור וחזור</button>
        <h2 className="font-bold text-white">עורך חבילה</h2>
        <div className="w-16" />
      </div>

      <div className="px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        {/* Pack name & author */}
        <div className="space-y-2">
          <input type="text" value={editingPack.name} onChange={(e) => updatePackName(e.target.value)}
            placeholder="שם החבילה" maxLength={30}
            className="w-full bg-tile border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-accent outline-none text-sm" />
          <input type="text" value={editingPack.author} onChange={(e) => updatePackAuthor(e.target.value)}
            placeholder="שם היוצר" maxLength={20}
            className="w-full bg-tile border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-accent outline-none text-sm" />
        </div>

        {/* Level list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-300">שלבים ({editingPack.levels.length})</h3>
            <button onClick={addLevel} className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-lg font-bold">+ הוסף שלב</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editingPack.levels.map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <button onClick={() => selectLevel(i)}
                  className={`w-10 h-10 rounded-lg font-bold text-sm ${editingLevelIdx === i ? 'bg-accent text-white' : 'bg-tile text-gray-400 border border-gray-700'}`}>
                  {i + 1}
                </button>
                <button onClick={() => removeLevel(i)} className="text-error text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Level editor */}
        {editingLevelIdx >= 0 && (
          <div className="p-4 rounded-xl bg-builder border border-gray-800 space-y-4">
            <h4 className="font-bold text-white text-sm">שלב {editingLevelIdx + 1}</h4>

            {/* Grid size */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">גודל רשת</label>
              <select
                value={`${editorGridSize.rows}x${editorGridSize.cols}`}
                onChange={(e) => {
                  const [r, c] = e.target.value.split('x').map(Number)
                  setEditorGridSize(r, c)
                }}
                className="bg-tile border border-gray-700 text-white rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-accent"
              >
                {gridSizes.map(({ r, c }) => (
                  <option key={`${r}x${c}`} value={`${r}x${c}`}>{r}×{c} ({r * c} משבצות)</option>
                ))}
              </select>
            </div>

            {/* Grid canvas — tap to toggle cells */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">הקש על משבצות לציור הצורה ({activeCells} פעילות)</label>
              <div className="flex flex-col items-center gap-1">
                {editorShape.map((row, r) => (
                  <div key={r} className="flex gap-1">
                    {row.map((active, c) => (
                      <button key={`${r}-${c}`} onClick={() => { toggleCell(r, c); saveLevelTopack() }}
                        className={`rounded transition-colors ${active ? 'bg-white' : 'bg-gray-800 border border-gray-700'}`}
                        style={{ width: maxCellSize, height: maxCellSize }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">טיימר: {editorTimer} שניות</label>
              <input type="range" min={30} max={300} step={10} value={editorTimer}
                onChange={(e) => { setEditorTimer(Number(e.target.value)); saveLevelTopack() }}
                className="w-full accent-accent" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>30</span><span>120</span><span>300</span>
              </div>
            </div>

            <button onClick={saveLevelTopack} className="w-full py-2 rounded-lg bg-success/20 text-success font-bold text-sm">
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
        className="fixed inset-0 bg-bg/95 flex flex-col items-center justify-center z-50 px-6">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold text-accent mb-2">!סיימת את החבילה</h1>
        <p className="text-xl text-white mb-1">{playTotalScore} :ניקוד כולל</p>
        <p className="text-gray-400 mb-6">{playingPack.levels.length} שלבים הושלמו</p>
        <div className="flex flex-col gap-3 w-full max-w-[250px]">
          <button onClick={openHub} className="px-8 py-4 rounded-2xl bg-accent text-white text-xl font-bold shadow-lg">
            חזרה לעורך
          </button>
          <button onClick={() => { gridGoHome(); goHome() }} className="px-8 py-3 rounded-2xl bg-gray-800 text-gray-300 text-base">
            תפריט ראשי
          </button>
        </div>
      </motion.div>
    )
  }

  // Level failed
  if (gridStatus === 'lost') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 bg-bg/95 flex flex-col items-center justify-center z-50 px-6">
        <div className="text-5xl mb-4">😔</div>
        <h1 className="text-2xl font-bold text-gray-300 mb-2">שלב {playingLevelIdx + 1} נכשל</h1>
        <p className="text-lg text-gray-400 mb-1">{playTotalScore} :ניקוד כולל</p>
        <p className="text-gray-500 mb-6">הגעת לשלב {playingLevelIdx + 1} מתוך {playingPack.levels.length}</p>
        <div className="flex flex-col gap-3 w-full max-w-[250px]">
          <button onClick={openHub} className="px-8 py-4 rounded-2xl bg-accent text-white text-xl font-bold shadow-lg">
            חזרה לעורך
          </button>
          <button onClick={() => { gridGoHome(); goHome() }} className="px-8 py-3 rounded-2xl bg-gray-800 text-gray-300 text-base">
            תפריט ראשי
          </button>
        </div>
      </motion.div>
    )
  }

  // During play, render the grid game
  return null // GridGame renders via grid store status
}

// ─── Home Screen ───
function HomeScreen() {
  const [isMulti, setIsMulti] = useState(false)
  const [playerCount, setPlayerCount] = useState(2)
  const startGame = useGameStore((s) => s.startGame)
  const bestScoreQuick = useGameStore((s) => s.bestScoreQuick)
  const bestStageEndless = useGameStore((s) => s.bestStageEndless)
  const bestStageScoreRush = useGameStore((s) => s.bestStageScoreRush)
  const bestStageGrid = useGridStore((s) => s.bestStageGrid)
  const bestStageShapes = useGridStore((s) => s.bestStageShapes)
  const startGrid = useGridStore((s) => s.startGrid)
  const createRoom = useMultiplayerStore((s) => s.createRoom)

  const MODE_LABELS: Record<string, string> = {
    quick: 'משחק מהיר',
    endless: 'אינסוף',
    score_rush: 'ריצת ניקוד',
    grid: '🔲 רשת',
    shapes: '🔷 צורות',
  }

  const modes: { key: string; label: string; best: string; delay: number }[] = [
    { key: 'quick', label: MODE_LABELS.quick, best: bestScoreQuick > 0 ? `${bestScoreQuick} נק׳` : '—', delay: 0.3 },
    { key: 'endless', label: MODE_LABELS.endless, best: bestStageEndless > 0 ? `שלב ${bestStageEndless}` : '—', delay: 0.4 },
    { key: 'score_rush', label: MODE_LABELS.score_rush, best: bestStageScoreRush > 0 ? `שלב ${bestStageScoreRush}` : '—', delay: 0.5 },
    { key: 'grid', label: MODE_LABELS.grid, best: bestStageGrid > 0 ? `שלב ${bestStageGrid}` : '—', delay: 0.6 },
    { key: 'shapes', label: MODE_LABELS.shapes, best: bestStageShapes > 0 ? `שלב ${bestStageShapes}` : '—', delay: 0.7 },
    { key: 'designer', label: '🎨 עיצוב שלבים', best: '', delay: 0.8 },
  ]

  const openDesigner = useDesignerStore((s) => s.openHub)

  const handleModeClick = (key: string) => {
    if (key === 'designer') {
      openDesigner()
      return
    }
    if (!isMulti) {
      // Single player
      if (key === 'grid') startGrid('normal')
      else if (key === 'shapes') startGrid('shapes')
      else startGame(key as GameMode)
    } else {
      // Multiplayer — go to create/join flow for this mode
      useMultiplayerStore.setState({ status: 'choose', gameMode: key as any, maxPlayers: playerCount })
    }
  }

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
        transition={{ delay: 0.15 }}
        className="text-gray-400 text-lg mb-5"
      >
        !מלא את השורה במילים
      </motion.p>

      {/* Single / Multiplayer toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3 mb-4"
      >
        <div className="flex rounded-full bg-tile border border-gray-700/50 p-1">
          <button
            onClick={() => setIsMulti(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!isMulti ? 'bg-accent text-white' : 'text-gray-400'}`}
          >
            יחיד
          </button>
          <button
            onClick={() => setIsMulti(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isMulti ? 'bg-accent text-white' : 'text-gray-400'}`}
          >
            מולטי 👥
          </button>
        </div>

        {/* Player count dropdown — only in multi mode */}
        <AnimatePresence>
          {isMulti && (
            <motion.select
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              className="bg-tile border border-gray-700/50 text-white text-sm rounded-full px-3 py-1.5 outline-none appearance-none cursor-pointer"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} שחקנים</option>
              ))}
            </motion.select>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mode buttons */}
      <div className="flex flex-col gap-3 w-full max-w-[280px]">
        {modes.map((m) => (
          <motion.button
            key={m.key}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: m.delay }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleModeClick(m.key)}
            className="px-6 py-4 rounded-2xl bg-accent/90 hover:bg-accent text-white text-lg font-bold
              shadow-lg shadow-accent/20 flex items-center justify-between"
          >
            <span>{m.label}</span>
            <span className="text-sm font-normal text-white/60">{isMulti ? `${playerCount}👥` : m.best}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───
export default function GamePage() {
  const status = useGameStore((s) => s.status)
  const gridStatus = useGridStore((s) => s.status)
  const mpStatus = useMultiplayerStore((s) => s.status)
  const designerStatus = useDesignerStore((s) => s.status)

  useInit()
  useTimer()

  const isGridMode = gridStatus !== 'idle'
  const isMultiplayerMode = mpStatus !== 'idle'
  const isDesignerMode = designerStatus !== 'idle'
  const showHome = status === 'idle' && gridStatus === 'idle' && mpStatus === 'idle' && !isDesignerMode

  return (
    <main className="h-dvh flex flex-col max-w-md mx-auto overflow-hidden">
      {showHome && <HomeScreen />}

      {/* Designer screens */}
      {designerStatus === 'hub' && <DesignerHub />}
      {designerStatus === 'editing' && <DesignerEditor />}
      {designerStatus === 'playing' && <CustomPackGame />}

      {isMultiplayerMode ? (
        <MultiplayerGame />
      ) : isGridMode ? (
        <GridGame />
      ) : (
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
      )}
    </main>
  )
}
