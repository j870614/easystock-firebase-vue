import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { auth, googleProvider, db } from '@/firebase'
import { isGlobalRole, isOperationalRole, isScopedRole } from '@/utils/multiDept'
import { deferPasskeyEnrollment as deferPasskeyEnrollmentRequest } from '@/services/passkey'

const PASSKEY_REMINDER_DAYS = 14
const PASSKEY_SESSION_KEY = 'passkey-session'

function getStoredPasskeySession() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.sessionStorage.getItem(PASSKEY_SESSION_KEY) ?? 'null')
  } catch {
    return null
  }
}

function writePasskeySession(payload) {
  if (typeof window === 'undefined') return
  if (!payload) {
    window.sessionStorage.removeItem(PASSKEY_SESSION_KEY)
    return
  }
  window.sessionStorage.setItem(PASSKEY_SESSION_KEY, JSON.stringify(payload))
}

function normalizeSecurity(security = {}) {
  return {
    passkeyEnrolled: security.passkeyEnrolled === true,
    passkeyEnrolledAt: security.passkeyEnrolledAt ?? null,
    passkeyRequiredFrom: security.passkeyRequiredFrom ?? null,
    passkeyGraceUntil: security.passkeyGraceUntil ?? null,
    passkeyLastVerifiedAt: security.passkeyLastVerifiedAt ?? null,
    passkeyRecoveryRequired: security.passkeyRecoveryRequired === true,
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(true)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => profile.value?.role ?? 'pending')

  const isOwner = computed(() => role.value === 'owner')
  const isAdmin = computed(() => isGlobalRole(role.value))
  const isHallLead = computed(() => role.value === 'hallLead')
  const isPending = computed(() => role.value === 'pending')
  const isStaff = computed(() => isOperationalRole(role.value))
  const isScopedUser = computed(() => isScopedRole(role.value))
  const shouldEnforceGeofence = computed(() => role.value === 'staff')
  const canManageProducts = computed(() => ['owner', 'admin', 'hallLead'].includes(role.value))
  const canSwitchScope = computed(() => isGlobalRole(role.value))
  const canManageUsers = computed(() => role.value === 'owner')
  const canManageLocations = computed(() => role.value === 'owner')

  const isAccountant = computed(() => profile.value?.dutyName === '會計')
  const assignedLocationId = computed(() => profile.value?.assignedLocationId ?? null)
  const assignedHallId = computed(() => profile.value?.assignedHallId ?? null)
  const passkeySession = ref(getStoredPasskeySession())
  const security = computed(() => normalizeSecurity(profile.value?.security))
  const hasPasskey = computed(() => security.value.passkeyEnrolled)
  const isPasskeyRecoveryRequired = computed(() => security.value.passkeyRecoveryRequired)
  const isPasskeyEnrollmentRequired = computed(() =>
    isAuthenticated.value &&
    !isPending.value &&
    !hasPasskey.value &&
    !!security.value.passkeyRequiredFrom
  )
  const isPasskeyGraceActive = computed(() => {
    const graceUntil = security.value.passkeyGraceUntil
    if (!graceUntil) return false
    const value =
      typeof graceUntil?.toDate === 'function' ? graceUntil.toDate() : new Date(graceUntil)
    return value.getTime() > Date.now()
  })
  const isPasskeyVerified = computed(() =>
    !!user.value &&
    passkeySession.value?.uid === user.value.uid &&
    !!passkeySession.value?.verifiedAt
  )
  const needsPasskeyVerification = computed(() =>
    isAuthenticated.value &&
    !isPending.value &&
    hasPasskey.value &&
    !isPasskeyVerified.value &&
    !isPasskeyRecoveryRequired.value
  )
  const shouldPromptPasskeySetup = computed(() =>
    isPasskeyEnrollmentRequired.value
  )
  const shouldShowPasskeyReminder = computed(() =>
    isAuthenticated.value &&
    !isPending.value &&
    !hasPasskey.value
  )

  let initPromise = null
  let unsubscribeProfile = null

  function stopProfileListener() {
    if (unsubscribeProfile) {
      unsubscribeProfile()
      unsubscribeProfile = null
    }
  }

  async function loadProfile(firebaseUser) {
    stopProfileListener()
    const userRef = doc(db, 'users', firebaseUser.uid)

    const initialSnap = await getDoc(userRef)
    if (!initialSnap.exists()) {
      const newProfile = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? '未命名',
        email: firebaseUser.email ?? '',
        photoURL: firebaseUser.photoURL ?? '',
        role: 'pending',
        provider: firebaseUser.providerData?.[0]?.providerId ?? 'unknown',
        dharmaName: '',
        secularName: '',
        dutyId: null,
        dutyName: '',
        assignedLocationId: null,
        assignedHallId: null,
        createdAt: serverTimestamp(),
        security: {
          ...normalizeSecurity(),
          passkeyRequiredFrom: serverTimestamp(),
        },
      }
      await setDoc(userRef, newProfile)
      profile.value = newProfile
    } else {
      profile.value = {
        ...initialSnap.data(),
        security: normalizeSecurity(initialSnap.data()?.security),
      }
    }

    unsubscribeProfile = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        profile.value = {
          ...snap.data(),
          security: normalizeSecurity(snap.data()?.security),
        }
      }
    })
  }

  function init() {
    if (initPromise) return initPromise

    initPromise = new Promise(async (resolve) => {
      await setPersistence(auth, browserSessionPersistence)

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser || passkeySession.value?.uid !== firebaseUser.uid) {
          clearPasskeyVerification()
        }
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

    return initPromise
  }

  async function loginWithGoogle() {
    error.value = null
    loading.value = true
    try {
      await signInWithPopup(auth, googleProvider)
      if (!profile.value) {
        await new Promise((resolve) => {
          const unwatch = watch(profile, (newVal) => {
            if (newVal) {
              unwatch()
              resolve()
            }
          })
        })
      }
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    stopProfileListener()
    await firebaseSignOut(auth)
    user.value = null
    profile.value = null
    clearPasskeyVerification()
  }

  async function deferPasskeyEnrollment(days = PASSKEY_REMINDER_DAYS) {
    await deferPasskeyEnrollmentRequest(days)
  }

  function markPasskeyVerified() {
    if (!user.value) return
    const payload = {
      uid: user.value.uid,
      verifiedAt: Date.now(),
    }
    passkeySession.value = payload
    writePasskeySession(payload)
  }

  function clearPasskeyVerification() {
    passkeySession.value = null
    writePasskeySession(null)
  }

  function getPostLoginRoute() {
    if (isPending.value) return '/pending'
    if (shouldPromptPasskeySetup.value || isPasskeyRecoveryRequired.value) return '/passkey/setup'
    if (needsPasskeyVerification.value) return '/passkey/verify'
    return '/'
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
    isHallLead,
    isStaff,
    isScopedUser,
    isPending,
    isAccountant,
    shouldEnforceGeofence,
    canManageProducts,
    canSwitchScope,
    canManageUsers,
    canManageLocations,
    assignedLocationId,
    assignedHallId,
    security,
    hasPasskey,
    isPasskeyVerified,
    isPasskeyEnrollmentRequired,
    isPasskeyGraceActive,
    isPasskeyRecoveryRequired,
    needsPasskeyVerification,
    shouldPromptPasskeySetup,
    shouldShowPasskeyReminder,
    init,
    loginWithGoogle,
    signOut,
    deferPasskeyEnrollment,
    markPasskeyVerified,
    clearPasskeyVerification,
    getPostLoginRoute,
  }
})
