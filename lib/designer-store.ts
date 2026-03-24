import { create } from 'zustand'
import { db, ref, fbSet, fbGet } from './firebase'

// ─── Types ───

export interface CustomLevel {
  shape: boolean[][]       // true = active cell
  rows: number
  cols: number
  timer: number            // seconds
}

export interface LevelPack {
  id: string
  name: string
  author: string
  levels: CustomLevel[]
  createdAt: number
}

export type DesignerStatus =
  | 'idle'          // not in designer
  | 'hub'           // viewing pack list
  | 'editing'       // editing a pack
  | 'playing'       // playing a custom pack
  | 'importing'     // entering import code

// ─── Helpers ───

function genPackId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let id = ''
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function loadPacks(): LevelPack[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('customPacks') || '[]')
  } catch { return [] }
}

function savePacks(packs: LevelPack[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('customPacks', JSON.stringify(packs))
}

function loadPackBest(packId: string): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(`customPack_${packId}_best`) || '0', 10)
}

function savePackBest(packId: string, score: number) {
  if (typeof window === 'undefined') return
  const current = loadPackBest(packId)
  if (score > current) localStorage.setItem(`customPack_${packId}_best`, String(score))
}

function createEmptyShape(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(true))
}

// ─── Store ───

interface DesignerState {
  status: DesignerStatus
  packs: LevelPack[]

  // Editor state
  editingPack: LevelPack | null
  editingLevelIdx: number          // which level is being edited (-1 = none)
  editorGridSize: { rows: number; cols: number }
  editorShape: boolean[][]
  editorTimer: number

  // Play state
  playingPack: LevelPack | null
  playingLevelIdx: number
  playTotalScore: number

  // Import
  importCode: string
  importError: string

  // Share
  shareCode: string | null

  // Actions
  initPacks: () => void
  openHub: () => void
  goHome: () => void

  // Pack CRUD
  createNewPack: () => void
  editPack: (packId: string) => void
  deletePack: (packId: string) => void
  savePack: () => void
  updatePackName: (name: string) => void
  updatePackAuthor: (author: string) => void

  // Level editing
  addLevel: () => void
  removeLevel: (idx: number) => void
  selectLevel: (idx: number) => void
  setEditorGridSize: (rows: number, cols: number) => void
  toggleCell: (row: number, col: number) => void
  setEditorTimer: (timer: number) => void
  saveLevelTopack: () => void

  // Play
  startPlayPack: (packId: string) => void
  onLevelComplete: (score: number) => void
  onLevelFail: () => void

  // Share / Import
  sharePack: (packId: string) => Promise<void>
  setImportCode: (code: string) => void
  importPack: () => Promise<void>
}

