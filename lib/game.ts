import { getAllWords, isValidWord } from './dictionary'

// Hebrew letters weighted by real frequency
const WEIGHTED_LETTERS: { letter: string; weight: number }[] = [
  // High frequency
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
  // Medium frequency
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

// Guaranteed safe preset — letters that form many common words
const SAFE_PRESET: string[] = ['מ', 'ל', 'ש', 'ר', 'ב', 'ת', 'א']

/**
 * Pick n distinct letters using weighted random selection.
 */
function pickWeightedLetters(n: number): string[] {
  const available = [...WEIGHTED_LETTERS]
  const picked: string[] = []

  for (let i = 0; i < n; i++) {
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
    available.splice(idx, 1) // remove to ensure distinct
  }

  return picked
}

/**
 * Check if a word can be formed from the given letter set.
 * Since letters are NOT consumed, we just check set membership.
 */
export function canFormWord(word: string, letters: string[]): boolean {
  const letterSet = new Set(letters)
  for (const char of word) {
    if (!letterSet.has(char)) return false
  }
  return true
}

/**
 * Find all dictionary words formable from the given letters.
 */
export function getFormableWords(letters: string[]): string[] {
  return getAllWords().filter((w) => canFormWord(w, letters))
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
 * Generate a new round: 7 letters + target length.
 * Ensures solvability (at least 2 formable words).
 */
export function generateRound(): { letters: string[]; targetLength: number } {
  const targetLengths = [13, 14, 15, 16]
  const targetLength = targetLengths[Math.floor(Math.random() * targetLengths.length)]

  for (let attempt = 0; attempt < 10; attempt++) {
    const letters = pickWeightedLetters(7)
    if (checkSolvability(letters, 2)) {
      return { letters, targetLength }
    }
  }

  // Fallback to guaranteed safe preset
  return { letters: [...SAFE_PRESET], targetLength }
}

/**
 * Calculate score for a valid word.
 */
export function scoreWord(word: string): number {
  const len = word.length
  let score = len * 10 // 10 pts per letter
  if (len >= 4) score += 10
  if (len >= 6) score += 25
  return score
}

/**
 * Perfect Fit bonus.
 */
export function perfectFitBonus(): number {
  return 100
}

/**
 * Penalty for invalid word attempt.
 */
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
