import { create } from 'zustand'
import {
  generateStage,
  scoreWord,
  stageClearBonus,
  invalidWordPenalty,
  getScoreTarget,
  getStageTimer,
  shuffleCost,
  pickWeightedLetters,
} from './game'
import { isValidWord } from './dictionary'

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost' | 'stage_clear'
export type GameMode = 'score_rush'

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
  bestScoreRush: number

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
  mode: 'score_rush',
  stage: 1,
  scoreTarget: 0,
  timerFlash: false,
  srWordsUntilShuffle: 10,
  srShuffleTokens: 0,
  srLastWordScore: null,
  srTotalWords: 0,
  muted: false,
  bestScoreRush: 0,
  swapsAvailable: 0,

  filledLength: () => get().filledWords.reduce((sum, w) => sum + w.length, 0),
  remainingSlots: () => get().targetLength - get().filledLength(),

  initBests: () => {
    set({
      bestScoreRush: loadBest('bestScoreRush'),
      muted: typeof window !== 'undefined' && localStorage.getItem('muted') === 'true',
    })
  },

  startGame: (_mode: GameMode) => {
    const { letters } = generateStage(10, 15)
    set({
      mode: 'score_rush',
      letters,
      targetLength: 999,
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
  },

  nextStage: () => {
    const { stage, score } = get()
    const newStage = stage + 1
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

  shuffleLetters: () => {
    const { status, score, srShuffleTokens } = get()
    if (status !== 'playing') return

    if (srShuffleTokens > 0) {
      const newLetters = pickWeightedLetters(10)
      set({
        letters: newLetters,
        srShuffleTokens: srShuffleTokens - 1,
        currentWord: '', usedTileIndices: [],
        feedback: { text: '!ערבוב חינם 🔀', type: 'info' },
      })
    } else if (score >= shuffleCost()) {
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
