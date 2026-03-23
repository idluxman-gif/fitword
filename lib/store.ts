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

  // Mute
  muted: boolean

  // Personal bests
  bestScoreQuick: number
  bestStageEndless: number
  bestStageScoreRush: number

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
  muted: false,
  bestScoreQuick: 0,
  bestStageEndless: 0,
  bestStageScoreRush: 0,
  swapsAvailable: 0,

  filledLength: () => get().filledWords.reduce((sum, w) => sum + w.length, 0),
  remainingSlots: () => get().targetLength - get().filledLength(),

  initBests: () => {
    set({
      bestScoreQuick: loadBest('bestScoreQuick'),
      bestStageEndless: loadBest('bestStageEndless'),
      bestStageScoreRush: loadBest('bestStageScoreRush'),
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
        targetLength: 15,
        filledWords: [],
        currentWord: '',
        usedTileIndices: [],
        score: 0,
        timeLeft: getStageTimer(1), // 90
        status: 'playing',
        feedback: null,
        stage: 1,
        scoreTarget: getScoreTarget(1), // 80
        swapsAvailable: 0,
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

    const filledLen = filledWords.reduce((sum, w) => sum + w.length, 0)
    const remaining = targetLength - filledLen

    if (currentWord.length > remaining) {
      set({ feedback: { text: '.ארוך מדי ✗', type: 'error' }, currentWord: '', usedTileIndices: [] })
      return
    }

    // Check duplicate word
    if (filledWords.includes(currentWord)) {
      set({
        feedback: { text: '.מילה כבר שומשה ✗', type: 'error' },
        currentWord: '',
        usedTileIndices: [],
      })
      return
    }

    if (!isValidWord(currentWord)) {
      set({
        feedback: { text: '.לא במילון ✗', type: 'error' },
        currentWord: '',
        usedTileIndices: [],
        score: score + invalidWordPenalty(),
      })
      return
    }

    // Valid word!
    const wordScore = scoreWord(currentWord)
    const newFilledWords = [...filledWords, currentWord]
    const newFilledLen = filledLen + currentWord.length
    const newRemaining = targetLength - newFilledLen
    let newScore = score + wordScore

    // Score Rush: +5s on valid word
    let timeBonus = 0
    if (mode === 'score_rush') {
      timeBonus = 5
    }

    if (newRemaining === 0) {
      // Perfect Fit!
      newScore += perfectFitBonus()

      if (mode === 'quick') {
        saveBest('bestScoreQuick', newScore)
        set({
          filledWords: newFilledWords,
          currentWord: '',
          usedTileIndices: [],
          score: newScore,
          timeLeft: get().timeLeft + timeBonus,
          status: 'won',
          feedback: { text: `!מילוי מושלם 🎉 ${wordScore}+ נק׳`, type: 'success' },
          bestScoreQuick: Math.max(get().bestScoreQuick, newScore),
        })
      } else {
        // Endless / Score Rush: stage clear
        saveBest(
          mode === 'endless' ? 'bestStageEndless' : 'bestStageScoreRush',
          stage
        )
        set({
          filledWords: newFilledWords,
          currentWord: '',
          usedTileIndices: [],
          score: newScore,
          timeLeft: get().timeLeft + timeBonus,
          timerFlash: timeBonus > 0,
          status: 'stage_clear',
          feedback: { text: `!שלב הושלם 🎉 +50 בונוס`, type: 'success' },
          bestStageEndless: mode === 'endless' ? Math.max(get().bestStageEndless, stage) : get().bestStageEndless,
          bestStageScoreRush: mode === 'score_rush' ? Math.max(get().bestStageScoreRush, stage) : get().bestStageScoreRush,
        })
      }
    } else {
      // Score Rush: check if score target met (even without perfect fit)
      if (mode === 'score_rush' && newScore >= scoreTarget) {
        saveBest('bestStageScoreRush', stage)
        set({
          filledWords: newFilledWords,
          currentWord: '',
          usedTileIndices: [],
          score: newScore,
          timeLeft: get().timeLeft + timeBonus,
          timerFlash: true,
          status: 'stage_clear',
          feedback: { text: `!עברת את היעד ✓ +50 בונוס שלב`, type: 'success' },
          bestStageScoreRush: Math.max(get().bestStageScoreRush, stage),
        })
      } else {
        set({
          filledWords: newFilledWords,
          currentWord: '',
          usedTileIndices: [],
          score: newScore,
          timeLeft: get().timeLeft + timeBonus,
          timerFlash: timeBonus > 0,
          feedback: {
            text: `+${wordScore} נק׳ ✓ נשארו ${newRemaining}`,
            type: 'success',
          },
        })
        // Clear timer flash after animation
        if (timeBonus > 0) {
          setTimeout(() => set({ timerFlash: false }), 600)
        }
      }
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
    const { status, score } = get()
    if (status !== 'playing') return
    if (score < shuffleCost()) {
      set({ feedback: { text: `נדרשות ${shuffleCost()} נקודות לערבוב ✗`, type: 'error' } })
      return
    }
    const newLetters = pickWeightedLetters(get().letters.length)
    set({
      letters: newLetters,
      score: score - shuffleCost(),
      currentWord: '',
      usedTileIndices: [],
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
