// src/stores/app.js
// 全域 UI 狀態（選取的道場、通知訊息等）
import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import { doc, getDoc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from './auth'

export const useAppStore = defineStore('app', () => {
  // ── State ─────────────────────────────────────────────
  const locations = ref([])             // 所有道場清單
  const products = ref([])              // 所有品項清單
  const selectedLocationId = ref(
    localStorage.getItem('selectedLocationId') ?? null
  )
  const isReplenishMode = ref(false)    // 是否開啟補貨模式

  // ── Getters ───────────────────────────────────────────
  const activeProducts = computed(() =>
    products.value.filter(p => p.isActive)
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
  let unsubscribeLocs = null
  let unsubscribeProds = null

  function init() {
    if (unsubscribeLocs) return

    // 監聽道場
    const qLoc = query(collection(db, 'locations'), orderBy('name'))
    unsubscribeLocs = onSnapshot(qLoc, (snap) => {
      locations.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      
      // 確保選中的道場在允許的清單內，若不在，則強制選取第一個可見的
      const currentAllowed = activeLocations.value.find(l => l.id === selectedLocationId.value)
      if (!currentAllowed && activeLocations.value.length > 0) {
        selectLocation(activeLocations.value[0].id)
      } else if (!selectedLocationId.value && activeLocations.value.length > 0) {
        selectLocation(activeLocations.value[0].id)
      }
    })

    // 監聽品項
    const qProd = query(collection(db, 'products'), orderBy('order'))
    unsubscribeProds = onSnapshot(qProd, (snap) => {
      products.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    })
  }

  function stop() {
    if (unsubscribeLocs) {
      unsubscribeLocs()
      unsubscribeLocs = null
    }
    if (unsubscribeProds) {
      unsubscribeProds()
      unsubscribeProds = null
    }
  }

  function selectLocation(id) {
    selectedLocationId.value = id
    localStorage.setItem('selectedLocationId', id)
  }

  return {
    locations,
    products,
    selectedLocationId,
    selectedLocation,
    activeLocations,
    activeProducts,
    isReplenishMode,
    init,
    stop,
    selectLocation,
  }
})
