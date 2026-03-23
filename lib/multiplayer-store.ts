import { create } from 'zustand'
import { db, ref, fbSet, fbGet, onValue, remove, update } from './firebase'
import { pickWeightedLetters, scoreWord } from './game'
import { isValidWord } from './dictionary'
import type { Unsubscribe } from 'firebase/database'

export type MultiplayerStatus =
  | 'idle'
  | 'choose'
  | 'creating'
  | 'waiting'
  | 'joining'
  | 'lobby'
  | 'countdown'
  | 'playing'
  | 'finished'

export interface PlayerState {
  id: string
  name: string
  score: number
  filledLength: number
  finished: boolean
  perfectFit: boolean
}

export type MPGameMode = 'quick' | 'endless' | 'score_rush' | 'grid'

interface MultiplayerState {
  roomCode: string | null
  playerId: string
  playerName: string
  isHost: boolean
  status: MultiplayerStatus
  gameMode: MPGameMode
  maxPlayers: number
  players: PlayerState[]
  letters: string[]
  targetLength: number
  filledWords: string[]
  currentWord: string
  usedTileIndices: number[]
  score: number
  timeLeft: number
  feedback: { text: string; type: 'success' | 'error' | 'warning' | 'info' } | null
  muted: boolean
  countdownValue: number | null
  showLeaveConfirm: boolean
  _unsubscribers: Unsubscribe[]

  createRoom: (mode: MPGameMode, maxPlayers: number) => Promise<string | null>
  joinRoom: (code: string) => Promise<{ ok: boolean; error?: string }>
  startMatch: () => void
  addLetterByIndex: (index: number) => void
  clearWord: () => void
  submitWord: () => void
  undoLastWord: () => void
  tick: () => void
  broadcastState: () => void
  setShowLeaveConfirm: (show: boolean) => void
  leaveGame: () => void
  cleanup: () => void
  toggleMute: () => void
}

