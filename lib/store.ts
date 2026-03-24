import { create } from 'zustand'
import {
  generateRound,
  generateStage,
  scoreWord,
  perfectFitBonus,
  stageClearBonus,
  invalidWordPenalty,
  shortestFormableWordLength,
  getScoreTarget,
  getStageTimer,
  getEndlessLetterCount,
  shuffleCost,
  pickWeightedLetters,
} from './game'
import { isValidWord } from './dictionary'

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost' | 'stage_clear'
export type GameMode = 'quick' | 'endless' | 'score_rush'

export interface FeedbackMessage {
  text: string
  type: 'success' | 'error' | 'warning' | 'info'
}

// localStorage helpers
function loadBest(key: string): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(key) || '0', 10)
}
function saveBest(key: string, value: number) {
  if (typeof window === 'undefined') return
  const current = loadBest(key)
  if (value > current) localStorage.setItem(key, String(value))
}

interface GameState {
  // Core state
  letters: string[]
  targetLength: number
  filledWords: string[]
  currentWord: string
  usedTileIndices: number[] // which tile indices are used in current word
  score: number
  timeLeft: number
  status: GameStatus
  feedback: FeedbackMessage | null
  mode: GameMode
  stage: number
  scoreTarget: number // Score Rush only
  timerFlash: boolean // +5s visual feedback

  // Score Rush new
  srWordsUntilShuffle: number  // counts down from 10
  srShuffleTokens: number      // manual shuffles earned
  srLastWordScore: number | null // big score popup
  srTotalWords: number          // total valid words this run

  // Mute
  muted: boolean

  // Personal bests
  bestScoreQuick: number
  bestStageEndless: number
  bestScoreRush: number  // renamed: best SCORE not stage

  // Endless: letter swap
  swapsAvailable: number

  // Computed
  filledLength: () => number
  remainingSlots: () => number

  // Actions
  initBests: () => void
  startGame: (mode: GameMode) => void
  nextStage: () => void
  addLetterByIndex: (index: number) => void
  clearWord: () => void
  submitWord: () => void
  undoLastWord: () => void
  tick: () => void
  checkStuck: () => void
  useLetterSwap: () => void
  shuffleLetters: () => void
  toggleMute: () => void
  goHome: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  letters: [],
  targetLength: 15,
  filledWords: [],
  currentWord: '',
  usedTileIndices: [],
  score: 0,
  timeLeft: 90,
  status: 'idle',
  feedback: null,
  mode: 'quick',
  stage: 1,
  scoreTarget: 0,
  timerFlash: false,
  srWordsUntilShuffle: 10,
  srShuffleTokens: 0,
  srLastWordScore: null,
  srTotalWords: 0,
  muted: false,
  bestScoreQuick: 0,
  bestStageEndless: 0,
  bestScoreRush: 0,
  swapsAvailable: 0,

  filledLength: () => get().filledWords.reduce((sum, w) => sum + w.length, 0),
  remainingSlots: () => get().targetLength - get().filledLength(),

  initBests: () => {
    set({
      bestScoreQuick: loadBest('bestScoreQuick'),
      bestStageEndless: loadBest('bestStageEndless'),
      bestScoreRush: loadBest('bestScoreRush'),
      muted: typeof window !== 'undefined' && localStorage.getItem('muted') === 'true',
    })
  },

  startGame: (mode: GameMode) => {
    if (mode === 'quick') {
      const { letters, targetLength } = generateRound()
      set({
        mode,
        letters,
        targetLength,
        filledWords: [],
        currentWord: '',
        usedTileIndices: [],
        score: 0,
        timeLeft: 90,
        status: 'playing',
        feedback: null,
        stage: 1,
        scoreTarget: 0,
        swapsAvailable: 0,
      })
    } else if (mode === 'endless') {
      const letterCount = getEndlessLetterCount(1) // 10
      const { letters } = generateStage(letterCount, 15)
      set({
        mode,
        letters,
        targetLength: 15,
        filledWords: [],
        currentWord: '',
        usedTileIndices: [],
        score: 0,
        timeLeft: 90,
        status: 'playing',
        feedback: null,
        stage: 1,
        scoreTarget: 0,
        swapsAvailable: 0,
      })
    } else if (mode === 'score_rush') {
      const { letters } = generateStage(10, 15)
      set({
        mode,
        letters,
        targetLength: 999, // no row limit in score rush
        filledWords: [],
        currentWord: '',
        usedTileIndices: [],
        score: 0,
        timeLeft: 90,
        status: 'playing',
        feedback: null,
        stage: 1,
        scoreTarget: 0,
        swapsAvailable: 0,
        srWordsUntilShuffle: 10,
        srShuffleTokens: 0,
        srLastWordScore: null,
        srTotalWords: 0,
      })
    }
  },