export const useDesignerStore = create<DesignerState>((set, get) => ({
  status: 'idle',
  packs: [],
  editingPack: null,
  editingLevelIdx: -1,
  editorGridSize: { rows: 5, cols: 5 },
  editorShape: createEmptyShape(5, 5),
  editorTimer: 120,
  playingPack: null,
  playingLevelIdx: 0,
  playTotalScore: 0,
  importCode: '',
  importError: '',
  shareCode: null,

  initPacks: () => {
    set({ packs: loadPacks() })
  },

  openHub: () => {
    set({ status: 'hub', packs: loadPacks(), shareCode: null, importError: '' })
  },

  goHome: () => {
    set({
      status: 'idle',
      editingPack: null,
      editingLevelIdx: -1,
      playingPack: null,
      playingLevelIdx: 0,
      playTotalScore: 0,
      shareCode: null,
      importCode: '',
      importError: '',
    })
  },

  // ─── Pack CRUD ───

  createNewPack: () => {
    const pack: LevelPack = {
      id: genPackId(),
      name: '',
      author: '',
      levels: [],
      createdAt: Date.now(),
    }
    set({ status: 'editing', editingPack: pack, editingLevelIdx: -1, shareCode: null })
  },

  editPack: (packId: string) => {
    const pack = get().packs.find((p) => p.id === packId)
    if (pack) {
      set({ status: 'editing', editingPack: { ...pack, levels: [...pack.levels] }, editingLevelIdx: -1, shareCode: null })
    }
  },

  deletePack: (packId: string) => {
    const packs = get().packs.filter((p) => p.id !== packId)
    savePacks(packs)
    set({ packs })
  },

  savePack: () => {
    const { editingPack, packs } = get()
    if (!editingPack) return
    const idx = packs.findIndex((p) => p.id === editingPack.id)
    const newPacks = [...packs]
    if (idx >= 0) newPacks[idx] = editingPack
    else newPacks.push(editingPack)
    savePacks(newPacks)
    set({ packs: newPacks })
  },

  updatePackName: (name: string) => {
    const { editingPack } = get()
    if (editingPack) set({ editingPack: { ...editingPack, name } })
  },

  updatePackAuthor: (author: string) => {
    const { editingPack } = get()
    if (editingPack) set({ editingPack: { ...editingPack, author } })
  },

  // ─── Level editing ───

  addLevel: () => {
    const { editingPack, editorGridSize } = get()
    if (!editingPack) return
    const newLevel: CustomLevel = {
      shape: createEmptyShape(editorGridSize.rows, editorGridSize.cols),
      rows: editorGridSize.rows,
      cols: editorGridSize.cols,
      timer: 120,
    }
    const newLevels = [...editingPack.levels, newLevel]
    set({
      editingPack: { ...editingPack, levels: newLevels },
      editingLevelIdx: newLevels.length - 1,
      editorShape: newLevel.shape.map((r) => [...r]),
      editorGridSize: { rows: newLevel.rows, cols: newLevel.cols },
      editorTimer: newLevel.timer,
    })
  },

  removeLevel: (idx: number) => {
    const { editingPack } = get()
    if (!editingPack) return
    const newLevels = editingPack.levels.filter((_, i) => i !== idx)
    set({
      editingPack: { ...editingPack, levels: newLevels },
      editingLevelIdx: -1,
    })
  },

  selectLevel: (idx: number) => {
    const { editingPack } = get()
    if (!editingPack || idx < 0 || idx >= editingPack.levels.length) return
    const level = editingPack.levels[idx]
    set({
      editingLevelIdx: idx,
      editorShape: level.shape.map((r) => [...r]),
      editorGridSize: { rows: level.rows, cols: level.cols },
      editorTimer: level.timer,
    })
  },

  setEditorGridSize: (rows: number, cols: number) => {
    set({
      editorGridSize: { rows, cols },
      editorShape: createEmptyShape(rows, cols),
    })
  },

  toggleCell: (row: number, col: number) => {
    const shape = get().editorShape.map((r) => [...r])
    shape[row][col] = !shape[row][col]
    set({ editorShape: shape })
  },

  setEditorTimer: (timer: number) => {
    set({ editorTimer: timer })
  },

  saveLevelTopack: () => {
    const { editingPack, editingLevelIdx, editorShape, editorGridSize, editorTimer } = get()
    if (!editingPack || editingLevelIdx < 0) return
    const level: CustomLevel = {
      shape: editorShape.map((r) => [...r]),
      rows: editorGridSize.rows,
      cols: editorGridSize.cols,
      timer: editorTimer,
    }
    const newLevels = [...editingPack.levels]
    newLevels[editingLevelIdx] = level
    set({ editingPack: { ...editingPack, levels: newLevels } })
  },

  // ─── Play ───

  startPlayPack: (packId: string) => {
    const pack = get().packs.find((p) => p.id === packId)
    if (!pack || pack.levels.length === 0) return
    set({
      status: 'playing',
      playingPack: pack,
      playingLevelIdx: 0,
      playTotalScore: 0,
    })
  },

  onLevelComplete: (score: number) => {
    const { playingPack, playingLevelIdx, playTotalScore } = get()
    if (!playingPack) return
    const newTotal = playTotalScore + score + 50 // stage clear bonus
    const nextIdx = playingLevelIdx + 1
    if (nextIdx >= playingPack.levels.length) {
      // All levels complete!
      savePackBest(playingPack.id, newTotal)
      set({ playTotalScore: newTotal, playingLevelIdx: nextIdx })
    } else {
      set({ playTotalScore: newTotal, playingLevelIdx: nextIdx })
    }
  },

  onLevelFail: () => {
    const { playingPack, playTotalScore } = get()
    if (playingPack) savePackBest(playingPack.id, playTotalScore)
  },

  // ─── Share / Import ───

  sharePack: async (packId: string) => {
    const pack = get().packs.find((p) => p.id === packId)
    if (!pack || !db) return
    await fbSet(ref(db, `packs/${pack.id}`), {
      name: pack.name,
      author: pack.author,
      levels: pack.levels,
      createdAt: pack.createdAt,
    })
    set({ shareCode: pack.id })
  },

  setImportCode: (code: string) => {
    set({ importCode: code.trim().toLowerCase(), importError: '' })
  },

  importPack: async () => {
    const { importCode, packs } = get()
    if (!importCode || !db) {
      set({ importError: 'הכנס קוד' })
      return
    }
    // Check if already have this pack
    if (packs.find((p) => p.id === importCode)) {
      set({ importError: 'חבילה כבר קיימת' })
      return
    }
    try {
      const snapshot = await fbGet(ref(db, `packs/${importCode}`))
      const val = snapshot.val()
      if (!val) {
        set({ importError: 'חבילה לא נמצאה' })
        return
      }
      const pack: LevelPack = {
        id: importCode,
        name: val.name || 'ללא שם',
        author: val.author || '',
        levels: val.levels || [],
        createdAt: val.createdAt || Date.now(),
      }
      const newPacks = [...packs, pack]
      savePacks(newPacks)
      set({ packs: newPacks, importCode: '', importError: '', status: 'hub' })
    } catch {
      set({ importError: 'שגיאה בייבוא' })
    }
  },
}))
