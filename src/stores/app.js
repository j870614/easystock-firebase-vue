// src/stores/app.js
// 全域 UI 狀態（選取的道場、通知訊息等）
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase'

export const useAppStore = defineStore('app', () => {
  // ── State ─────────────────────────────────────────────
  const locations = ref([])             // 所有道場清單
  const selectedLocationId = ref(
    localStorage.getItem('selectedLocationId') ?? null
  )

  // ── Getters ───────────────────────────────────────────
  const selectedLocation = computed(() =>
    locations.value.find(l => l.id === selectedLocationId.value) ?? null
  )

  const activeLocations = computed(() =>
    locations.value.filter(l => l.isActive)
  )

  // ── Actions ───────────────────────────────────────────
  async function fetchLocations() {
    const q = query(
      collection(db, 'locations'),
      where('isActive', '==', true),
      orderBy('name')
    )
    const snap = await getDocs(q)
    locations.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // 若尚未選擇道場，預設選第一個
    if (!selectedLocationId.value && locations.value.length > 0) {
      selectLocation(locations.value[0].id)
    }
  }

  function selectLocation(id) {
    selectedLocationId.value = id
    localStorage.setItem('selectedLocationId', id)
  }

  return {
    locations,
    selectedLocationId,
    selectedLocation,
    activeLocations,
    fetchLocations,
    selectLocation,
  }
})
