import { create } from 'zustand'
import { pickWeightedLetters, scoreWord, shuffleCost } from './game'
import { isValidWord } from './dictionary'
import { FeedbackMessage } from './store'

export type Direction = 'left' | 'up' | 'right' | 'down'
export type GridStatus = 'idle' | 'playing' | 'won' | 'lost' | 'stage_clear'
export type GridDifficulty = 'normal' | 'shapes'

const DIRECTION_CYCLE: Direction[] = ['right', 'down', 'left', 'up']

interface GridCell {
  char: string | null
  filled: boolean // true = part of a valid word (white)
  active: boolean // false = disabled cell (not part of shape)
}

export interface PlacedWord {
  word: string
  row: number
  col: number
  direction: Direction
  cells: { row: number; col: number }[]
}

/**
 * Procedural shape generator — creates random connected shapes.
 * Every shape guarantees at least 2 adjacent cells in a line (for words).
 */
function generateRandomShape(targetCells: number, maxSize: number): boolean[][] {
  const size = maxSize
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  // Start from center
  const center = Math.floor(size / 2)
  grid[center][center] = true
  let count = 1

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]

  while (count < targetCells) {
    // Pick a random active cell and grow from it
    const activeCells: [number, number][] = []
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c]) activeCells.push([r, c])
      }
    }
    const [ar, ac] = activeCells[Math.floor(Math.random() * activeCells.length)]
    const [dr, dc] = directions[Math.floor(Math.random() * 4)]
    const nr = ar + dr
    const nc = ac + dc
    if (nr >= 0 && nr < size && nc >= 0 && nc < size && !grid[nr][nc]) {
      grid[nr][nc] = true
      count++
    }
  }

  // Trim empty rows/cols
  let minR = size, maxR = 0, minC = size, maxC = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        minR = Math.min(minR, r); maxR = Math.max(maxR, r)
        minC = Math.min(minC, c); maxC = Math.max(maxC, c)
      }
    }
  }
  return grid.slice(minR, maxR + 1).map((row) => row.slice(minC, maxC + 1))
}

function getShapeDifficulty(stage: number): { targetCells: number; maxSize: number } {
  // Progressive: more cells and bigger canvas as stages increase
  if (stage <= 2) return { targetCells: 8 + stage, maxSize: 5 }
  if (stage <= 4) return { targetCells: 10 + stage, maxSize: 6 }
  if (stage <= 7) return { targetCells: 12 + stage, maxSize: 7 }
  if (stage <= 10) return { targetCells: 15 + stage, maxSize: 8 }
  return { targetCells: Math.min(18 + stage, 45), maxSize: 9 }
}

function pickShape(stage: number): { grid: GridCell[][], rows: number, cols: number } {
  const { targetCells, maxSize } = getShapeDifficulty(stage)
  const shape = generateRandomShape(targetCells, maxSize)
  const rows = shape.length
  const cols = shape[0]?.length || 1
  const grid: GridCell[][] = shape.map((row) =>
    row.map((active) => ({ char: null, filled: !active, active }))
  )
  return { grid, rows, cols }
}

interface GridState {
  // Grid
  gridRows: number
  gridCols: number
  grid: GridCell[][]
  placedWords: PlacedWord[]
  difficulty: GridDifficulty

  // Selection
  selectedCell: { row: number; col: number } | null
  direction: Direction

  // Game
  letters: string[]
  currentWord: string
  usedTileIndices: number[]
  score: number
  timeLeft: number
  status: GridStatus
  feedback: FeedbackMessage | null
  stage: number
  muted: boolean
  bestStageGrid: number
  bestStageShapes: number

  // Actions
  initBest: () => void
  startGrid: (difficulty?: GridDifficulty) => void
  nextGridStage: () => void
  selectCell: (row: number, col: number) => void
  addLetterByIndex: (index: number) => void
  clearWord: () => void
  submitWord: () => void
  undoLastWord: () => void
  tick: () => void
  shuffleLetters: () => void
  toggleMute: () => void
  goHome: () => void
}

function getGridSize(stage: number): { rows: number; cols: number } {
  // Progressive grid sizes
  const sizes = [
    { rows: 3, cols: 3 },  // stage 1: 9 cells
    { rows: 3, cols: 4 },  // stage 2: 12 cells
    { rows: 4, cols: 4 },  // stage 3: 16 cells
    { rows: 4, cols: 5 },  // stage 4: 20 cells
    { rows: 5, cols: 5 },  // stage 5: 25 cells
    { rows: 5, cols: 6 },  // stage 6+: 30 cells
  ]
  return sizes[Math.min(stage - 1, sizes.length - 1)]
}