  nextStage: () => {
    const { mode, stage, score } = get()
    const newStage = stage + 1

    if (mode === 'endless') {
      const letterCount = getEndlessLetterCount(newStage)
      const { letters } = generateStage(letterCount, 15)
      // Every 4 stages, grant a swap
      const newSwaps = get().swapsAvailable + (newStage % 4 === 1 && newStage > 1 ? 1 : 0)
      set({
        letters,
        targetLength: 15,
        filledWords: [],
        currentWord: '',
        timeLeft: 90,
        status: 'playing',
        feedback: null,
        stage: newStage,
        score: score + stageClearBonus(),
        swapsAvailable: newSwaps,
      })
    } else if (mode === 'score_rush') {
      const { letters } = generateStage(10, 15)
      set({
        letters,
        targetLength: 15,
        filledWords: [],
        currentWord: '',
        timeLeft: getStageTimer(newStage),
        status: 'playing',
        feedback: null,
        stage: newStage,
        score: score + stageClearBonus(),
        scoreTarget: getScoreTarget(newStage),
      })
    }
  },

  addLetterByIndex: (index: number) => {
    const { status, currentWord, targetLength, filledWords, letters, usedTileIndices } = get()
    if (status !== 'playing') return

    // Tile already used in current word
    if (usedTileIndices.includes(index)) return

    const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
    const remaining = targetLength - filledLen
    if (currentWord.length + 1 > remaining) return

    set({
      currentWord: currentWord + letters[index],
      usedTileIndices: [...usedTileIndices, index],
      feedback: null,
    })
  },

  clearWord: () => {
    if (get().status !== 'playing') return
    set({ currentWord: '', usedTileIndices: [], feedback: null })
  },

  submitWord: () => {
    const { status, currentWord, letters, filledWords, targetLength, score, mode, stage, scoreTarget } = get()
    if (status !== 'playing' || currentWord.length === 0) return

    // Score Rush: completely different flow — no rows
    if (mode === 'score_rush') {
      // Duplicate check
      if (filledWords.includes(currentWord)) {
        set({ feedback: { text: '.מילה כבר שומשה ✗', type: 'error' }, currentWord: '', usedTileIndices: [] })
        return
      }
      if (!isValidWord(currentWord)) {
        set({
          feedback: { text: '.לא במילון ✗', type: 'error' },
          currentWord: '', usedTileIndices: [],
          score: score + invalidWordPenalty(),
        })
        return
      }

      // Valid word — score + time bonus
      const wordScore = scoreWord(currentWord)
      const newScore = score + wordScore
      const len = currentWord.length
      const timeBonus = len <= 2 ? 1 : len === 3 ? 2 : len === 4 ? 5 : len === 5 ? 10 : 15
      const newWords = [...filledWords, currentWord]
      const newTotalWords = get().srTotalWords + 1
      let newWordsUntilShuffle = get().srWordsUntilShuffle - 1
      let newShuffleTokens = get().srShuffleTokens
      let newLetters = letters
      let shuffleMsg = ''

      // Every 10 words: auto-shuffle + earn a manual shuffle token
      if (newWordsUntilShuffle <= 0) {
        newWordsUntilShuffle = 10
        newShuffleTokens += 1
        newLetters = pickWeightedLetters(10)
        shuffleMsg = ' 🔄 אותיות חדשות!'
      }

      saveBest('bestScoreRush', newScore)

      set({
        filledWords: newWords,
        currentWord: '',
        usedTileIndices: [],
        score: newScore,
        timeLeft: get().timeLeft + timeBonus,
        timerFlash: true,
        letters: newLetters,
        srWordsUntilShuffle: newWordsUntilShuffle,
        srShuffleTokens: newShuffleTokens,
        srLastWordScore: wordScore,
        srTotalWords: newTotalWords,
        bestScoreRush: Math.max(get().bestScoreRush, newScore),
        feedback: { text: `+${timeBonus}s${shuffleMsg}`, type: 'success' },
      })
      // Clear timer flash and score popup
      setTimeout(() => set({ timerFlash: false, srLastWordScore: null }), 1200)
      return
    }

    // ─── Row-based modes (Quick / Endless) ───
    const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
    const remaining = targetLength - filledLen

    if (currentWord.length > remaining) {
      set({ feedback: { text: '.ארוך מדי ✗', type: 'error' }, currentWord: '', usedTileIndices: [] })
      return
    }

    if (filledWords.includes(currentWord)) {
      set({ feedback: { text: '.מילה כבר שומשה ✗', type: 'error' }, currentWord: '', usedTileIndices: [] })
      return
    }

    if (!isValidWord(currentWord)) {
      set({
        feedback: { text: '.לא במילון ✗', type: 'error' },
        currentWord: '', usedTileIndices: [],
        score: score + invalidWordPenalty(),
      })
      return
    }

    const wordScore = scoreWord(currentWord)
    const newFilledWords = [...filledWords, currentWord]
    const newFilledLen = filledLen + currentWord.length
    const newRemaining = targetLength - newFilledLen
    let newScore = score + wordScore

    if (newRemaining === 0) {
      newScore += perfectFitBonus()
      if (mode === 'quick') {
        saveBest('bestScoreQuick', newScore)
        set({
          filledWords: newFilledWords, currentWord: '', usedTileIndices: [],
          score: newScore, status: 'won',
          feedback: { text: `!מילוי מושלם 🎉 ${wordScore}+ נק׳`, type: 'success' },
          bestScoreQuick: Math.max(get().bestScoreQuick, newScore),
        })
      } else {
        // Endless: stage clear
        saveBest('bestStageEndless', stage)
        set({
          filledWords: newFilledWords, currentWord: '', usedTileIndices: [],
          score: newScore, status: 'stage_clear',
          feedback: { text: `!שלב הושלם 🎉 +50 בונוס`, type: 'success' },
          bestStageEndless: Math.max(get().bestStageEndless, stage),
        })
      }
    } else {
      set({
        filledWords: newFilledWords, currentWord: '', usedTileIndices: [],
        score: newScore,
        feedback: { text: `+${wordScore} נק׳ ✓ נשארו ${newRemaining}`, type: 'success' },
      })
    }
  },

