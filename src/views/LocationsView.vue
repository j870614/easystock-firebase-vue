<template>
  <AppLayout title="道場與堂口管理" :show-location-picker="false">
    <div class="flex justify-end mb-4">
      <button class="btn-primary gap-2 text-base" @click="openLocationForm()">
        <Plus class="w-5 h-5" /> 新增道場
      </button>
    </div>

    <draggable
      :list="locationList"
      item-key="id"
      handle=".drag-handle-location"
      class="space-y-4 pb-24"
      @end="persistLocationOrder"
    >
      <template #item="{ element: loc }">
        <div
          class="card border-2"
          :class="loc.isActive !== false ? 'border-transparent' : 'border-gray-200 opacity-60'"
        >
          <div class="flex items-start gap-3">
            <button class="drag-handle-location p-2 -m-2 rounded-xl text-gray-300 hover:text-gray-500 active:cursor-grabbing cursor-grab">
              <GripVertical class="w-5 h-5" />
            </button>
            <Building2 class="w-8 h-8 text-brand-400 flex-shrink-0 mt-1" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <div class="font-semibold text-gray-800">{{ loc.name }}</div>
                <span class="text-xs px-2 py-0.5 rounded-full" :class="loc.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'">
                  {{ loc.isActive !== false ? '啟用' : '停用' }}
                </span>
              </div>
              <div v-if="loc.address" class="text-sm text-gray-500 mt-1">{{ loc.address }}</div>
              <div class="text-xs text-gray-400 mt-1">國度：{{ loc.country || '台灣' }}</div>
            </div>
            <div class="flex items-center gap-2">
              <el-switch :model-value="loc.isActive !== false" @change="(val) => toggleLocationActive(loc, val)" />
              <button class="p-2 rounded-xl hover:bg-gray-100" @click="openLocationForm(loc)">
                <Pencil class="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <div>
                <div class="text-sm font-semibold text-gray-700">堂口</div>
                <div class="text-xs text-gray-400">知客為系統預設堂口，可拖曳調整順序</div>
              </div>
              <button class="btn-ghost px-4 py-2 text-sm" @click="openHallForm(loc)">
                <Plus class="w-4 h-4" /> 新增堂口
              </button>
            </div>

            <draggable
              :list="hallLists[loc.id]"
              item-key="id"
              handle=".drag-handle-hall"
              class="space-y-2"
              @end="() => persistHallOrder(loc.id)"
            >
              <template #item="{ element: hall }">
                <div class="flex items-center gap-3 rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <button class="drag-handle-hall p-2 -m-2 rounded-xl text-gray-300 hover:text-gray-500 active:cursor-grabbing cursor-grab">
                    <GripVertical class="w-4 h-4" />
                  </button>
                  <Store class="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <div class="font-medium text-gray-800">{{ hall.name }}</div>
                      <span v-if="hall.isSystem" class="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">系統預設</span>
                      <span class="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500">
                        {{ financeLabel(hall.financeMode) }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-400 mt-1">{{ hall.isActive !== false ? '啟用中' : '停用中' }}</div>
                  </div>
                  <el-switch
                    :model-value="hall.isActive !== false"
                    :disabled="hall.isSystem"
                    @change="(val) => toggleHallActive(hall, val)"
                  />
                  <button class="p-2 rounded-xl hover:bg-white" @click="openHallForm(loc, hall)">
                    <Pencil class="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </template>
            </draggable>
          </div>
        </div>
      </template>
    </draggable>

    <el-dialog v-model="locationDialogVisible" :title="editingLocationId ? '編輯道場' : '新增道場'" width="92%" align-center>
      <div class="space-y-4 py-2">
        <div>
          <label class="label">道場名稱 *</label>
          <input v-model="locationForm.name" type="text" class="input" placeholder="例如：本會道場" />
        </div>
        <div>
          <label class="label">國度 *</label>
          <input v-model="locationForm.country" type="text" class="input" placeholder="例如：台灣" />
        </div>
        <div>
          <label class="label">地址</label>
          <input v-model="locationForm.address" type="text" class="input" placeholder="例如：台北市..." />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-gray-500 block mb-1">緯度</label>
            <input v-model.number="locationForm.lat" type="number" class="input py-2 text-sm" placeholder="25.033" />
          </div>
          <div>
            <label class="text-xs text-gray-500 block mb-1">經度</label>
            <input v-model.number="locationForm.lng" type="number" class="input py-2 text-sm" placeholder="121.565" />
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost mr-2" @click="locationDialogVisible = false">取消</button>
        <button class="btn-primary" :disabled="!locationForm.name || savingLocation" @click="saveLocation">
          {{ savingLocation ? '儲存中…' : '儲存' }}
        </button>
      </template>
    </el-dialog>

    <el-dialog v-model="hallDialogVisible" :title="editingHallId ? '編輯堂口' : '新增堂口'" width="92%" align-center>
      <div class="space-y-4 py-2">
        <div class="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3">
          所屬道場：{{ hallForm.locationName || '—' }}
        </div>
        <div>
          <label class="label">堂口名稱 *</label>
          <input v-model="hallForm.name" type="text" class="input" placeholder="例如：流通處" :disabled="hallForm.isSystem" />
        </div>
        <div>
          <label class="label">財務模式 *</label>
          <el-select v-model="hallForm.financeMode" class="w-full">
            <el-option
              v-for="option in FINANCE_MODE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="flex items-center justify-between rounded-xl border border-gray-200 p-3">
          <div>
            <div class="font-medium text-gray-700">啟用狀態</div>
            <div class="text-xs text-gray-400">系統預設堂口不可停用</div>
          </div>
          <el-switch v-model="hallForm.isActive" :disabled="hallForm.isSystem" />
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost mr-2" @click="hallDialogVisible = false">取消</button>
        <button class="btn-primary" :disabled="!hallForm.name || savingHall" @click="saveHall">
          {{ savingHall ? '儲存中…' : '儲存' }}
        </button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import { Building2, GripVertical, Pencil, Plus, Store } from 'lucide-vue-next'
import { db } from '@/firebase'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'
import { DEFAULT_HALL_NAME, FINANCE_MODE_MAP, FINANCE_MODE_OPTIONS, buildPlacementDocId, buildSystemHallId, sortByOrder } from '@/utils/multiDept'

const appStore = useAppStore()

const locationDialogVisible = ref(false)
const hallDialogVisible = ref(false)
const savingLocation = ref(false)
const savingHall = ref(false)
const editingLocationId = ref(null)
const editingHallId = ref(null)
const locationList = ref([])
const hallLists = ref({})

const sortedLocations = computed(() => [...appStore.locations].sort(sortByOrder))

const locationForm = ref({
  name: '',
  country: '台灣',
  address: '',
  lat: null,
  lng: null,
  isActive: true,
})

const hallForm = ref({
  locationId: '',
  locationName: '',
  name: '',
  financeMode: 'none',
  isActive: true,
  isSystem: false,
})

function financeLabel(mode) {
  return FINANCE_MODE_MAP[mode] ?? FINANCE_MODE_MAP.none
}

function getLocationHalls(locationId) {
  return hallLists.value[locationId] ?? []
}

watch(
  () => appStore.locations,
  (list) => {
    locationList.value = [...list].sort(sortByOrder)
  },
  { immediate: true, deep: true }
)

watch(
  () => appStore.halls,
  (list) => {
    const next = {}
    sortedLocations.value.forEach((loc) => {
      next[loc.id] = list
        .filter((hall) => hall.locationId === loc.id)
        .sort(sortByOrder)
    })
    hallLists.value = next
  },
  { immediate: true, deep: true }
)

async function persistLocationOrder() {
  try {
    const batch = writeBatch(db)
    locationList.value.forEach((loc, index) => {
      batch.update(doc(db, 'locations', loc.id), { order: (index + 1) * 10 })
    })
    await batch.commit()
    ElMessage.success('道場排序已更新')
  } catch (error) {
    ElMessage.error(`排序更新失敗：${error.message}`)
  }
}

async function persistHallOrder(locationId) {
  try {
    const batch = writeBatch(db)
    getLocationHalls(locationId).forEach((hall, index) => {
      batch.update(doc(db, 'halls', hall.id), { order: (index + 1) * 10 })
    })
    await batch.commit()
    ElMessage.success('堂口排序已更新')
  } catch (error) {
    ElMessage.error(`排序更新失敗：${error.message}`)
  }
}

function openLocationForm(location = null) {
  editingLocationId.value = location?.id ?? null
  locationForm.value = location
    ? {
        name: location.name,
        country: location.country || '台灣',
        address: location.address || '',
        lat: location.lat ?? null,
        lng: location.lng ?? null,
        isActive: location.isActive !== false,
      }
    : {
        name: '',
        country: '台灣',
        address: '',
        lat: null,
        lng: null,
        isActive: true,
      }
  locationDialogVisible.value = true
}

async function saveLocation() {
  savingLocation.value = true
  try {
    if (editingLocationId.value) {
      await updateDoc(doc(db, 'locations', editingLocationId.value), { ...locationForm.value })
      ElMessage.success('道場已更新')
      locationDialogVisible.value = false
      return
    }

    const maxOrder = Math.max(0, ...appStore.locations.map((loc) => Number(loc.order || 0)))
    const locationRef = await addDoc(collection(db, 'locations'), {
      ...locationForm.value,
      order: maxOrder + 10,
    })

    const hallRef = doc(db, 'halls', buildSystemHallId(locationRef.id))
    const batch = writeBatch(db)
    batch.set(hallRef, {
      locationId: locationRef.id,
      name: DEFAULT_HALL_NAME,
      order: 10,
      isActive: true,
      isSystem: true,
      financeMode: 'none',
      createdAt: serverTimestamp(),
    })

    appStore.products
      .filter((product) => (product.placementMode ?? 'all') === 'all')
      .forEach((product) => {
        batch.set(doc(db, 'productPlacements', buildPlacementDocId(product.id, hallRef.id)), {
          productId: product.id,
          locationId: locationRef.id,
          hallId: hallRef.id,
          isVisible: true,
          financeModeOverride: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })

    await batch.commit()
    locationDialogVisible.value = false
    ElMessage.success('道場已新增，並自動建立知客堂口')
  } catch (error) {
    ElMessage.error(`儲存失敗：${error.message}`)
  } finally {
    savingLocation.value = false
  }
}

async function toggleLocationActive(location, value) {
  await updateDoc(doc(db, 'locations', location.id), { isActive: value })
}

function openHallForm(location, hall = null) {
  editingHallId.value = hall?.id ?? null
  hallForm.value = hall
    ? {
        locationId: location.id,
        locationName: location.name,
        name: hall.name,
        financeMode: hall.financeMode || 'none',
        isActive: hall.isActive !== false,
        isSystem: hall.isSystem === true,
      }
    : {
        locationId: location.id,
        locationName: location.name,
        name: '',
        financeMode: 'none',
        isActive: true,
        isSystem: false,
      }
  hallDialogVisible.value = true
}

async function saveHall() {
  savingHall.value = true
  try {
    const normalizedName = hallForm.value.name.trim()
    const duplicatedHall = getLocationHalls(hallForm.value.locationId).find(
      (hall) => hall.name.trim() === normalizedName && hall.id !== editingHallId.value
    )
    if (duplicatedHall) {
      ElMessage.warning(`此道場已存在「${normalizedName}」堂口`)
      return
    }

    if (editingHallId.value) {
      await updateDoc(doc(db, 'halls', editingHallId.value), {
        name: normalizedName,
        financeMode: hallForm.value.financeMode,
        isActive: hallForm.value.isSystem ? true : hallForm.value.isActive,
      })
      hallDialogVisible.value = false
      ElMessage.success('堂口已更新')
      return
    }

    const hallList = getLocationHalls(hallForm.value.locationId)
    const maxOrder = Math.max(0, ...hallList.map((hall) => Number(hall.order || 0)))
    const hallRef = doc(collection(db, 'halls'))
    const batch = writeBatch(db)
    batch.set(hallRef, {
      locationId: hallForm.value.locationId,
      name: normalizedName,
      order: maxOrder + 10,
      isActive: hallForm.value.isActive,
      isSystem: false,
      financeMode: hallForm.value.financeMode,
      createdAt: serverTimestamp(),
    })

    appStore.products
      .filter((product) => (product.placementMode ?? 'all') === 'all')
      .forEach((product) => {
        batch.set(doc(db, 'productPlacements', buildPlacementDocId(product.id, hallRef.id)), {
          productId: product.id,
          locationId: hallForm.value.locationId,
          hallId: hallRef.id,
          isVisible: true,
          financeModeOverride: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })

    await batch.commit()
    hallDialogVisible.value = false
    ElMessage.success('堂口已新增')
  } catch (error) {
    ElMessage.error(`儲存失敗：${error.message}`)
  } finally {
    savingHall.value = false
  }
}

async function toggleHallActive(hall, value) {
  if (hall.isSystem) {
    ElMessage.warning('知客堂口不可停用')
    return
  }

  if (!value) {
    const [stockSnap, txSnap] = await Promise.all([
      getDocs(query(collection(db, 'stocks'), where('hallId', '==', hall.id))),
      getDocs(query(collection(db, 'transactions'), where('hallId', '==', hall.id))),
    ])

    if (!stockSnap.empty || !txSnap.empty) {
      ElMessageBox.alert('此堂口已有庫存或交易資料，暫時不可停用。', '無法停用')
      return
    }
  }

  await updateDoc(doc(db, 'halls', hall.id), { isActive: value })
}
</script>
