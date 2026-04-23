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
  const canManageProducts = computed(() => ['owner', 'admin', 'hallLead'].includes(role.value))
  const canSwitchScope = computed(() => isGlobalRole(role.value))
  const canManageUsers = computed(() => ['owner', 'admin'].includes(role.value))
  const canManageLocations = computed(() => ['owner', 'admin'].includes(role.value))

  const isAccountant = computed(() => profile.value?.dutyName === '會計')
  const assignedLocationId = computed(() => profile.value?.assignedLocationId ?? null)
  const assignedHallId = computed(() => profile.value?.assignedHallId ?? null)

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
      }
      await setDoc(userRef, newProfile)
      profile.value = newProfile
    } else {
      profile.value = initialSnap.data()
    }

    unsubscribeProfile = onSnapshot(userRef, (snap) => {
      if (snap.exists()) profile.value = snap.data()
    })
  }

  function init() {
    if (initPromise) return initPromise

    initPromise = new Promise(async (resolve) => {
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
    canManageProducts,
    canSwitchScope,
    canManageUsers,
    canManageLocations,
    assignedLocationId,
    assignedHallId,
    init,
    loginWithGoogle,
    signOut,
  }
})