function genId(): string {
  return 'p_' + Math.random().toString(36).substring(2, 10)
}

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  roomCode: null,
  playerId: '',
  playerName: '',
  isHost: false,
  status: 'idle',
  gameMode: 'quick',
  maxPlayers: 6,
  players: [],
  letters: [],
  targetLength: 15,
  filledWords: [],
  currentWord: '',
  usedTileIndices: [],
  score: 0,
  timeLeft: 90,
  feedback: null,
  muted: typeof window !== 'undefined' && localStorage.getItem('muted') === 'true',
  countdownValue: null,
  showLeaveConfirm: false,
  _unsubscribers: [],

  createRoom: async (mode: MPGameMode, maxPlayers: number) => {
    if (!db) return null
    set({ status: 'creating' })

    const playerId = genId()
    const code = genCode()
    const letters = pickWeightedLetters(10)
    const targetLengths = [13, 14, 15, 16]
    const targetLength = mode === 'quick'
      ? targetLengths[Math.floor(Math.random() * targetLengths.length)]
      : 15

    const roomRef = ref(db, `rooms/${code}`)
    const playerData: PlayerState = { id: playerId, name: 'שחקן 1', score: 0, filledLength: 0, finished: false, perfectFit: false }

    await fbSet(roomRef, {
      code,
      hostId: playerId,
      gameMode: mode,
      maxPlayers,
      letters,
      targetLength,
      status: 'waiting',
      players: { [playerId]: playerData },
      countdown: null,
    })

    // Listen for player changes
    const playersRef = ref(db, `rooms/${code}/players`)
    const unsub1 = onValue(playersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const playerList: PlayerState[] = Object.values(data)
        set({ players: playerList })
      }
    })

    // Listen for countdown
    const countdownRef = ref(db, `rooms/${code}/countdown`)
    const unsub2 = onValue(countdownRef, (snapshot) => {
      const val = snapshot.val()
      if (val !== null && val !== undefined) {
        set({ countdownValue: val })
        if (val === 0) {
          setTimeout(() => {
            set({ status: 'playing', countdownValue: null, timeLeft: 90 })
          }, 800)
        }
      }
    })

    // Listen for room status
    const statusRef = ref(db, `rooms/${code}/status`)
    const unsub3 = onValue(statusRef, (snapshot) => {
      const val = snapshot.val()
      if (val === 'countdown' && get().status === 'waiting') {
        set({ status: 'countdown' })
      }
    })

    set({
      roomCode: code,
      playerId,
      playerName: 'שחקן 1',
      isHost: true,
      status: 'waiting',
      gameMode: mode,
      maxPlayers,
      letters,
      targetLength,
      players: [playerData],
      filledWords: [],
      currentWord: '',
      usedTileIndices: [],
      score: 0,
      feedback: null,
      _unsubscribers: [unsub1, unsub2, unsub3],
    })

    return code
  },

  joinRoom: async (code: string) => {
    if (!db) return { ok: false, error: 'No connection' }
    set({ status: 'joining' })
    const upperCode = code.toUpperCase()

    const roomRef = ref(db, `rooms/${upperCode}`)
    const snapshot = await fbGet(roomRef)

    if (!snapshot.exists()) {
      set({ status: 'choose' })
      return { ok: false, error: 'חדר לא נמצא' }
    }

    const room = snapshot.val()
    if (room.status !== 'waiting') {
      set({ status: 'choose' })
      return { ok: false, error: 'המשחק כבר התחיל' }
    }

    const existingPlayers = room.players ? Object.keys(room.players).length : 0
    const roomMax = room.maxPlayers || 6
    if (existingPlayers >= roomMax) {
      set({ status: 'choose' })
      return { ok: false, error: 'החדר מלא' }
    }

    const playerId = genId()
    const playerName = `שחקן ${existingPlayers + 1}`
    const playerData: PlayerState = { id: playerId, name: playerName, score: 0, filledLength: 0, finished: false, perfectFit: false }

    // Add self to room
    await fbSet(ref(db, `rooms/${upperCode}/players/${playerId}`), playerData)

    // Listen for player changes
    const playersRef = ref(db, `rooms/${upperCode}/players`)
    const unsub1 = onValue(playersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        set({ players: Object.values(data) as PlayerState[] })
      }
    })

    // Listen for countdown
    const countdownRef = ref(db, `rooms/${upperCode}/countdown`)
    const unsub2 = onValue(countdownRef, (snapshot) => {
      const val = snapshot.val()
      if (val !== null && val !== undefined) {
        set({ countdownValue: val })
        if (val === 0) {
          setTimeout(() => {
            set({ status: 'playing', countdownValue: null, timeLeft: 90 })
          }, 800)
        }
      }
    })

    // Listen for room status
    const statusRef = ref(db, `rooms/${upperCode}/status`)
    const unsub3 = onValue(statusRef, (snapshot) => {
      const val = snapshot.val()
      if (val === 'countdown') {
        set({ status: 'countdown' })
      }
    })

    set({
      roomCode: upperCode,
      playerId,
      playerName,
      isHost: false,
      status: 'lobby',
      gameMode: room.gameMode || 'quick',
      maxPlayers: roomMax,
      letters: room.letters,
      targetLength: room.targetLength || 15,
      filledWords: [],
      currentWord: '',
      usedTileIndices: [],
      score: 0,
      feedback: null,
      _unsubscribers: [unsub1, unsub2, unsub3],
    })

    return { ok: true }
  },

  startMatch: () => {
    const { roomCode, isHost } = get()
    if (!db || !roomCode || !isHost) return
    const database = db // capture for closure

    update(ref(database, `rooms/${roomCode}`), { status: 'countdown' })
    set({ status: 'countdown' })

    const values = [3, 2, 1, 0]
    values.forEach((v, i) => {
      setTimeout(() => {
        fbSet(ref(database, `rooms/${roomCode}/countdown`), v)
      }, i * 1000)
    })
  },

  addLetterByIndex: (index: number) => {
    const { status, currentWord, targetLength, filledWords, letters, usedTileIndices } = get()
    if (status !== 'playing') return
    if (usedTileIndices.includes(index)) return
    const filledLen = filledWords.reduce((s, w) => s + w.length, 0)
    if (currentWord.length + 1 > targetLength - filledLen) return
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
    const { status, currentWord, filledWords, targetLength, score } = get()
    if (status !== 'playing' || !currentWord) return

    const filledLen = filledWords.reduce((s, w) => s + w.length, 0)
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
      set({ feedback: { text: '.לא במילון ✗', type: 'error' }, currentWord: '', usedTileIndices: [], score: score - 10 })
      return
    }

    const wordScore = scoreWord(currentWord)
    const newFilledWords = [...filledWords, currentWord]
    const newFilledLen = filledLen + currentWord.length
    const newRemaining = targetLength - newFilledLen
    let newScore = score + wordScore
    const isPerfectFit = newRemaining === 0
    if (isPerfectFit) newScore += 100

    set({
      filledWords: newFilledWords,
      currentWord: '',
      usedTileIndices: [],
      score: newScore,
      status: isPerfectFit ? 'finished' : 'playing',
      feedback: isPerfectFit
        ? { text: '!Perfect Fit 🎉', type: 'success' }
        : { text: `נשארו ${newRemaining} מקומות .מילה מצוינת ✓`, type: 'success' },
    })
    get().broadcastState()
  },

  undoLastWord: () => {
    const { status, filledWords, score } = get()
    if (status !== 'playing' || filledWords.length === 0) return
    const last = filledWords[filledWords.length - 1]
    set({
      filledWords: filledWords.slice(0, -1),
      score: Math.max(0, score - scoreWord(last)),
      currentWord: '',
      usedTileIndices: [],
      feedback: { text: `"${last}" הוסרה ↩`, type: 'info' },
    })
    get().broadcastState()
  },

  tick: () => {
    const { status, timeLeft } = get()
    if (status !== 'playing') return
    if (timeLeft <= 1) {
      set({ timeLeft: 0, status: 'finished' })
      get().broadcastState()
    } else {
      set({ timeLeft: timeLeft - 1 })
    }
  },

  broadcastState: () => {
    const { roomCode, playerId, score, filledWords, targetLength, status } = get()
    if (!db || !roomCode) return
    const filledLen = filledWords.reduce((s, w) => s + w.length, 0)
    update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
      score,
      filledLength: filledLen,
      finished: status === 'finished',
      perfectFit: filledLen === targetLength,
    })
  },

  setShowLeaveConfirm: (show: boolean) => set({ showLeaveConfirm: show }),

  leaveGame: () => {
    const { roomCode, playerId, isHost } = get()
    if (db && roomCode) {
      // Remove self from players
      remove(ref(db, `rooms/${roomCode}/players/${playerId}`))
      // If host, clean up room
      if (isHost) {
        remove(ref(db, `rooms/${roomCode}`))
      }
    }
    get().cleanup()
  },

  cleanup: () => {
    const { _unsubscribers } = get()
    _unsubscribers.forEach((unsub) => unsub())
    set({
      roomCode: null,
      playerId: '',
      isHost: false,
      status: 'idle',
      gameMode: 'quick',
      maxPlayers: 6,
      players: [],
      letters: [],
      filledWords: [],
      currentWord: '',
      usedTileIndices: [],
      score: 0,
      timeLeft: 90,
      feedback: null,
      countdownValue: null,
      showLeaveConfirm: false,
      _unsubscribers: [],
    })
  },

  toggleMute: () => {
    const m = !get().muted
    set({ muted: m })
    if (typeof window !== 'undefined') localStorage.setItem('muted', String(m))
  },
}))
