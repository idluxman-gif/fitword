import { create } from 'zustand'
import {
  generateRound,
  scoreWord,
  perfectFitBonus,
  invalidWordPenalty,
  shortestFormableWordLength,
  canFormWord,
} from './game'
import { isValidWord } from './dictionary'

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

export interface FeedbackMessage {
  text: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface GameState {
  letters: string[]
  targetLength: number
  filledWords: string[]
  currentWord: string
  score: number
  timeLeft: number
  status: GameStatus
  feedback: FeedbackMessage | null

  // Computed
  filledLength: () => number
  remainingSlots: () => number

  // Actions
  startGame: () => void
  addLetter: (letter: string) => void
  clearWord: () => void
  submitWord: () => void
  tick: () => void
  checkStuck: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  letters: [],
  targetLength: 15,
  filledWords: [],
  currentWord: '',
  score: 0,
  timeLeft: 90,
  status: 'idle',
  feedback: null,

  filledLength: () => {
    return get().filledWords.reduce((sum, w) => sum + w.length, 0)
  },

  remainingSlots: () => {
    return get().targetLength - get().filledLength()
  },

  startGame: () => {
    const { letters, targetLength } = generateRound()
    set({
      letters,
      targetLength,
      filledWords: [],
      currentWord: '',
      score: 0,
      timeLeft: 90,
      status: 'playing',
      feedback: null,
    })
  },

  addLetter: (letter: string) => {
    const { status, currentWord, targetLength, filledWords } = get()
    if (status !== 'playing') return

    const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
    const remaining = targetLength - filledLen

    // Don't allow building a word longer than remaining slots
    if (currentWord.length + 1 > remaining) return

    set({ currentWord: currentWord + letter, feedback: null })
  },

  clearWord: () => {
    if (get().status !== 'playing') return
    set({ currentWord: '', feedback: null })
  },

  submitWord: () => {
    const { status, currentWord, letters, filledWords, targetLength, score } = get()
    if (status !== 'playing' || currentWord.length === 0) return

    const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
    const remaining = targetLength - filledLen

    // Check word length vs remaining
    if (currentWord.length > remaining) {
      set({
        feedback: { text: '.ארוך מדי ✗', type: 'error' },
        currentWord: '',
      })
      return
    }

    // Check if word can be formed from current letters
    if (!canFormWord(currentWord, letters)) {
      set({
        feedback: { text: '.לא ניתן להרכיב ✗', type: 'error' },
        currentWord: '',
        score: score + invalidWordPenalty(),
      })
      return
    }

    // Check dictionary
    if (!isValidWord(currentWord)) {
      set({
        feedback: { text: '.לא במילון ✗', type: 'error' },
        currentWord: '',
        score: score + invalidWordPenalty(),
      })
      return
    }

    // Valid word!
    const wordScore = scoreWord(currentWord)
    const newFilledWords = [...filledWords, currentWord]
    const newFilledLen = filledLen + currentWord.length
    const newRemaining = targetLength - newFilledLen

    if (newRemaining === 0) {
      // Perfect Fit! WIN!
      set({
        filledWords: newFilledWords,
        currentWord: '',
        score: score + wordScore + perfectFitBonus(),
        status: 'won',
        feedback: { text: '!Perfect Fit 🎉', type: 'success' },
      })
    } else {
      set({
        filledWords: newFilledWords,
        currentWord: '',
        score: score + wordScore,
        feedback: {
          text: `נשארו ${newRemaining} מקומות .מילה מצוינת ✓`,
          type: 'success',
        },
      })
    }
  },

  tick: () => {
    const { status, timeLeft } = get()
    if (status !== 'playing') return

    if (timeLeft <= 1) {
      set({ timeLeft: 0, status: 'lost' })
    } else {
      set({ timeLeft: timeLeft - 1 })
    }
  },

  checkStuck: () => {
    const { status, letters, filledWords, targetLength } = get()
    if (status !== 'playing') return

    const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
    const remaining = targetLength - filledLen
    const shortest = shortestFormableWordLength(letters)

    if (remaining > 0 && remaining < shortest) {
      set({
        feedback: {
          text: 'נתקעת — רוצה להתחיל מחדש?',
          type: 'warning',
        },
        status: 'lost',
      })
    }
  },
}))
