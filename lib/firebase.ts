import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, set, get, onValue, remove, update, type Database } from 'firebase/database'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize only once
const app = getApps().length === 0 && firebaseConfig.apiKey
  ? initializeApp(firebaseConfig)
  : getApps()[0] || null

export const db: Database | null = app ? getDatabase(app) : null

export function isFirebaseReady(): boolean {
  return db !== null
}

export { ref, set as fbSet, get as fbGet, onValue, remove, update }
