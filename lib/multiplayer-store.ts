import { create } from 'zustand'
import { supabase } from './supabase'
import { generateStage, scoreWord, pickWeightedLetters } from './game'
import { isValidWord } from './dictionary'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type MultiplayerStatus =
  | 'idle'
  | 'choose'      // choosing create or join
  | 'creating'
  | 'waiting'     // host waiting for players
  | 'joining'
  | 'lobby'       // in lobby, waiting for host to start
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

interface MultiplayerState {
  // Connection
  roomCode: string | null
  playerId: string
  playerName: string
  isHost: boolean
  status: MultiplayerStatus
  channel: RealtimeChannel | null

  // Room
  players: PlayerState[]
  maxPlayers: number

  // Shared game params
  letters: string[]
  targetLength: number

  // Local game state
  filledWords: string[]
  currentWord: string
  usedTileIndices: number[]
  score: number
  timeLeft: number
  feedback: { text: string; type: 'success' | 'error' | 'warning' | 'info' } | null
  muted: boolean

  // Countdown
  countdownValue: number | null

  // Leave confirmation
  showLeaveConfirm: boolean

  // Actions
  createRoom: () => Promise<string | null>
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

function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).substring(2, 10)
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I/O to avoid confusion
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  roomCode: null,
  playerId: '',
  playerName: '',
  isHost: false,
  status: 'idle',
  channel: null,
  players: [],
  maxPlayers: 6,
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

  createRoom: async () => {
    if (!supabase) return null
    set({ status: 'creating' })

    const playerId = generatePlayerId()
    const code = generateRoomCode()
    const letters = pickWeightedLetters(10)
    const targetLength = 15

    // Insert room
    const { error } = await supabase.from('mp_rooms').insert({
      code,
      host_id: playerId,
      letters,
      target_length: targetLength,
      status: 'waiting',
      players: [{ id: playerId, name: 'שחקן 1' }],
    })

    if (error) {
      console.error('Create room error:', error)
      set({ status: 'idle' })
      return null
    }

    // Subscribe to channel
    const channel = supabase.channel(`room:${code}`)

    channel.on('broadcast', { event: 'player_joined' }, ({ payload }) => {
      const state = get()
      if (payload.playerId !== state.playerId) {
        const exists = state.players.some((p) => p.id === payload.playerId)
        if (!exists) {
          set({
            players: [...state.players, {
              id: payload.playerId,
              name: payload.name || `שחקן ${state.players.length + 1}`,
              score: 0,
              filledLength: 0,
              finished: false,
              perfectFit: false,
            }],
          })
        }
      }
    })

    channel.on('broadcast', { event: 'game_state' }, ({ payload }) => {
      const state = get()
      if (payload.playerId !== state.playerId) {
        set({
          players: state.players.map((p) =>
            p.id === payload.playerId
              ? { ...p, score: payload.score, filledLength: payload.filledLength, finished: payload.finished, perfectFit: payload.perfectFit }
              : p
          ),
        })
      }
    })

    channel.on('broadcast', { event: 'countdown' }, ({ payload }) => {
      set({ countdownValue: payload.value })
      if (payload.value === 0) {
        setTimeout(() => {
          set({ status: 'playing', countdownValue: null, timeLeft: 90 })
        }, 800)
      }
    })

    channel.on('broadcast', { event: 'player_left' }, ({ payload }) => {
      set({
        players: get().players.filter((p) => p.id !== payload.playerId),
      })
    })

    await channel.subscribe()

    set({
      roomCode: code,
      playerId,
      playerName: 'שחקן 1',
      isHost: true,
      status: 'waiting',
      channel,
      letters,
      targetLength,
      players: [{
        id: playerId,
        name: 'שחקן 1',
        score: 0,
        filledLength: 0,
        finished: false,
        perfectFit: false,
      }],
      filledWords: [],
      currentWord: '',
      usedTileIndices: [],
      score: 0,
      feedback: null,
    })

    return code
  },

  joinRoom: async (code: string) => {
    if (!supabase) return { ok: false, error: 'No connection' }
    set({ status: 'joining' })

    const upperCode = code.toUpperCase()

    // Check room exists
    const { data: room, error } = await supabase
      .from('mp_rooms')
      .select('*')
      .eq('code', upperCode)
      .single()

    if (error || !room) {
      set({ status: 'idle' })
      return { ok: false, error: 'חדר לא נמצא' }
    }

    if (room.status !== 'waiting') {
      set({ status: 'idle' })
      return { ok: false, error: 'המשחק כבר התחיל' }
    }

    if ((room.players || []).length >= 6) {
      set({ status: 'idle' })
      return { ok: false, error: 'החדר מלא' }
    }

    const playerId = generatePlayerId()
    const playerNum = (room.players || []).length + 1
    const playerName = `שחקן ${playerNum}`

    // Update room
    const newPlayers = [...(room.players || []), { id: playerId, name: playerName }]
    await supabase.from('mp_rooms').update({ players: newPlayers }).eq('code', upperCode)

    // Subscribe to channel
    const channel = supabase.channel(`room:${upperCode}`)

    channel.on('broadcast', { event: 'player_joined' }, ({ payload }) => {
      const state = get()
      if (payload.playerId !== state.playerId) {
        const exists = state.players.some((p) => p.id === payload.playerId)
        if (!exists) {
          set({
            players: [...state.players, {
              id: payload.playerId,
              name: payload.name || `שחקן`,
              score: 0,
              filledLength: 0,
              finished: false,
              perfectFit: false,
            }],
          })
        }
      }
    })

    channel.on('broadcast', { event: 'game_state' }, ({ payload }) => {
      const state = get()
      if (payload.playerId !== state.playerId) {
        set({
          players: state.players.map((p) =>
            p.id === payload.playerId
              ? { ...p, score: payload.score, filledLength: payload.filledLength, finished: payload.finished, perfectFit: payload.perfectFit }
              : p
          ),
        })
      }
    })

    channel.on('broadcast', { event: 'countdown' }, ({ payload }) => {
      set({ countdownValue: payload.value })
      if (payload.value === 0) {
        setTimeout(() => {
          set({ status: 'playing', countdownValue: null, timeLeft: 90 })
        }, 800)
      }
    })

    channel.on('broadcast', { event: 'player_left' }, ({ payload }) => {
      set({
        players: get().players.filter((p) => p.id !== payload.playerId),
      })
    })

    await channel.subscribe()

    // Build initial player list from room data
    const existingPlayers: PlayerState[] = (room.players || []).map((p: any, i: number) => ({
      id: p.id,
      name: p.name || `שחקן ${i + 1}`,
      score: 0,
      filledLength: 0,
      finished: false,
      perfectFit: false,
    }))

    // Add self
    existingPlayers.push({
      id: playerId,
      name: playerName,
      score: 0,
      filledLength: 0,
      finished: false,
      perfectFit: false,
    })

    set({
      roomCode: upperCode,
      playerId,
      playerName,
      isHost: false,
      status: 'lobby',
      channel,
      letters: room.letters,
      targetLength: room.target_length,
      players: existingPlayers,
      filledWords: [],
      currentWord: '',
      usedTileIndices: [],
      score: 0,
      feedback: null,
    })

    // Broadcast that we joined
    channel.send({
      type: 'broadcast',
      event: 'player_joined',
      payload: { playerId, name: playerName },
    })

    return { ok: true }
  },

  startMatch: () => {
    const { channel, isHost } = get()
    if (!channel || !isHost) return

    // Countdown: 3, 2, 1, GO!
    set({ status: 'countdown' })
    const values = [3, 2, 1, 0]
    values.forEach((v, i) => {
      setTimeout(() => {
        channel.send({ type: 'broadcast', event: 'countdown', payload: { value: v } })
        set({ countdownValue: v })
        if (v === 0) {
          setTimeout(() => {
            set({ status: 'playing', countdownValue: null, timeLeft: 90 })
          }, 800)
        }
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

    // Broadcast
    get().broadcastState()
  },

  undoLastWord: () => {
    const { status, filledWords, score } = get()
    if (status !== 'playing' || filledWords.length === 0) return
    const last = filledWords[filledWords.length - 1]
    const ws = scoreWord(last)
    set({
      filledWords: filledWords.slice(0, -1),
      score: Math.max(0, score - ws),
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
    const { channel, playerId, score, filledWords, targetLength, status } = get()
    if (!channel) return
    const filledLen = filledWords.reduce((s, w) => s + w.length, 0)
    channel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: {
        playerId,
        score,
        filledLength: filledLen,
        finished: status === 'finished',
        perfectFit: filledLen === targetLength,
      },
    })
  },

  setShowLeaveConfirm: (show: boolean) => set({ showLeaveConfirm: show }),

  leaveGame: () => {
    const { channel, playerId } = get()
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'player_left',
        payload: { playerId },
      })
    }
    get().cleanup()
  },

  cleanup: () => {
    const { channel } = get()
    if (channel) {
      supabase?.removeChannel(channel)
    }
    set({
      roomCode: null,
      playerId: '',
      isHost: false,
      status: 'idle',
      channel: null,
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
    })
  },

  toggleMute: () => {
    const m = !get().muted
    set({ muted: m })
    if (typeof window !== 'undefined') localStorage.setItem('muted', String(m))
  },
}))
