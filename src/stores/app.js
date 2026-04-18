// src/stores/app.js
// 全域 UI 狀態（選取的道場、通知訊息等）
import { defineStore } from 'pinia'
import { ref, computed, onUnmounted, watch } from 'vue'
import { doc, getDoc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from './auth'

export const useAppStore = defineStore('app', () => {
  // ── State ─────────────────────────────────────────────
  const locations = ref([])             // 所有道場清單
  const products = ref([])              // 所有品項清單
  const duties = ref([])                // 執事選項清單
  const selectedLocationId = ref(
    localStorage.getItem('selectedLocationId') ?? null
  )
  const isReplenishMode = ref(false)    // 是否開啟補貨模式
  const systemMode = ref('development') // 系統執行模式
  const idleTimeout = ref(30)           // 閒置自動登出時間（分鐘），0 = 停用

  // ── Getters ───────────────────────────────────────────
  const activeProducts = computed(() =>
    products.value.filter(p => p.isActive)
  )

  const activeDuties = computed(() =>
    duties.value.filter(d => d.isActive)
  )

  const selectedLocation = computed(() =>
    locations.value.find(l => l.id === selectedLocationId.value) ?? null
  )

  const activeLocations = computed(() => {
    const authStore = useAuthStore()
    let locs = locations.value.filter(l => l.isActive)
    
    // 非管理員只能看到自己被指派的道場
    if (!authStore.isAdmin && authStore.assignedLocationId) {
      locs = locs.filter(l => l.id === authStore.assignedLocationId)
    } else if (!authStore.isAdmin && !authStore.assignedLocationId) {
      // 尚未被指派的非管理員，看不到任何道場
      locs = []
    }
    
    return locs
  })

  // ── Actions ───────────────────────────────────────────
  let unsubscribeSys = null
  let unsubscribeLocs = null
  let unsubscribeProds = null
  let unsubscribeDuties = null

  function init() {
    const authStore = useAuthStore()

    // 1. 監聽系統設定 (所有已登入者皆可讀)
    if (!unsubscribeSys) {
      const sysRef = doc(db, 'settings', 'system')
      unsubscribeSys = onSnapshot(sysRef, (snap) => {
        if (snap.exists()) {
          systemMode.value = snap.data().mode || 'development'
          idleTimeout.value = snap.data().idleTimeout ?? 30
        }
      }, (err) => {
        console.error('[AppStore] System setting listener error:', err.message)
      })
    }

    // 2. 監聽執事選項 (所有已登入者皆可讀，PendingView 需要)
    if (!unsubscribeDuties) {
      const qDuties = query(collection(db, 'duties'), orderBy('order'))
      unsubscribeDuties = onSnapshot(qDuties, (snap) => {
        duties.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      }, (err) => {
        console.error('[AppStore] Duties listener error:', err.message)
      })
    }

    // 3. 監聽道場與品項 (僅限具有角色權限者)
    // 我們使用一個簡單的檢查，並配合 watch 處理角色動態變更
    checkAndStartStaffListeners()
  }

  function checkAndStartStaffListeners() {
    const authStore = useAuthStore()
    if (!authStore.isStaff) return

    // 監聽道場
    if (!unsubscribeLocs) {
      const qLoc = query(collection(db, 'locations'), orderBy('order'))
      unsubscribeLocs = onSnapshot(qLoc, (snap) => {
        locations.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        
        // 確保選中的道場在允許的清單內
        const currentAllowed = activeLocations.value.find(l => l.id === selectedLocationId.value)
        if (!currentAllowed && activeLocations.value.length > 0) {
          selectLocation(activeLocations.value[0].id)
        } else if (!selectedLocationId.value && activeLocations.value.length > 0) {
          selectLocation(activeLocations.value[0].id)
        }
      }, (err) => {
        console.error('[AppStore] Locations listener error:', err.message)
      })
    }

    // 監聽品項
    if (!unsubscribeProds) {
      const qProd = query(collection(db, 'products'), orderBy('order'))
      unsubscribeProds = onSnapshot(qProd, (snap) => {
        products.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      }, (err) => {
        console.error('[AppStore] Products listener error:', err.message)
      })
    }
  }

  // 監聽角色變化，如果從 pending 變成 staff，自動啟動監聽器
  watch(() => useAuthStore().isStaff, (isStaff) => {
    if (isStaff) {
      checkAndStartStaffListeners()
    }
  })

  function stop() {
    if (unsubscribeSys) {
      unsubscribeSys()
      unsubscribeSys = null
    }
    if (unsubscribeLocs) {
      unsubscribeLocs()
      unsubscribeLocs = null
    }
    if (unsubscribeProds) {
      unsubscribeProds()
      unsubscribeProds = null
    }
    if (unsubscribeDuties) {
      unsubscribeDuties()
      unsubscribeDuties = null
    }
  }

  function selectLocation(id) {
    selectedLocationId.value = id
    localStorage.setItem('selectedLocationId', id)
  }

  return {
    locations,
    products,
    duties,
    activeDuties,
    selectedLocationId,
    selectedLocation,
    activeLocations,
    activeProducts,
    isReplenishMode,
    systemMode,
    idleTimeout,
    init,
    stop,
    selectLocation,
  }
})