  undoLastWord: () => {
    const { status, filledWords, score } = get()
    if (status !== 'playing' || filledWords.length === 0) return

    const lastWord = filledWords[filledWords.length - 1]
    const wordScore = scoreWord(lastWord)

    set({
      filledWords: filledWords.slice(0, -1),
      score: Math.max(0, score - wordScore),
      currentWord: '',
      usedTileIndices: [],
      feedback: { text: `"${lastWord}" הוסרה ↩`, type: 'info' },
    })
  },

  tick: () => {
    const { status, timeLeft } = get()
    if (status !== 'playing') return

    if (timeLeft <= 1) {
      // Save best on loss
      if (get().mode === 'score_rush') saveBest('bestScoreRush', get().score)
      set({ timeLeft: 0, status: 'lost' })
    } else {
      set({ timeLeft: timeLeft - 1 })
    }
  },

  checkStuck: () => {
    const { status, letters, filledWords, targetLength, mode } = get()
    if (status !== 'playing') return
    // Score Rush has no row — can't get stuck
    if (mode === 'score_rush') return

    const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
    const remaining = targetLength - filledLen
    const shortest = shortestFormableWordLength(letters)

    if (remaining > 0 && remaining < shortest) {
      set({
        feedback: { text: 'נתקעת — רוצה להתחיל מחדש?', type: 'warning' },
        status: 'lost',
      })
    }
  },

  useLetterSwap: () => {
    const { status, swapsAvailable, targetLength } = get()
    if (status !== 'playing' || swapsAvailable <= 0) return

    const letterCount = get().letters.length
    const { letters } = generateStage(letterCount, targetLength)
    set({
      letters,
      swapsAvailable: swapsAvailable - 1,
      currentWord: '',
      feedback: { text: '!אותיות חדשות 🔄', type: 'info' },
    })
  },

  shuffleLetters: () => {
    const { status, score, mode, srShuffleTokens } = get()
    if (status !== 'playing') return

    // Score Rush: use token (free) or buy for 50 points
    if (mode === 'score_rush') {
      if (srShuffleTokens > 0) {
        // Use free token
        const newLetters = pickWeightedLetters(10)
        set({
          letters: newLetters,
          srShuffleTokens: srShuffleTokens - 1,
          currentWord: '', usedTileIndices: [],
          feedback: { text: '!ערבוב חינם 🔀', type: 'info' },
        })
      } else if (score >= shuffleCost()) {
        // Buy shuffle
        const newLetters = pickWeightedLetters(10)
        set({
          letters: newLetters,
          score: score - shuffleCost(),
          currentWord: '', usedTileIndices: [],
          feedback: { text: `!ערבוב (${shuffleCost()}- נק׳) 🔀`, type: 'info' },
        })
      } else {
        set({ feedback: { text: `נדרשות ${shuffleCost()} נקודות לערבוב ✗`, type: 'error' } })
      }
      return
    }

    // Other modes: standard shuffle
    if (score < shuffleCost()) {
      set({ feedback: { text: `נדרשות ${shuffleCost()} נקודות לערבוב ✗`, type: 'error' } })
      return
    }
    const newLetters = pickWeightedLetters(get().letters.length)
    set({
      letters: newLetters,
      score: score - shuffleCost(),
      currentWord: '', usedTileIndices: [],
      feedback: { text: `!אותיות חדשות 🔀 (${shuffleCost()}- נק׳)`, type: 'info' },
    })
  },

  toggleMute: () => {
    const newMuted = !get().muted
    set({ muted: newMuted })
    if (typeof window !== 'undefined') {
      localStorage.setItem('muted', String(newMuted))
    }
  },

  goHome: () => {
    set({ status: 'idle', feedback: null })
  },
}))
