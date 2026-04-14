// src/firebase/index.js
// ⚠️ 請複製 .env.example 為 .env 並填入您的 Firebase 設定

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, setPersistence, browserSessionPersistence } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

// Auth
export const auth = getAuth(app)
setPersistence(auth, browserSessionPersistence)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ 
  prompt: 'select_account login consent',
  access_type: 'offline'
})

// Firestore (啟用離線快取，行動端在訊號弱時仍可讀取)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})

export default app
