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
  const fontScale = ref(
    Number(localStorage.getItem('fontScale') ?? 1)
  )                                     // 字體縮放比例 0=小 1=預設 2=大

  // ── Getters ───────────────────────────────────────────
  const activeProducts = computed(() => {
    return products.value.filter(p => {
      if (!p.isActive) return false
      const locId = selectedLocationId.value
      if (!locId) return true
      return p.overrides?.[locId]?.isActive ?? true
    })
  })

  const activeDuties = computed(() =>
    duties.value.filter(d => d.isActive)
  )

  const selectedLocation = computed(() =>
    locations.value.find(l => l.id === selectedLocationId.value) ?? null
  )

  const activeLocations = computed(() => {
    const authStore = useAuthStore()
    const locs = locations.value.filter(l => l.isActive)

    // 系統總管可看到並切換所有啟用中的道場
    if (authStore.isOwner) return locs

    // 其他角色只能看到被指派的道場
    if (authStore.assignedLocationId) {
      return locs.filter(l => l.id === authStore.assignedLocationId)
    }

    return []
  })

  // ── Actions ───────────────────────────────────────────
  let unsubscribeSys = null
  let unsubscribeLocs = null
  let unsubscribeProds = null
  let unsubscribeDuties = null

  function init() {
    const authStore = useAuthStore()

    // 1. 監聽系統設定
    if (!unsubscribeSys) {
      const sysRef = doc(db, 'settings', 'system')
      unsubscribeSys = onSnapshot(sysRef, (snap) => {
        if (snap.exists()) {
          systemMode.value = snap.data().mode || 'development'
          idleTimeout.value = Number(snap.data().idleTimeout ?? 30)
        }
      }, (err) => {
        console.error('[AppStore] System setting listener error:', err.message)
      })
    }

    // 2. 監聽執事選項
    if (!unsubscribeDuties) {
      const qDuties = query(collection(db, 'duties'), orderBy('order'))
      unsubscribeDuties = onSnapshot(qDuties, (snap) => {
        duties.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      }, (err) => {
        console.error('[AppStore] Duties listener error:', err.message)
      })
    }

    // 3. 監聽道場與品項
    checkAndStartStaffListeners()
  }

  function handleAutoLocationSelection() {
    const authStore = useAuthStore()
    if (!authStore.isStaff) return

    // 優先權 1：若有指派道場，強制使用該道場 (特別適合 Staff/Admin)
    if (authStore.assignedLocationId) {
      selectLocation(authStore.assignedLocationId)
      return
    }

    // 優先權 2：若無明確指派（如總管），確保目前選取值存在於可用清單中
    const currentValid = activeLocations.value.find(l => l.id === selectedLocationId.value)
    if (!currentValid && activeLocations.value.length > 0) {
      selectLocation(activeLocations.value[0].id)
    }
  }

  function checkAndStartStaffListeners() {
    const authStore = useAuthStore()
    if (!authStore.isStaff) return

    // 監聽道場
    if (!unsubscribeLocs) {
      const qLoc = query(collection(db, 'locations'), orderBy('order'))
      unsubscribeLocs = onSnapshot(qLoc, (snap) => {
        locations.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        handleAutoLocationSelection()
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

  // 監聽角色變化
  watch(() => useAuthStore().isStaff, (isStaff) => {
    if (isStaff) checkAndStartStaffListeners()
  })

  // 關鍵監聽：當個人檔案中的指派道場變化時，立即切換選取
  watch(() => useAuthStore().assignedLocationId, (newId) => {
    if (newId) selectLocation(newId)
  })

  function stop() {
    if (unsubscribeSys) { unsubscribeSys(); unsubscribeSys = null }
    if (unsubscribeLocs) { unsubscribeLocs(); unsubscribeLocs = null }
    if (unsubscribeProds) { unsubscribeProds(); unsubscribeProds = null }
    if (unsubscribeDuties) { unsubscribeDuties(); unsubscribeDuties = null }
  }

  function selectLocation(id) {
    if (selectedLocationId.value === id) return // 防止重複執行導致的反應循環
    selectedLocationId.value = id
    localStorage.setItem('selectedLocationId', id)
  }

  function updateFontScale(val) {
    const clamped = Math.min(2, Math.max(0, val))
    fontScale.value = clamped
    localStorage.setItem('fontScale', clamped)
    document.documentElement.setAttribute('data-fs', clamped)
  }

  function applyFontScale() {
    document.documentElement.setAttribute('data-fs', fontScale.value)
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
    fontScale,
    init,
    stop,
    selectLocation,
    updateFontScale,
    applyFontScale,
  }
})