function createEmptyGrid(rows: number, cols: number): GridCell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ char: null, filled: false, active: true }))
  )
}

function getWordCells(
  row: number, col: number, direction: Direction, length: number
): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = []
  for (let i = 0; i < length; i++) {
    switch (direction) {
      case 'right': cells.push({ row, col: col - i }); break // RTL: right means filling leftward visually
      case 'left': cells.push({ row, col: col + i }); break
      case 'down': cells.push({ row: row + i, col }); break
      case 'up': cells.push({ row: row - i, col }); break
    }
  }
  return cells
}

function loadBest(key: string): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(key) || '0', 10)
}
function saveBest(key: string, value: number) {
  if (typeof window === 'undefined') return
  const current = loadBest(key)
  if (value > current) localStorage.setItem(key, String(value))
}

export const useGridStore = create<GridState>((set, get) => ({
  gridRows: 3,
  gridCols: 3,
  grid: [],
  placedWords: [],
  difficulty: 'normal' as GridDifficulty,
  selectedCell: null,
  direction: 'right',
  letters: [],
  currentWord: '',
  usedTileIndices: [],
  score: 0,
  timeLeft: 120,
  status: 'idle',
  feedback: null,
  stage: 1,
  muted: false,
  bestStageGrid: 0,
  bestStageShapes: 0,

  initBest: () => {
    set({
      bestStageGrid: loadBest('bestStageGrid'),
      bestStageShapes: loadBest('bestStageShapes'),
      muted: typeof window !== 'undefined' && localStorage.getItem('muted') === 'true',
    })
  },

  startGrid: (difficulty: GridDifficulty = 'normal') => {
    const letters = pickWeightedLetters(10)
    if (difficulty === 'shapes') {
      const { grid, rows, cols } = pickShape(1)
      set({
        difficulty,
        gridRows: rows,
        gridCols: cols,
        grid,
        placedWords: [],
        selectedCell: null,
        direction: 'right',
        letters,
        currentWord: '',
        usedTileIndices: [],
        score: 0,
        timeLeft: 120,
        status: 'playing',
        feedback: null,
        stage: 1,
      })
    } else {
      const { rows, cols } = getGridSize(1)
      set({
        difficulty,
        gridRows: rows,
        gridCols: cols,
        grid: createEmptyGrid(rows, cols),
        placedWords: [],
        selectedCell: null,
        direction: 'right',
        letters,
        currentWord: '',
        usedTileIndices: [],
        score: 0,
        timeLeft: 120,
        status: 'playing',
        feedback: null,
        stage: 1,
      })
    }
  },

  nextGridStage: () => {
    const { stage, score, difficulty } = get()
    const newStage = stage + 1
    const letters = pickWeightedLetters(10)
    const bestKey = difficulty === 'shapes' ? 'bestStageShapes' : 'bestStageGrid'
    saveBest(bestKey, stage)

    if (difficulty === 'shapes') {
      const { grid, rows, cols } = pickShape(newStage)
      set({
        gridRows: rows, gridCols: cols, grid, placedWords: [], selectedCell: null, direction: 'right',
        letters, currentWord: '', usedTileIndices: [], score: score + 50, timeLeft: 120,
        status: 'playing', feedback: null, stage: newStage,
        bestStageShapes: Math.max(get().bestStageShapes, stage),
      })
    } else {
      const { rows, cols } = getGridSize(newStage)
      set({
        gridRows: rows, gridCols: cols, grid: createEmptyGrid(rows, cols), placedWords: [], selectedCell: null, direction: 'right',
        letters, currentWord: '', usedTileIndices: [], score: score + 50, timeLeft: 120,
        status: 'playing', feedback: null, stage: newStage,
        bestStageGrid: Math.max(get().bestStageGrid, stage),
      })
    }
  },

  selectCell: (row: number, col: number) => {
    const { selectedCell, direction, status } = get()
    if (status !== 'playing') return

    // If tapping the same cell, cycle direction
    if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
      const idx = DIRECTION_CYCLE.indexOf(direction)
      const nextDir = DIRECTION_CYCLE[(idx + 1) % DIRECTION_CYCLE.length]
      set({ direction: nextDir, feedback: null })
    } else {
      set({ selectedCell: { row, col }, direction: 'right', currentWord: '', usedTileIndices: [], feedback: null })
    }
  },

  addLetterByIndex: (index: number) => {
    const { status, currentWord, usedTileIndices, letters, selectedCell } = get()
    if (status !== 'playing' || !selectedCell) return
    if (usedTileIndices.includes(index)) return

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
    const { status, currentWord, selectedCell, direction, grid, gridRows, gridCols, placedWords, score } = get()
    if (status !== 'playing' || !currentWord || !selectedCell) return

    // Check dictionary
    if (!isValidWord(currentWord)) {
      set({ feedback: { text: '.לא במילון ✗', type: 'error' }, currentWord: '', usedTileIndices: [], score: score - 10 })
      return
    }

    // Check duplicate
    if (placedWords.some((pw) => pw.word === currentWord)) {
      set({ feedback: { text: '.מילה כבר שומשה ✗', type: 'error' }, currentWord: '', usedTileIndices: [] })
      return
    }

    // Calculate cells the word would occupy
    const cells = getWordCells(selectedCell.row, selectedCell.col, direction, currentWord.length)

    // Check bounds + active cells
    for (const c of cells) {
      if (c.row < 0 || c.row >= gridRows || c.col < 0 || c.col >= gridCols || !grid[c.row][c.col].active) {
        set({ feedback: { text: '.חורג מהרשת ✗', type: 'error' }, currentWord: '', usedTileIndices: [] })
        return
      }
    }

    // Check conflicts with existing chars
    for (let i = 0; i < cells.length; i++) {
      const existing = grid[cells[i].row][cells[i].col]
      if (existing.char !== null && existing.char !== currentWord[i]) {
        set({ feedback: { text: '.התנגשות עם אות קיימת ✗', type: 'error' }, currentWord: '', usedTileIndices: [] })
        return
      }
    }

    // Place the word!
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))
    for (let i = 0; i < cells.length; i++) {
      newGrid[cells[i].row][cells[i].col] = { char: currentWord[i], filled: true, active: true }
    }

    const wordScore = scoreWord(currentWord)
    const newPlacedWords = [...placedWords, { word: currentWord, row: selectedCell.row, col: selectedCell.col, direction, cells }]

    // Check win: all cells filled
    // Win: all active cells are filled (inactive cells don't count)
    const allFilled = newGrid.every((row) => row.every((cell) => !cell.active || cell.filled))

    if (allFilled) {
      const totalScore = score + wordScore // no perfect fit bonus
      saveBest('bestStageGrid', get().stage)
      set({
        grid: newGrid,
        placedWords: newPlacedWords,
        currentWord: '',
        usedTileIndices: [],
        score: totalScore,
        status: 'stage_clear',
        feedback: { text: `!הרשת מלאה 🎉 +50 בונוס שלב`, type: 'success' },
        bestStageGrid: Math.max(get().bestStageGrid, get().stage),
      })
    } else {
      set({
        grid: newGrid,
        placedWords: newPlacedWords,
        currentWord: '',
        usedTileIndices: [],
        score: score + wordScore,
        feedback: { text: `+${wordScore} נק׳ ✓`, type: 'success' },
      })
    }
  },

  undoLastWord: () => {
    const { status, placedWords, grid, score } = get()
    if (status !== 'playing' || placedWords.length === 0) return

    const last = placedWords[placedWords.length - 1]
    const wordScore = scoreWord(last.word)

    // Remove the word from grid — but only clear cells that aren't used by other words
    const otherWords = placedWords.slice(0, -1)
    const otherCellKeys = new Set<string>()
    for (const pw of otherWords) {
      for (const c of pw.cells) otherCellKeys.add(`${c.row},${c.col}`)
    }

    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))
    for (const c of last.cells) {
      if (!otherCellKeys.has(`${c.row},${c.col}`)) {
        newGrid[c.row][c.col] = { char: null, filled: false, active: true }
      }
    }

    set({
      grid: newGrid,
      placedWords: otherWords,
      currentWord: '',
      usedTileIndices: [],
      score: Math.max(0, score - wordScore),
      feedback: { text: `"${last.word}" הוסרה ↩`, type: 'info' },
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

  shuffleLetters: () => {
    const { status, score } = get()
    if (status !== 'playing' || score < shuffleCost()) {
      if (status === 'playing') set({ feedback: { text: `נדרשות ${shuffleCost()} נקודות ✗`, type: 'error' } })
      return
    }
    set({
      letters: pickWeightedLetters(get().letters.length),
      score: score - shuffleCost(),
      currentWord: '',
      usedTileIndices: [],
      feedback: { text: `!אותיות חדשות 🔀 (${shuffleCost()}- נק׳)`, type: 'info' },
    })
  },

  toggleMute: () => {
    const m = !get().muted
    set({ muted: m })
    if (typeof window !== 'undefined') localStorage.setItem('muted', String(m))
  },

  goHome: () => {
    set({ status: 'idle', feedback: null })
  },
}))
