<template>
  <AppLayout title="品項管理" :show-location-picker="true">
    <div class="flex justify-end mb-4">
      <button class="btn-primary gap-2 text-base" @click="openForm()">
        <Plus class="w-5 h-5" /> 新增品項
      </button>
    </div>

    <draggable
      :list="draggableGroups"
      item-key="name"
      handle=".drag-handle-group"
      class="space-y-4 pb-24"
      ghost-class="opacity-50"
      @end="persistGroupOrder"
    >
      <template #item="{ element: group }">
        <div
          class="card p-0 overflow-hidden border-2"
          :class="group.items.some((item) => item.isActive !== false) ? 'border-transparent' : 'opacity-50 border-gray-200'"
        >
          <div class="flex flex-col gap-3 border-b bg-gray-50 p-3 sm:flex-row sm:items-center">
            <button
              class="drag-handle-group hidden rounded-xl p-2 text-gray-300 transition hover:text-gray-500 active:cursor-grabbing sm:inline-flex cursor-grab"
              type="button"
            >
              <GripVertical class="w-5 h-5" />
            </button>
            <button
              class="flex flex-1 items-start gap-3 text-left min-w-0"
              type="button"
              @click="toggleGroupCollapsed(group.name)"
            >
              <Package class="mt-0.5 w-5 h-5 text-brand-500 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-gray-800 line-clamp-2 break-words">{{ group.name }}</div>
                <div class="flex items-center gap-2 flex-wrap mt-1">
                  <span class="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500">
                    {{ group.visibleItems.length }} / {{ group.items.length }} 個規格
                  </span>
                  <span class="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500">
                    {{ group.scopeLabel }}
                  </span>
                  <span v-if="group.isShared" class="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                    共用品項
                  </span>
                </div>
              </div>
              <ChevronDown class="mt-0.5 w-5 h-5 flex-shrink-0 text-gray-400 transition-transform" :class="isGroupCollapsed(group.name) ? '-rotate-90' : ''" />
            </button>
            <div class="flex items-center justify-end gap-1.5" @click.stop>
              <el-switch
                :model-value="group.visibleItems.length > 0"
                @change="(val) => toggleGroupVisibility(group, val)"
              />
              <button class="p-2 rounded-xl border border-brand-100 text-brand-600 hover:bg-brand-50" @click="openForm(group)">
                <Pencil class="w-4 h-4" />
              </button>
              <button
                v-if="authStore.isOwner"
                class="p-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50"
                @click="confirmDeleteGroup(group)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div v-show="!isGroupCollapsed(group.name)" class="divide-y">
            <div v-for="item in group.visibleItems" :key="item.id" class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-800">{{ item.spec || '預設規格' }}</div>
                <div class="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                  <span>安全庫存：{{ item.minStock || 0 }}</span>
                  <span v-if="showSaleColumns">售價：{{ formatMoney(item.price || 0) }}</span>
                  <span v-if="showPurchaseColumns">採購：{{ formatMoney(item.purchasePrice || 0) }}</span>
                </div>
              </div>
              <div class="flex justify-end">
                <el-switch :model-value="appStore.isProductVisibleInHall(item)" @change="(val) => toggleItemVisibility(item, val)" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </draggable>

    <div class="card p-0 overflow-hidden border border-gray-200">
        <button
          class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left"
          @click="hiddenCollapsed = !hiddenCollapsed"
        >
          <div>
            <div class="font-semibold text-gray-700">已隱藏品項</div>
            <div class="text-xs text-gray-400">目前堂口未上架或已隱藏的品項</div>
          </div>
          <ChevronDown class="w-5 h-5 text-gray-400 transition-transform" :class="hiddenCollapsed ? '' : 'rotate-180'" />
        </button>

        <div v-show="!hiddenCollapsed" class="divide-y">
          <div
            v-for="group in hiddenGroups"
            :key="group.name"
            class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
          >
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-gray-800">{{ group.name }}</div>
              <div class="text-xs text-gray-400 mt-1">{{ group.hiddenItems.length }} 個規格目前隱藏</div>
            </div>
            <div class="flex items-center justify-end gap-2">
              <button class="btn-ghost px-4 py-2 text-sm" @click="restoreGroup(group)">
                重新上架
              </button>
              <button class="p-2 rounded-xl border border-brand-100 text-brand-600 hover:bg-brand-50" @click="openForm(group)">
                <Pencil class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div v-if="hiddenGroups.length === 0" class="px-4 py-8 text-center text-gray-400">
            目前沒有隱藏品項
          </div>
        </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingGroupName ? '編輯品項' : '新增品項'" width="92%" align-center>
      <div class="max-h-[min(70dvh,34rem)] space-y-4 overflow-y-auto py-2 pr-1">
        <div>
          <label class="label">品項名稱 *</label>
          <input v-model="form.name" type="text" class="input" placeholder="例如：背心" />
        </div>

        <div class="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div class="font-medium text-gray-700">上架範圍</div>
          <template v-if="form.localVisibilityOnly">
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              共用品項內容由系統總管 / 管理員維護，執事負責人只管理本堂口上架狀態。
            </div>
          </template>
          <template v-else-if="authStore.isHallLead">
            <div class="text-sm text-gray-600">
              執事負責人只能管理所屬堂口：{{ appStore.selectedLocation?.name }} / {{ appStore.selectedHall?.name }}
            </div>
          </template>
          <template v-else>
            <div class="flex flex-col gap-2 sm:flex-row">
              <button
                class="flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all"
                :class="form.placementMode === 'all' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500'"
                @click="form.placementMode = 'all'"
              >
                所有堂口
              </button>
              <button
                class="flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all"
                :class="form.placementMode === 'selected' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500'"
                @click="form.placementMode = 'selected'"
              >
                指定堂口
              </button>
            </div>
            <div v-if="form.placementMode === 'selected'" class="max-h-72 space-y-3 overflow-y-auto pr-1">
              <div
                v-for="location in selectableHallGroups"
                :key="location.id"
                class="rounded-2xl border border-gray-200 bg-white p-3"
              >
                <div class="mb-3 flex items-center gap-2">
                  <div class="text-sm font-semibold text-gray-800">{{ location.name }}</div>
                  <span class="text-[11px] rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-500">
                    {{ location.halls.length }} 個堂口
                  </span>
                </div>
                <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <label
                    v-for="hall in location.halls"
                    :key="hall.id"
                    class="flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition-all"
                    :class="form.hallIds.includes(hall.id) ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-gray-300'"
                  >
                    <input v-model="form.hallIds" type="checkbox" :value="hall.id" class="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div class="min-w-0">
                      <div class="font-medium text-gray-700 break-words">{{ hall.name }}</div>
                      <div class="mt-1 text-xs text-gray-400">{{ financeLabel(hall.financeMode) }}</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="label mb-0">規格管理 *</label>
            <button class="text-brand-600 font-semibold text-sm flex items-center gap-1 hover:text-brand-700" @click="addSpecLine">
              <Plus class="w-4 h-4" /> 新增規格
            </button>
          </div>

          <draggable
            :list="form.specs"
            item-key="key"
            handle=".drag-handle-spec"
            class="space-y-3"
            ghost-class="opacity-50"
          >
            <template #item="{ element: item, index }">
              <div
                class="rounded-xl border border-gray-200 bg-gray-50 p-3 relative"
                :class="item.isMarkedForDeletion ? 'opacity-40 grayscale' : ''"
              >
                <div v-if="!form.localVisibilityOnly" class="absolute left-3 top-3">
                  <button class="drag-handle-spec rounded-full border border-gray-200 bg-white p-1.5 text-gray-400 shadow-sm hover:text-gray-600 cursor-grab active:cursor-grabbing">
                    <GripVertical class="w-4 h-4" />
                  </button>
                </div>
                <div v-if="!form.localVisibilityOnly" class="absolute top-3 right-3 flex gap-1">
                  <button
                    v-if="item.id && authStore.isOwner"
                    class="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-sm"
                    @click="item.isMarkedForDeletion = true"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                  <button
                    v-if="!item.id"
                    class="bg-gray-400 text-white p-1.5 rounded-full hover:bg-gray-500 shadow-sm"
                    @click="removeSpecLine(index)"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>

                <div class="mb-2 grid grid-cols-1 gap-2" :class="form.localVisibilityOnly ? '' : 'pl-10 sm:grid-cols-2'">
                  <div>
                    <label class="text-xs text-gray-500 mb-1 block">規格名稱</label>
                    <input v-model="item.spec" type="text" class="input py-1.5 text-sm" :disabled="form.localVisibilityOnly" placeholder="如 M / 薄" />
                  </div>
                  <div v-if="showSaleFields">
                    <label class="text-xs text-gray-500 mb-1 block">售價</label>
                    <input v-model.number="item.price" type="number" class="input py-1.5 text-sm" :disabled="form.localVisibilityOnly" placeholder="0" min="0" />
                  </div>
                  <div v-if="showPurchaseFields">
                    <label class="text-xs text-gray-500 mb-1 block">採購價</label>
                    <input v-model.number="item.purchasePrice" type="number" class="input py-1.5 text-sm" :disabled="form.localVisibilityOnly" placeholder="0" min="0" />
                  </div>
                </div>

                <div class="grid grid-cols-1 items-end gap-2" :class="form.localVisibilityOnly ? '' : 'pl-10 sm:grid-cols-2'">
                  <div>
                    <label class="text-xs text-gray-500 mb-1 block">安全庫存</label>
                    <input v-model.number="item.minStock" type="number" class="input py-1.5 text-sm" :disabled="form.localVisibilityOnly" placeholder="0" min="0" />
                  </div>
                  <div class="flex items-center justify-end h-10 px-1">
                    <span class="text-xs text-gray-400 mr-2">{{ form.localVisibilityOnly ? '本堂口上架' : '主檔啟用' }}</span>
                    <el-switch
                      v-if="form.localVisibilityOnly"
                      :model-value="item.hallVisible"
                      size="small"
                      @change="(val) => toggleItemVisibility(item, val)"
                    />
                    <el-switch v-else v-model="item.isActive" size="small" />
                  </div>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost mr-2" @click="dialogVisible = false">取消</button>
        <button v-if="!form.localVisibilityOnly" class="btn-primary" :disabled="saveDisabled || saving" @click="save">
          {{ saving ? '儲存中…' : '確認儲存' }}
        </button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import { ChevronDown, GripVertical, Package, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'
import { formatMoney } from '@/utils/format'
import { FINANCE_MODE_MAP, buildPlacementDocId, isPurchaseEnabled, isSaleEnabled, sortByOrder } from '@/utils/multiDept'

const authStore = useAuthStore()
const appStore = useAppStore()

const dialogVisible = ref(false)
const saving = ref(false)
const hiddenCollapsed = ref(true)
const editingGroupName = ref('')
const collapsedGroups = ref({})
const draggableGroups = ref([])

const form = ref({
  name: '',
  placementMode: 'all',
  hallIds: [],
  specs: [],
  localVisibilityOnly: false,
})

const currentFinanceMode = computed(() => appStore.selectedHallFinanceMode)
const showSaleColumns = computed(() => isSaleEnabled(currentFinanceMode.value))
const showPurchaseColumns = computed(() => isPurchaseEnabled(currentFinanceMode.value))

const showSaleFields = computed(() => {
  if (authStore.isHallLead) return isSaleEnabled(currentFinanceMode.value)
  return targetHallIds.value.some((hallId) => isSaleEnabled(appStore.getHallById(hallId)?.financeMode))
})

const showPurchaseFields = computed(() => {
  if (authStore.isHallLead) return isPurchaseEnabled(currentFinanceMode.value)
  return targetHallIds.value.some((hallId) => isPurchaseEnabled(appStore.getHallById(hallId)?.financeMode))
})

const selectableHalls = computed(() =>
  [...appStore.halls]
    .filter((hall) => hall.isActive !== false)
    .sort((a, b) => {
      const locA = appStore.locations.find((loc) => loc.id === a.locationId)
      const locB = appStore.locations.find((loc) => loc.id === b.locationId)
      if (locA?.id !== locB?.id) return sortByOrder(locA, locB)
      return sortByOrder(a, b)
    })
    .map((hall) => ({
      ...hall,
      locationName: appStore.locations.find((loc) => loc.id === hall.locationId)?.name || '未知道場',
    }))
)

const selectableHallGroups = computed(() =>
  [...appStore.locations]
    .filter((location) => location.isActive !== false)
    .sort(sortByOrder)
    .map((location) => ({
      id: location.id,
      name: location.name,
      halls: selectableHalls.value.filter((hall) => hall.locationId === location.id),
    }))
    .filter((location) => location.halls.length > 0)
)

const targetHallIds = computed(() => {
  if (authStore.isHallLead) return appStore.selectedHallId ? [appStore.selectedHallId] : []
  if (form.value.placementMode === 'all') {
    return selectableHalls.value.map((hall) => hall.id)
  }
  return form.value.hallIds
})

function buildGroups(items) {
  const map = new Map()
  items.forEach((item) => {
    if (!map.has(item.name)) {
      map.set(item.name, { name: item.name, items: [] })
    }
    map.get(item.name).items.push(item)
  })

  return Array.from(map.values())
    .map((group) => {
      const visibleCount = group.items.reduce((sum, item) => sum + visibleHallIds(item).length, 0)
      const visibleItems = [...group.items]
        .filter((item) => appStore.isProductVisibleInHall(item))
        .sort(sortByOrder)
      const hiddenItems = [...group.items]
        .filter((item) => appStore.isProductManagedInHall(item) && !appStore.isProductVisibleInHall(item))
        .sort(sortByOrder)
      return {
        ...group,
        items: [...group.items].sort(sortByOrder),
        visibleItems,
        hiddenItems,
        isShared: group.items.some((item) => isSharedProduct(item)),
        scopeLabel: visibleCount > 1 ? `上架 ${visibleCount} 個堂口` : '單堂口',
      }
    })
    .sort((a, b) => sortByOrder(a.items[0], b.items[0]))
}

const allGroups = computed(() => buildGroups(appStore.products.filter((product) => product.isActive !== false)))
const visibleGroups = computed(() => allGroups.value.filter((group) => group.visibleItems.length > 0))
const hiddenGroups = computed(() => allGroups.value.filter((group) => group.hiddenItems.length > 0))

watch(
  visibleGroups,
  (groups) => {
    draggableGroups.value = groups.map((group) => ({
      ...group,
      items: [...group.items],
    }))

    const nextCollapsed = {}
    groups.forEach((group) => {
      nextCollapsed[group.name] = collapsedGroups.value[group.name] ?? true
    })
    collapsedGroups.value = nextCollapsed
  },
  { immediate: true }
)

const saveDisabled = computed(() => {
  if (!form.value.name.trim()) return true
  if (form.value.specs.filter((item) => !item.isMarkedForDeletion).length === 0) return true
  if (!authStore.isHallLead && form.value.placementMode === 'selected' && form.value.hallIds.length === 0) return true
  return false
})

function financeLabel(mode) {
  return FINANCE_MODE_MAP[mode] ?? FINANCE_MODE_MAP.none
}

function isGroupCollapsed(name) {
  return collapsedGroups.value[name] ?? false
}

function toggleGroupCollapsed(name) {
  collapsedGroups.value = {
    ...collapsedGroups.value,
    [name]: !isGroupCollapsed(name),
  }
}

function visibleHallIds(product) {
  return appStore.getManagedHallIds(product)
    .filter((hallId) => appStore.isProductVisibleInHall(product, hallId))
}

function isSharedProduct(product) {
  const visibleIds = visibleHallIds(product)
  return product.placementMode === 'all' || visibleIds.some((hallId) => hallId !== appStore.selectedHallId)
}

function addSpecLine() {
  form.value.specs.push({
    key: uuidv4(),
    id: null,
    spec: '',
    price: 0,
    purchasePrice: 0,
    minStock: 0,
    isActive: true,
    isMarkedForDeletion: false,
  })
}

function removeSpecLine(index) {
  form.value.specs.splice(index, 1)
}

function openForm(group = null) {
  editingGroupName.value = group?.name ?? ''
  const localVisibilityOnly = authStore.isHallLead && group?.isShared

  if (group) {
    const editableItems = localVisibilityOnly
      ? group.items.filter((item) => appStore.isProductManagedInHall(item))
      : group.items
    const hallIds = Array.from(
      new Set(editableItems.flatMap((item) => appStore.getManagedHallIds(item)))
    )
    const placementMode = editableItems.every((item) => item.placementMode === 'all') ? 'all' : 'selected'
    form.value = {
      name: group.name,
      placementMode: authStore.isHallLead ? 'selected' : placementMode,
      hallIds: authStore.isHallLead ? [appStore.selectedHallId] : hallIds,
      localVisibilityOnly,
      specs: editableItems.map((item) => ({
        key: uuidv4(),
        id: item.id,
        spec: item.spec ?? '',
        price: item.price ?? 0,
        purchasePrice: item.purchasePrice ?? 0,
        minStock: item.minStock ?? 0,
        isActive: item.isActive !== false,
        hallVisible: appStore.isProductVisibleInHall(item),
        isMarkedForDeletion: false,
      })),
    }
  } else {
    form.value = {
      name: '',
      placementMode: authStore.isHallLead ? 'selected' : 'all',
      hallIds: authStore.isHallLead ? [appStore.selectedHallId] : selectableHalls.value.map((hall) => hall.id),
      localVisibilityOnly: false,
      specs: [],
    }
    addSpecLine()
  }

  dialogVisible.value = true
}

async function syncPlacements(batch, productId, hallIds, placementMode) {
  const visibleSet = new Set(placementMode === 'all' ? selectableHalls.value.map((hall) => hall.id) : hallIds)

  selectableHalls.value.forEach((hall) => {
    const placementId = buildPlacementDocId(productId, hall.id)
    const existing = appStore.getPlacement(productId, hall.id)
    if (placementMode === 'selected' && !visibleSet.has(hall.id)) {
      if (existing) {
        batch.delete(doc(db, 'productPlacements', placementId))
      }
      return
    }

    if (visibleSet.has(hall.id)) {
      batch.set(
        doc(db, 'productPlacements', placementId),
        {
          productId,
          locationId: hall.locationId,
          hallId: hall.id,
          isVisible: true,
          financeModeOverride: existing?.financeModeOverride ?? null,
          createdAt: existing?.createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }
  })
}

async function persistGroupOrder() {
  try {
    const batch = writeBatch(db)

    draggableGroups.value.forEach((group, groupIndex) => {
      const baseOrder = (groupIndex + 1) * 100
      group.items.forEach((item, itemIndex) => {
        batch.update(doc(db, 'products', item.id), { order: baseOrder + itemIndex })
      })
    })

    await batch.commit()
    ElMessage.success('品相排序已更新')
  } catch (error) {
    ElMessage.error(`排序更新失敗：${error.message}`)
  }
}

async function save() {
  saving.value = true
  try {
    const baseName = form.value.name.trim()
    const batch = writeBatch(db)
    const hallIds = authStore.isHallLead ? [appStore.selectedHallId] : form.value.hallIds
    const placementMode = authStore.isHallLead ? 'selected' : form.value.placementMode

    const baseOrder =
      editingGroupName.value
        ? visibleGroups.value.find((group) => group.name === editingGroupName.value)?.items[0]?.order ||
          hiddenGroups.value.find((group) => group.name === editingGroupName.value)?.items[0]?.order ||
          100
        : (Math.max(0, ...appStore.products.map((product) => Number(product.order || 0))) + 100)

    for (const [index, item] of form.value.specs.entries()) {
      if (item.isMarkedForDeletion && item.id) {
        batch.delete(doc(db, 'products', item.id))
        selectableHalls.value.forEach((hall) => {
          const placement = appStore.getPlacement(item.id, hall.id)
          if (placement) {
            batch.delete(doc(db, 'productPlacements', buildPlacementDocId(item.id, hall.id)))
          }
        })
        continue
      }

      if (item.isMarkedForDeletion) continue

      const productRef = item.id ? doc(db, 'products', item.id) : doc(collection(db, 'products'))
      batch.set(
        productRef,
        {
          name: baseName,
          spec: item.spec.trim(),
          price: Number(item.price || 0),
          purchasePrice: Number(item.purchasePrice || 0),
          minStock: Number(item.minStock || 0),
          isActive: item.isActive,
          order: baseOrder + index,
          placementMode,
          selectedHallIds: placementMode === 'selected' ? hallIds : [],
        },
        { merge: true }
      )
      await syncPlacements(batch, productRef.id, hallIds, placementMode)
    }

    await batch.commit()
    dialogVisible.value = false
    ElMessage.success('品項已儲存')
  } catch (error) {
    ElMessage.error(`儲存失敗：${error.message}`)
  } finally {
    saving.value = false
  }
}

async function toggleItemVisibility(product, value) {
  const hallId = appStore.selectedHallId
  const hall = appStore.selectedHall
  if (!hallId || !hall) return

  await updateDocOrCreate(product.id, hall, value)
}

async function toggleGroupVisibility(group, value) {
  const hall = appStore.selectedHall
  if (!hall) return

  const batch = writeBatch(db)
  ;[...group.visibleItems, ...group.hiddenItems].forEach((item) => {
    batch.set(
      doc(db, 'productPlacements', buildPlacementDocId(item.id, hall.id)),
      {
        productId: item.id,
        locationId: hall.locationId,
        hallId: hall.id,
        isVisible: value,
        financeModeOverride: appStore.getPlacement(item.id, hall.id)?.financeModeOverride ?? null,
        createdAt: appStore.getPlacement(item.id, hall.id)?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  })
  await batch.commit()
}

async function updateDocOrCreate(productId, hall, isVisible) {
  const placementId = buildPlacementDocId(productId, hall.id)
  const existing = appStore.getPlacement(productId, hall.id)
  const placementRef = doc(db, 'productPlacements', placementId)

  if (existing) {
    await updateDoc(placementRef, {
      isVisible,
      updatedAt: serverTimestamp(),
    })
    return
  }

  await writeBatchSet(placementRef, {
    productId,
    locationId: hall.locationId,
    hallId: hall.id,
    isVisible,
    financeModeOverride: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

async function writeBatchSet(ref, data) {
  const batch = writeBatch(db)
  batch.set(ref, data, { merge: true })
  await batch.commit()
}

async function restoreGroup(group) {
  const hall = appStore.selectedHall
  if (!hall) return

  const batch = writeBatch(db)
  group.hiddenItems.forEach((item) => {
    batch.set(
      doc(db, 'productPlacements', buildPlacementDocId(item.id, hall.id)),
      {
        productId: item.id,
        locationId: hall.locationId,
        hallId: hall.id,
        isVisible: true,
        financeModeOverride: appStore.getPlacement(item.id, hall.id)?.financeModeOverride ?? null,
        createdAt: appStore.getPlacement(item.id, hall.id)?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  })
  await batch.commit()
  ElMessage.success('已重新上架到目前堂口')
}

async function confirmDeleteGroup(group) {
  try {
    await ElMessageBox.confirm(
      `確定要徹底刪除「${group.name}」嗎？這會移除所有規格與堂口上架設定。`,
      '刪除品項',
      {
        confirmButtonText: '確認刪除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    for (const item of group.items) {
      await deleteDoc(doc(db, 'products', item.id))
      await Promise.all(
        selectableHalls.value.map(async (hall) => {
          const placement = appStore.getPlacement(item.id, hall.id)
          if (placement) {
            await deleteDoc(doc(db, 'productPlacements', buildPlacementDocId(item.id, hall.id)))
          }
        })
      )
    }

    ElMessage.success('品項已刪除')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`刪除失敗：${error.message}`)
    }
  }
}
</script>
