import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

let app = null
let db = null
let auth = null

export function initFirebase() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase config not set. Realtime sync disabled.')
    return { app: null, db: null, auth: null }
  }

  if (!app) {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)
  }

  return { app, db, auth }
}

export function getDb() {
  if (!db) initFirebase()
  return db
}

export function getAuthInstance() {
  if (!auth) initFirebase()
  return auth
}

export const googleProvider = new GoogleAuthProvider()
