import { getAllWords, isValidWord, getWordsFromLetters } from './dictionary'

// Hebrew letters weighted by real frequency
const WEIGHTED_LETTERS: { letter: string; weight: number }[] = [
  { letter: 'י', weight: 10 },
  { letter: 'ו', weight: 10 },
  { letter: 'ה', weight: 9 },
  { letter: 'א', weight: 9 },
  { letter: 'מ', weight: 8 },
  { letter: 'ל', weight: 8 },
  { letter: 'ת', weight: 8 },
  { letter: 'ר', weight: 7 },
  { letter: 'ש', weight: 7 },
  { letter: 'נ', weight: 7 },
  { letter: 'ב', weight: 7 },
  { letter: 'כ', weight: 6 },
  { letter: 'ע', weight: 5 },
  { letter: 'ד', weight: 5 },
  { letter: 'ח', weight: 5 },
  { letter: 'ג', weight: 4 },
  { letter: 'פ', weight: 4 },
  { letter: 'צ', weight: 4 },
  { letter: 'ק', weight: 4 },
  { letter: 'ס', weight: 3 },
  { letter: 'ט', weight: 3 },
  { letter: 'ז', weight: 3 },
]

// Guaranteed safe preset — 10 letters that form many common words
const SAFE_PRESET_10: string[] = ['מ', 'ל', 'ש', 'ר', 'ב', 'ת', 'א', 'ה', 'ו', 'י']
const SAFE_PRESET_7: string[] = ['מ', 'ל', 'ש', 'ר', 'ב', 'ת', 'א']

/**
 * Pick n distinct letters using weighted random selection.
 */
export function pickWeightedLetters(n: number): string[] {
  const available = [...WEIGHTED_LETTERS]
  const picked: string[] = []
  const count = Math.min(n, available.length)

  for (let i = 0; i < count; i++) {
    const totalWeight = available.reduce((sum, l) => sum + l.weight, 0)
    let rand = Math.random() * totalWeight
    let idx = 0
    for (let j = 0; j < available.length; j++) {
      rand -= available[j].weight
      if (rand <= 0) {
        idx = j
        break
      }
    }
    picked.push(available[idx].letter)
    available.splice(idx, 1)
  }

  return picked
}

// Sofit mappings for canFormWord
const REGULAR_TO_SOFIT: Record<string, string> = {
  'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ',
}
const SOFIT_TO_REGULAR: Record<string, string> = {
  'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ',
}

/**
 * Check if a word can be formed from the given letter set.
 * Since letters are NOT consumed, we just check set membership.
 * Handles sofit: tiles show regular forms, dictionary may have sofit at end.
 */
export function canFormWord(word: string, letters: string[]): boolean {
  const letterSet = new Set(letters)
  // Expand with sofit variants
  for (const l of letters) {
    if (REGULAR_TO_SOFIT[l]) letterSet.add(REGULAR_TO_SOFIT[l])
    if (SOFIT_TO_REGULAR[l]) letterSet.add(SOFIT_TO_REGULAR[l])
  }
  for (const char of word) {
    if (!letterSet.has(char)) return false
  }
  return true
}

/**
 * Find all dictionary words formable from the given letters.
 */
export function getFormableWords(letters: string[]): string[] {
  return getWordsFromLetters(letters)
}

/**
 * Check if at least `minWords` valid words can be formed.
 */
function checkSolvability(letters: string[], minWords: number = 2): boolean {
  let count = 0
  for (const word of getAllWords()) {
    if (canFormWord(word, letters)) {
      count++
      if (count >= minWords) return true
    }
  }
  return false
}

/**
 * Generate a stage: n letters + target length.
 * Ensures solvability (at least 2 formable words).
 */
export function generateStage(letterCount: number = 10, targetLength: number = 15): {
  letters: string[]
  targetLength: number
} {
  for (let attempt = 0; attempt < 10; attempt++) {
    const letters = pickWeightedLetters(letterCount)
    if (checkSolvability(letters, 2)) {
      return { letters, targetLength }
    }
  }

  // Fallback to guaranteed safe preset
  const preset = letterCount >= 10 ? [...SAFE_PRESET_10] : [...SAFE_PRESET_7]
  return { letters: preset.slice(0, letterCount), targetLength }
}

/**
 * Generate a round for Quick Game mode.
 * 10 letters, random target length 13-16.
 */
export function generateRound(): { letters: string[]; targetLength: number } {
  const targetLengths = [13, 14, 15, 16]
  const targetLength = targetLengths[Math.floor(Math.random() * targetLengths.length)]
  return generateStage(10, targetLength)
}

/**
 * Calculate score for a valid word.
 */
export function scoreWord(word: string): number {
  const len = word.length
  let score = len * 10
  if (len >= 4) score += 10
  if (len >= 6) score += 25
  return score
}

/** Perfect Fit bonus. */
export function perfectFitBonus(): number {
  return 100
}

/** Stage clear bonus (Endless / Score Rush). */
export function stageClearBonus(): number {
  return 50
}

/** Penalty for invalid word attempt. */
export function invalidWordPenalty(): number {
  return -10
}

/**
 * Get the shortest word length formable from current letters.
 * Returns Infinity if no words are formable.
 */
export function shortestFormableWordLength(letters: string[]): number {
  let min = Infinity
  for (const word of getAllWords()) {
    if (canFormWord(word, letters) && word.length < min) {
      min = word.length
    }
  }
  return min
}

/**
 * Score Rush: get the score target for a given stage.
 * Stage 1 = 80, Stage 2 = 130, Stage 3 = 180, each subsequent +60.
 */
export function getScoreTarget(stage: number): number {
  if (stage === 1) return 80
  if (stage === 2) return 130
  return 180 + (stage - 3) * 60
}

/**
 * Score Rush: get the timer duration for a given stage.
 * Stage 1 = 90s, Stage 2 = 75s, Stage 3 = 60s, Stage 4 = 50s, Stage 5+ = 40s.
 */
export function getStageTimer(stage: number): number {
  if (stage === 1) return 90
  if (stage === 2) return 75
  if (stage === 3) return 60
  if (stage === 4) return 50
  return 40
}

/**
 * Endless: get letter count for a given stage.
 * Stage 1 = 10, each stage -1, floor at 4.
 */
export function getEndlessLetterCount(stage: number): number {
  return Math.max(4, 11 - stage)
}
