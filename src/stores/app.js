import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from './auth'
import {
  DEFAULT_HALL_NAME,
  buildPlacementDocId,
  buildStockDocId,
  getLegacyLocationVisibility,
  isGlobalRole,
  normalizeFinanceMode,
  sortByOrder,
} from '@/utils/multiDept'

function sortLocations(list) {
  return [...list].sort(sortByOrder)
}

function chunk(items, size = 350) {
  const result = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

export const useAppStore = defineStore('app', () => {
  const locations = ref([])
  const halls = ref([])
  const products = ref([])
  const productPlacements = ref([])
  const duties = ref([])

  const selectedLocationId = ref(localStorage.getItem('selectedLocationId') ?? null)
  const selectedHallId = ref(localStorage.getItem('selectedHallId') ?? null)
  const isReplenishMode = ref(false)
  const systemMode = ref('development')
  const idleTimeout = ref(30)
  const fontScale = ref(Number(localStorage.getItem('fontScale') ?? 1))
  const migrationRunning = ref(false)

  let unsubscribeSys = null
  let unsubscribeLocs = null
  let unsubscribeHalls = null
  let unsubscribeProds = null
  let unsubscribePlacements = null
  let unsubscribeDuties = null

  const authStore = computed(() => useAuthStore())

  const sortedLocations = computed(() => sortLocations(locations.value))

  const sortedHalls = computed(() =>
    [...halls.value].sort((a, b) => {
      if (a.locationId !== b.locationId) {
        return String(a.locationId).localeCompare(String(b.locationId), 'zh-Hant')
      }
      return sortByOrder(a, b)
    })
  )

  const selectedLocation = computed(() =>
    locations.value.find((loc) => loc.id === selectedLocationId.value) ?? null
  )

  const selectedHall = computed(() =>
    halls.value.find((hall) => hall.id === selectedHallId.value) ?? null
  )

  const locationHallMap = computed(() => {
    const map = {}
    sortedHalls.value.forEach((hall) => {
      if (!map[hall.locationId]) map[hall.locationId] = []
      map[hall.locationId].push(hall)
    })
    return map
  })

  const placementMap = computed(() => {
    const map = new Map()
    productPlacements.value.forEach((placement) => {
      map.set(buildPlacementDocId(placement.productId, placement.hallId), placement)
    })
    return map
  })

  const activeDuties = computed(() =>
    [...duties.value].filter((duty) => duty.isActive !== false).sort(sortByOrder)
  )

  const activeLocations = computed(() => {
    const auth = authStore.value
    const list = sortedLocations.value.filter((loc) => loc.isActive !== false)
    if (auth.canSwitchScope) return list
    if (!auth.assignedLocationId) return []
    return list.filter((loc) => loc.id === auth.assignedLocationId)
  })

  const activeHalls = computed(() => {
    const auth = authStore.value
    if (!selectedLocationId.value) return []
    const list = (locationHallMap.value[selectedLocationId.value] ?? []).filter((hall) => hall.isActive !== false)
    if (auth.canSwitchScope) return list
    if (!auth.assignedHallId) return []
    return list.filter((hall) => hall.id === auth.assignedHallId)
  })

  const selectedHallFinanceMode = computed(() =>
    normalizeFinanceMode(selectedHall.value?.financeMode)
  )

  function getHallById(hallId) {
    return halls.value.find((hall) => hall.id === hallId) ?? null
  }

  function getDefaultHallForLocation(locationId) {
    return (
      halls.value.find(
        (hall) => hall.locationId === locationId && hall.name === DEFAULT_HALL_NAME
      ) ??
      (locationHallMap.value[locationId] ?? [])[0] ??
      null
    )
  }

  function getPlacement(productId, hallId = selectedHallId.value) {
    if (!hallId) return null
    return placementMap.value.get(buildPlacementDocId(productId, hallId)) ?? null
  }

  function getEffectiveFinanceMode(productId, hallId = selectedHallId.value) {
    const placement = getPlacement(productId, hallId)
    if (placement?.financeModeOverride) {
      return normalizeFinanceMode(placement.financeModeOverride)
    }
    const hall = getHallById(hallId)
    return normalizeFinanceMode(hall?.financeMode)
  }

  function isProductVisibleInHall(product, hallId = selectedHallId.value) {
    if (!product || !hallId || product.isActive === false) return false
    const placement = getPlacement(product.id, hallId)
    if (placement) return placement.isVisible !== false
    return product.placementMode === 'all'
  }

  const activeProducts = computed(() =>
    [...products.value]
      .filter((product) => isProductVisibleInHall(product))
      .sort(sortByOrder)
  )

  const hiddenProducts = computed(() =>
    [...products.value]
      .filter((product) => product.isActive !== false && !isProductVisibleInHall(product))
      .sort(sortByOrder)
  )

  function getHallsForLocation(locationId) {
    return (locationHallMap.value[locationId] ?? []).filter((hall) => hall.isActive !== false)
  }

  function selectLocation(id, options = {}) {
    if (!id) return
    selectedLocationId.value = id
    localStorage.setItem('selectedLocationId', id)

    if (options.preserveHall) return

    const nextHall =
      getHallsForLocation(id).find((hall) => hall.id === selectedHallId.value) ??
      getDefaultHallForLocation(id)
    selectHall(nextHall?.id ?? null)
  }

  function selectHall(id) {
    selectedHallId.value = id ?? null
    if (id) localStorage.setItem('selectedHallId', id)
    else localStorage.removeItem('selectedHallId')
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

  function handleAutoScopeSelection() {
    const auth = authStore.value

    if (auth.isScopedUser) {
      const nextLocationId = auth.assignedLocationId
      if (!nextLocationId) return
      if (selectedLocationId.value !== nextLocationId) {
        selectedLocationId.value = nextLocationId
        localStorage.setItem('selectedLocationId', nextLocationId)
      }

      const preferredHall =
        getHallById(auth.assignedHallId) ?? getDefaultHallForLocation(nextLocationId)
      if (preferredHall && selectedHallId.value !== preferredHall.id) {
        selectHall(preferredHall.id)
      }
      return
    }

    const location =
      activeLocations.value.find((loc) => loc.id === selectedLocationId.value) ??
      activeLocations.value[0]
    if (location && location.id !== selectedLocationId.value) {
      selectedLocationId.value = location.id
      localStorage.setItem('selectedLocationId', location.id)
    }

    const activeHallList = getHallsForLocation(location?.id ?? selectedLocationId.value)
    const hall =
      activeHallList.find((item) => item.id === selectedHallId.value) ??
      getDefaultHallForLocation(location?.id ?? selectedLocationId.value)
    if (hall && hall.id !== selectedHallId.value) {
      selectHall(hall.id)
    }
  }

  async function commitOps(ops) {
    for (const batchOps of chunk(ops)) {
      const batch = writeBatch(db)
      batchOps.forEach((op) => {
        if (op.type === 'set') batch.set(op.ref, op.data, op.options)
        if (op.type === 'update') batch.update(op.ref, op.data)
        if (op.type === 'delete') batch.delete(op.ref)
      })
      await batch.commit()
    }
  }

  async function ensureDefaultHallsForLocations(locationDocs) {
    const existingMap = new Map(
      halls.value.map((hall) => [`${hall.locationId}_${hall.name}`, hall])
    )
    const ops = []

    locationDocs.forEach((loc) => {
      const key = `${loc.id}_${DEFAULT_HALL_NAME}`
      if (existingMap.has(key)) return
      const hallRef = doc(collection(db, 'halls'))
      ops.push({
        type: 'set',
        ref: hallRef,
        data: {
          locationId: loc.id,
          name: DEFAULT_HALL_NAME,
          order: 10,
          isActive: true,
          isSystem: true,
          financeMode: 'none',
          createdAt: serverTimestamp(),
        },
      })
    })

    if (ops.length > 0) {
      await commitOps(ops)
    }
  }

  async function runMultiDeptMigration() {
    const auth = authStore.value
    if (!auth.isAuthenticated || !isGlobalRole(auth.role) || migrationRunning.value) return

    const settingsRef = doc(db, 'settings', 'system')
    const settingsSnap = await getDoc(settingsRef)
    const version = Number(settingsSnap.data()?.multiDeptVersion ?? 0)
    if (version >= 2) return

    migrationRunning.value = true
    try {
      const locationSnap = await getDocs(collection(db, 'locations'))
      const locationDocs = locationSnap.docs.map((item) => ({ id: item.id, ...item.data() }))
      await ensureDefaultHallsForLocations(locationDocs)

      const [hallSnap, productSnap, placementSnap, stockSnap, txSnap, userSnap] = await Promise.all([
        getDocs(collection(db, 'halls')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'productPlacements')),
        getDocs(collection(db, 'stocks')),
        getDocs(collection(db, 'transactions')),
        getDocs(collection(db, 'users')),
      ])

      const hallDocs = hallSnap.docs.map((item) => ({ id: item.id, ...item.data() }))
      const defaultHallMap = Object.fromEntries(
        locationDocs.map((loc) => [
          loc.id,
          hallDocs.find(
            (hall) => hall.locationId === loc.id && hall.name === DEFAULT_HALL_NAME
          )?.id ?? null,
        ])
      )
      const allHallIdsByLocation = locationDocs.reduce((acc, loc) => {
        acc[loc.id] = hallDocs
          .filter((hall) => hall.locationId === loc.id && hall.isActive !== false)
          .map((hall) => hall.id)
        return acc
      }, {})

      const existingPlacementIds = new Set(placementSnap.docs.map((item) => item.id))
      const ops = []

      productSnap.docs.forEach((productDoc) => {
        const product = productDoc.data()
        const visibilityByLocation = locationDocs.map((loc) => ({
          locationId: loc.id,
          visible: getLegacyLocationVisibility(product, loc.id),
        }))
        const placementMode = visibilityByLocation.every((item) => item.visible)
          ? 'all'
          : 'selected'

        const updates = {}
        if (product.purchasePrice == null) updates.purchasePrice = 0
        if (product.placementMode !== placementMode) updates.placementMode = placementMode
        if (Object.keys(updates).length > 0) {
          ops.push({
            type: 'update',
            ref: productDoc.ref,
            data: updates,
          })
        }

        visibilityByLocation.forEach(({ locationId, visible }) => {
          const defaultHallId = defaultHallMap[locationId]
          if (!defaultHallId) return
          const placementId = buildPlacementDocId(productDoc.id, defaultHallId)
          if (existingPlacementIds.has(placementId)) return
          ops.push({
            type: 'set',
            ref: doc(db, 'productPlacements', placementId),
            data: {
              productId: productDoc.id,
              locationId,
              hallId: defaultHallId,
              isVisible: visible,
              financeModeOverride: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
          })
          existingPlacementIds.add(placementId)
        })
      })

      const productDocs = productSnap.docs.map((item) => ({ id: item.id, ...item.data() }))
      productDocs.forEach((product) => {
        if ((product.placementMode ?? 'all') !== 'all') return
        locationDocs.forEach((location) => {
          ;(allHallIdsByLocation[location.id] ?? []).forEach((hallId) => {
            const placementId = buildPlacementDocId(product.id, hallId)
            if (existingPlacementIds.has(placementId)) return
            ops.push({
              type: 'set',
              ref: doc(db, 'productPlacements', placementId),
              data: {
                productId: product.id,
                locationId: location.id,
                hallId,
                isVisible: true,
                financeModeOverride: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
            })
            existingPlacementIds.add(placementId)
          })
        })
      })

      userSnap.docs.forEach((userDoc) => {
        const userData = userDoc.data()
        if (!['staff', 'hallLead'].includes(userData.role)) return
        if (!userData.assignedLocationId) return

        const expectedHallId =
          hallDocs.find(
            (hall) =>
              hall.id === userData.assignedHallId &&
              hall.locationId === userData.assignedLocationId &&
              hall.isActive !== false
          )?.id ?? defaultHallMap[userData.assignedLocationId]

        if (!expectedHallId || userData.assignedHallId === expectedHallId) return
        ops.push({
          type: 'update',
          ref: userDoc.ref,
          data: { assignedHallId: expectedHallId },
        })
      })

      stockSnap.docs.forEach((stockDoc) => {
        const stock = stockDoc.data()
        const targetHallId = stock.hallId ?? defaultHallMap[stock.locationId]
        if (!targetHallId) return

        const targetId = buildStockDocId(stock.locationId, targetHallId, stock.productId)
        if (stockDoc.id === targetId && stock.hallId === targetHallId) return

        const targetRef = doc(db, 'stocks', targetId)
        ops.push({
          type: 'set',
          ref: targetRef,
          data: {
            locationId: stock.locationId,
            hallId: targetHallId,
            productId: stock.productId,
            currentStock: stock.currentStock ?? 0,
          },
        })
        if (stockDoc.id !== targetId) {
          ops.push({ type: 'delete', ref: stockDoc.ref })
        }
      })

      txSnap.docs.forEach((txDoc) => {
        const tx = txDoc.data()
        if (tx.hallId) return
        const hallId = defaultHallMap[tx.locationId]
        if (!hallId) return
        ops.push({
          type: 'update',
          ref: txDoc.ref,
          data: { hallId },
        })
      })

      if (ops.length > 0) {
        await commitOps(ops)
      }

      await setDoc(
        settingsRef,
        {
          multiDeptVersion: 2,
          multiDeptMigratedAt: serverTimestamp(),
        },
        { merge: true }
      )
    } finally {
      migrationRunning.value = false
    }
  }

  function init() {
    if (!unsubscribeSys) {
      unsubscribeSys = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
        if (snap.exists()) {
          systemMode.value = snap.data().mode || 'development'
          idleTimeout.value = Number(snap.data().idleTimeout ?? 30)
        }
      })
    }

    if (!unsubscribeLocs) {
      unsubscribeLocs = onSnapshot(collection(db, 'locations'), (snap) => {
        locations.value = snap.docs.map((item) => ({ id: item.id, ...item.data() }))
        handleAutoScopeSelection()
      })
    }

    if (!unsubscribeHalls) {
      unsubscribeHalls = onSnapshot(collection(db, 'halls'), (snap) => {
        halls.value = snap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          financeMode: normalizeFinanceMode(item.data().financeMode),
        }))
        handleAutoScopeSelection()
      })
    }

    if (!unsubscribeProds) {
      unsubscribeProds = onSnapshot(collection(db, 'products'), (snap) => {
        products.value = snap.docs.map((item) => ({
          id: item.id,
          purchasePrice: 0,
          placementMode: 'all',
          ...item.data(),
        }))
      })
    }

    if (!unsubscribePlacements) {
      unsubscribePlacements = onSnapshot(collection(db, 'productPlacements'), (snap) => {
        productPlacements.value = snap.docs.map((item) => ({ id: item.id, ...item.data() }))
      })
    }

    if (!unsubscribeDuties) {
      unsubscribeDuties = onSnapshot(collection(db, 'duties'), (snap) => {
        duties.value = snap.docs.map((item) => ({ id: item.id, ...item.data() }))
      })
    }
  }

  function stop() {
    if (unsubscribeSys) unsubscribeSys()
    if (unsubscribeLocs) unsubscribeLocs()
    if (unsubscribeHalls) unsubscribeHalls()
    if (unsubscribeProds) unsubscribeProds()
    if (unsubscribePlacements) unsubscribePlacements()
    if (unsubscribeDuties) unsubscribeDuties()

    unsubscribeSys = null
    unsubscribeLocs = null
    unsubscribeHalls = null
    unsubscribeProds = null
    unsubscribePlacements = null
    unsubscribeDuties = null
  }

  watch(
    () => authStore.value.assignedLocationId,
    () => {
      handleAutoScopeSelection()
    }
  )

  watch(
    () => authStore.value.assignedHallId,
    () => {
      handleAutoScopeSelection()
    }
  )

  watch(
    () => authStore.value.role,
    () => {
      handleAutoScopeSelection()
      runMultiDeptMigration().catch((error) => {
        console.error('[AppStore] multiDept migration error:', error)
      })
    },
    { immediate: true }
  )

  watch(
    () => [locations.value.length, halls.value.length, products.value.length],
    () => {
      handleAutoScopeSelection()
      runMultiDeptMigration().catch((error) => {
        console.error('[AppStore] multiDept migration error:', error)
      })
    }
  )

  return {
    locations,
    halls,
    products,
    productPlacements,
    duties,
    activeDuties,
    activeLocations,
    activeHalls,
    activeProducts,
    hiddenProducts,
    selectedLocationId,
    selectedLocation,
    selectedHallId,
    selectedHall,
    selectedHallFinanceMode,
    isReplenishMode,
    systemMode,
    idleTimeout,
    fontScale,
    migrationRunning,
    init,
    stop,
    selectLocation,
    selectHall,
    updateFontScale,
    applyFontScale,
    getHallById,
    getHallsForLocation,
    getDefaultHallForLocation,
    getPlacement,
    getEffectiveFinanceMode,
    isProductVisibleInHall,
  }
})
