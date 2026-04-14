// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, googleProvider, db, functions } from '@/firebase'

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

  const assignedLocationId = computed(() => profile.value?.assignedLocationId ?? null)

  // ── Actions ──────────────────────────────────────────

  /** 監聽 Firebase Auth 狀態（在 main.js 初始化時呼叫） */
  function init() {
    return new Promise(async (resolve) => {
      // 強制等待持久化設定完成
      await setPersistence(auth, browserSessionPersistence)
      
      onAuthStateChanged(auth, async (firebaseUser) => {
        user.value = firebaseUser
        if (firebaseUser) {
          await loadProfile(firebaseUser)
        } else {
          profile.value = null
          stopProfileListener()
        }
        loading.value = false
        resolve()
      })
    })
  }

  let unsubscribeProfile = null

  function stopProfileListener() {
    if (unsubscribeProfile) {
      unsubscribeProfile()
      unsubscribeProfile = null
    }
  }

  /** 讀取或建立 Firestore 使用者文件並持續監聽 */
  async function loadProfile(firebaseUser) {
    stopProfileListener()
    const userRef = doc(db, 'users', firebaseUser.uid)
    
    // 第一次先試著抓，如果不存在就建立
    const initialSnap = await getDoc(userRef)
    if (!initialSnap.exists()) {
      const newProfile = {
        uid:         firebaseUser.uid,
        displayName: firebaseUser.displayName ?? '未命名',
        email:       firebaseUser.email ?? '',
        photoURL:    firebaseUser.photoURL ?? '',
        role:        'pending',
        provider:    firebaseUser.providerData?.[0]?.providerId ?? 'unknown',
        dharmaName:  '',
        secularName: '',
        createdAt:   serverTimestamp(),
      }
      await setDoc(userRef, newProfile)
    }

    // 開始持續監聽
    unsubscribeProfile = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        profile.value = snap.data()
      }
    })
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

  /** LINE Login OAuth 跳頁
   * @param {string} action - 'login'（預設）或 'link'（連結現有帳號）
   */
  function loginWithLine(action = 'login') {
    const channelId = import.meta.env.VITE_LINE_CHANNEL_ID
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '')
    const redirectUri = encodeURIComponent(`${window.location.origin}${baseUrl}/auth/line/callback`)
    const state = crypto.randomUUID()
    sessionStorage.setItem('line_oauth_state', state)
    sessionStorage.setItem('line_oauth_action', action)
    // 若是 link 模式，記錄當前使用者 uid 供 callback 使用
    if (action === 'link' && user.value?.uid) {
      sessionStorage.setItem('line_link_uid', user.value.uid)
    }

    const lineAuthUrl =
      `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code` +
      `&client_id=${channelId}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}` +
      `&scope=profile%20openid%20email`

    location.href = lineAuthUrl
  }

  /** 連結 Google 帳號（僅限 LINE 登入用戶使用）
   * 透過 Google Popup 取得 Google uid，再呼叫 CF 將 LINE 資料合併至 Google doc
   */
  async function linkGoogle() {
    const currentLineUid = user.value?.uid
    if (!currentLineUid?.startsWith('line:')) {
      throw new Error('此功能僅適用於 LINE 登入帳號')
    }

    // signInWithPopup 會切換 Auth 使用者至 Google，這是預期行為
    const result = await signInWithPopup(auth, googleProvider)
    const googleUid = result.user.uid

    // 呼叫 CF 合併 LINE doc 至 Google doc
    const linkGoogleFn = httpsCallable(functions, 'linkGoogle')
    await linkGoogleFn({ lineUid: currentLineUid, googleUid })
    // Auth 狀態已切換至 Google，loadProfile 將自動讀取新的 doc
  }

  /** 登出 */
  async function signOut() {
    stopProfileListener()
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
    assignedLocationId,
    init,
    loginWithGoogle,
    loginWithLine,
    linkGoogle,
    signOut,
  }
})
