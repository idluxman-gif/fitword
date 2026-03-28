import { db, ref, fbGet, runTransaction } from './firebase'

export interface LeaderboardEntry {
  name: string
  value: number
  ts: number
}

const MAX_ENTRIES = 5

export async function fetchLeaderboard(mode: string): Promise<LeaderboardEntry[]> {
  if (!db) return []
  try {
    const snap = await fbGet(ref(db, `leaderboard/${mode}`))
    const val = snap.val()
    if (!val) return []
    return (Array.isArray(val) ? val : Object.values(val)) as LeaderboardEntry[]
  } catch {
    return []
  }
}

export async function checkQualifies(mode: string, value: number): Promise<boolean> {
  const board = await fetchLeaderboard(mode)
  if (board.length < MAX_ENTRIES) return value > 0
  return value > board[board.length - 1].value
}

export async function submitScore(
  mode: string,
  value: number,
  name: string,
): Promise<number | null> {
  if (!db || value <= 0) return null
  const boardRef = ref(db, `leaderboard/${mode}`)
  let resultRank: number | null = null

  await runTransaction(boardRef, (current) => {
    const board: LeaderboardEntry[] = current
      ? (Array.isArray(current) ? current : Object.values(current))
      : []

    if (board.length >= MAX_ENTRIES && value <= board[board.length - 1].value) {
      resultRank = null
      return // abort — doesn't qualify
    }

    const entry: LeaderboardEntry = { name, value, ts: Date.now() }
    board.push(entry)
    board.sort((a, b) => b.value - a.value)
    const trimmed = board.slice(0, MAX_ENTRIES)
    resultRank = trimmed.findIndex((e) => e === entry)
    if (resultRank === -1) resultRank = null
    return trimmed
  })

  return resultRank
}
