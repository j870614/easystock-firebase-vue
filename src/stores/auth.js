// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, googleProvider, db } from '@/firebase'

export const useAuthStore = defineStore('auth', () => {
  // ── State ────────────────────────────────────────────
  const user = ref(null)       // Firebase Auth 使用者物件
  const profile = ref(null)    // Firestore users/{uid} 文件
  const loading = ref(true)    // 初始化中（避免閃爍）
  const error = ref(null)

  // ── Getters ──────────────────────────────────────────
  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => profile.value?.role ?? 'pending')

  const isOwner   = computed(() => role.value === 'owner')
  const isAdmin   = computed(() => ['owner', 'admin'].includes(role.value))
  const isStaff   = computed(() => ['owner', 'admin', 'staff'].includes(role.value))
  const isPending = computed(() => role.value === 'pending')

  // ── Actions ──────────────────────────────────────────

  /** 監聽 Firebase Auth 狀態（在 main.js 初始化時呼叫） */
  function init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        user.value = firebaseUser
        if (firebaseUser) {
          await loadProfile(firebaseUser)
        } else {
          profile.value = null
        }
        loading.value = false
        resolve()
      })
    })
  }

  /** 讀取或建立 Firestore 使用者文件 */
  async function loadProfile(firebaseUser) {
    const ref = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)

    if (snap.exists()) {
      profile.value = snap.data()
    } else {
      // 首次登入：建立 pending 帳號
      const newProfile = {
        uid:         firebaseUser.uid,
        displayName: firebaseUser.displayName ?? '未命名',
        email:       firebaseUser.email ?? '',
        photoURL:    firebaseUser.photoURL ?? '',
        role:        'pending',
        provider:    firebaseUser.providerData?.[0]?.providerId ?? 'unknown',
        createdAt:   serverTimestamp(),
      }
      await setDoc(ref, newProfile)
      profile.value = newProfile
    }
  }

  /** Google 登入 */
  async function loginWithGoogle() {
    error.value = null
    try {
      await signInWithPopup(auth, googleProvider)
      // onAuthStateChanged 會自動處理後續
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  /** LINE Login OAuth 跳頁 */
  function loginWithLine() {
    const channelId = import.meta.env.VITE_LINE_CHANNEL_ID
    const redirectUri = encodeURIComponent(`${location.origin}/auth/line/callback`)
    const state = crypto.randomUUID()
    sessionStorage.setItem('line_oauth_state', state)

    const lineAuthUrl =
      `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code` +
      `&client_id=${channelId}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}` +
      `&scope=profile%20openid%20email`

    location.href = lineAuthUrl
  }

  /** 登出 */
  async function signOut() {
    await firebaseSignOut(auth)
    user.value = null
    profile.value = null
  }

  return {
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    role,
    isOwner,
    isAdmin,
    isStaff,
    isPending,
    init,
    loginWithGoogle,
    loginWithLine,
    signOut,
  }
})
