<template>
  <AppLayout title="品項管理" :show-location-picker="true">
    <div class="flex justify-end mb-4">
      <button class="btn-primary gap-2 text-base" @click="openForm()">
        <Plus class="w-5 h-5" /> 新增品項
      </button>
    </div>

    <!-- 骨架屏 / Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else class="space-y-2 pb-24">
      <!-- 拖拽列表 (以群組顯示) -->
      <VueDraggable
        v-model="draggableGroups"
        item-key="name"
        handle=".drag-handle"
        @end="onDragEnd"
        class="space-y-4"
        ghost-class="opacity-50"
      >
        <template #item="{ element: group }">
          <div class="card p-0 overflow-hidden border-2" :class="group.items.some(i => i.isActive) ? 'border-transparent' : 'opacity-50 border-gray-200'">
            <!-- 群組標頭 -->
            <div
              class="flex items-center gap-2 p-3 bg-gray-50 border-b cursor-pointer select-none"
              @click="toggleGroup(group.name)"
            >
              <button class="drag-handle p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0" @click.stop>
                <GripVertical class="w-5 h-5" />
              </button>
              <div class="font-bold text-gray-800 flex-1 min-w-0 line-clamp-2 break-words text-sm sm:text-base">{{ group.name }}</div>
              
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <div class="text-[10px] sm:text-xs text-gray-500 bg-white px-2 py-1 rounded-lg border shadow-sm hidden xs:block">
                  {{ group.items.length }} 個規格
                </div>
                <!-- 新增：群組開關 (針對當前道場) -->
                <div class="ml-2 mr-1 flex items-center" @click.stop v-if="authStore.isAdmin || authStore.isOwner">
                  <el-switch
                    :model-value="getGroupActive(group)"
                    @change="(val) => toggleGroupActive(group, val)"
                  />
                </div>
                <button class="p-1.5 rounded-xl border-2 border-brand-100 bg-white text-brand-600 hover:bg-brand-50 transition-colors" @click.stop="openForm(group, true)" title="複製此品項">
                  <Copy class="w-4 h-4" />
                </button>
                <button class="p-1.5 rounded-xl border-2 border-brand-100 bg-white text-brand-600 hover:bg-brand-50 transition-colors" @click.stop="openForm(group)">
                  <Pencil class="w-4 h-4" />
                </button>
                <!-- 收合圖示 -->
                <button class="p-1 text-gray-400 hover:text-gray-600 transition-transform duration-200" :class="expandedGroups.has(group.name) ? 'rotate-180' : ''" @click.stop="toggleGroup(group.name)">
                  <ChevronDown class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- 群組內品項（可收合） -->
            <transition name="collapse">
              <div v-show="expandedGroups.has(group.name)" class="divide-y opacity-70">
                <div
                  v-for="p in group.items"
                  :key="p.id"
                  class="flex items-center gap-3 p-3 pl-12 bg-white transition-colors"
                  :class="!p.isActive ? 'opacity-50' : ''"
                >
                  <!-- 品項資訊 -->
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-gray-800 break-words">
                      {{ p.spec || '預設規格' }}
                    </div>
                    <div class="text-sm text-gray-400 break-words">單價: {{ p.price || 0 }} | 安全庫存: {{ p.minStock || 0 }}</div>
                  </div>

                  <el-switch :model-value="getItemActive(p)" @change="(val) => toggleActive(p, val)" />
                </div>
              </div>
            </transition>
          </div>
        </template>
      </VueDraggable>
    </div>

    <!-- 新增/編輯 Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '編輯品項' : '新增品項'" width="92%" align-center>
      <div class="space-y-4 py-2">
        <div>
          <label class="label">品項名稱 *</label>
          <input v-model="form.name" type="text" class="input" placeholder="例如：背心" />
          <p class="text-xs text-brand-600 mt-1">變更名稱後，下方所有規格將同步更新品名。</p>
        </div>

        <div class="border-t pt-4">
          <div class="flex justify-between items-center mb-2">
            <label class="label mb-0">規格管理 *</label>
            <button class="text-brand-600 font-semibold text-sm flex items-center gap-1 hover:text-brand-700" @click="addSpecLine">
              <Plus class="w-4 h-4"/> 新增規格
            </button>
          </div>

          <VueDraggable
            v-model="form.specs"
            item-key="key"
            handle=".drag-spec-handle"
            class="space-y-3"
            ghost-class="opacity-50"
          >
            <template #item="{ element: item, index: idx }">
              <div class="p-3 bg-gray-50 rounded-xl border relative transition-all"
                :class="item.isMarkedForDeletion ? 'opacity-30 grayscale pointer-events-none' : ''">
                
                <div class="absolute -top-3 -left-3 flex gap-1 z-10" v-if="!item.isMarkedForDeletion">
                  <button class="drag-spec-handle bg-white border border-gray-200 text-gray-400 hover:text-gray-600 p-1.5 rounded-full shadow-sm cursor-grab active:cursor-grabbing">
                    <GripVertical class="w-4 h-4" />
                  </button>
                </div>

                <!-- 刪除/移除按鈕 -->
                <div class="absolute -top-2 -right-2 flex gap-1 z-10">
                  <!-- 管理員只能停用，總管可以刪除 -->
                  <button v-if="item.id && authStore.isOwner" 
                    class="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-sm"
                    title="徹底刪除"
                    @click="item.isMarkedForDeletion = true">
                    <Trash2 class="w-3 h-3"/>
                  </button>
                  <button v-if="!item.id" 
                    class="bg-gray-400 text-white p-1.5 rounded-full hover:bg-gray-500 shadow-sm"
                    @click="removeSpecLine(idx)">
                    <X class="w-3 h-3"/>
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label class="text-xs text-gray-500 mb-1 block">規格名稱</label>
                    <input v-model="item.spec" type="text" class="input py-1.5 text-sm" placeholder="如: M、薄 (可留空)" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-500 mb-1 block">單價</label>
                    <input v-model.number="item.price" type="number" class="input py-1.5 text-sm" placeholder="0" min="0" />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2 items-end">
                  <div>
                    <label class="text-xs text-gray-500 mb-1 block">安全庫存</label>
                    <input v-model.number="item.minStock" type="number" class="input py-1.5 text-sm" placeholder="預設: 0" min="0" />
                  </div>
                  <div class="flex items-center justify-end h-10 px-1">
                     <span class="text-xs text-gray-400 mr-2">系統啟用狀態</span>
                     <el-switch v-model="item.isActive" size="small" />
                  </div>
                </div>

                <!-- 道場獨立設定 (Overrides) -->
                <div class="mt-3 pt-3 border-t border-gray-200" v-if="appStore.locations.length > 0">
                  <div class="text-xs text-brand-600 font-bold mb-2 flex items-center gap-1">
                    各道場獨立設定 (選填)
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     <div v-for="loc in appStore.locations" :key="loc.id" class="bg-white p-2 rounded border border-gray-200 flex flex-col gap-1 shadow-sm">
                        <div class="font-bold text-[11px] text-gray-700 truncate" :title="loc.name">{{ loc.name }}</div>
                        <div class="flex items-center gap-2">
                           <div class="flex-1">
                             <label class="text-[10px] text-gray-500 block mb-0.5">單價覆蓋</label>
                             <input type="number" class="input py-1 text-xs" :placeholder="`預設: ${item.price || 0}`"
                                    :value="item.overrides?.[loc.id]?.price ?? ''"
                                    @input="e => updateOverride(item, loc.id, 'price', e.target.value)" />
                           </div>
                           <div class="flex flex-col items-center justify-end">
                             <label class="text-[10px] text-gray-500 block mb-0.5">在該道場顯示</label>
                             <el-switch size="small"
                                        :model-value="item.overrides?.[loc.id]?.isActive ?? true"
                                        @change="val => updateOverride(item, loc.id, 'isActive', val)" />
                           </div>
                        </div>
                     </div>
                  </div>
                </div>

                <div v-if="item.isMarkedForDeletion" class="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded absolute top-2 left-2 font-bold pointer-events-auto">待刪除</div>
              </div>
            </template>
          </VueDraggable>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost mr-2" @click="dialogVisible = false">取消</button>
        <button class="btn-primary" :disabled="!form.name || form.specs.filter(s => !s.isMarkedForDeletion).length === 0 || saving" @click="save">
          {{ saving ? '儲存中…' : '確認儲存' }}
        </button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import {
  collection, addDoc, updateDoc, doc, writeBatch, deleteDoc
} from 'firebase/firestore'
import { Plus, Pencil, GripVertical, X, Trash2, ChevronDown, Copy } from 'lucide-vue-next'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'
import VueDraggable from 'vuedraggable'
import { v4 as uuidv4 } from 'uuid'

const authStore = useAuthStore()
const appStore = useAppStore()
const loading  = ref(false)
const saving   = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)

const draggableGroups = ref([])
const expandedGroups = ref(new Set())

function toggleGroup(name) {
  if (expandedGroups.value.has(name)) {
    expandedGroups.value.delete(name)
  } else {
    expandedGroups.value.add(name)
  }
  // trigger reactivity
  expandedGroups.value = new Set(expandedGroups.value)
}

function getItemActive(p) {
  const locId = appStore.selectedLocationId
  if (!locId) return p.isActive
  return p.overrides?.[locId]?.isActive ?? p.isActive
}

function getGroupActive(group) {
  return group.items.some(p => getItemActive(p))
}

watch(() => appStore.products, (newVal) => {
  // 分組邏輯
  const map = new Map()
  
  // 保持依照 appStore.products 原本的 order 順序，依序放入分組
  newVal.forEach(p => {
    if (!map.has(p.name)) {
      map.set(p.name, {
        name: p.name,
        order: p.order || 999999,
        items: []
      })
    }
    map.get(p.name).items.push(p)
  })

  // 將 Map 轉為 Array 並依照每個 group 原本的 order 排序
  draggableGroups.value = Array.from(map.values()).sort((a, b) => a.order - b.order)

}, { immediate: true })



const form = ref({ name: '', specs: [], originalName: '' })

function addSpecLine() {
  form.value.specs.push({ key: uuidv4(), id: null, spec: '', price: 0, minStock: 0, isActive: true, isMarkedForDeletion: false, overrides: {} })
}

function updateOverride(item, locId, field, value) {
  if (!item.overrides) item.overrides = {}
  if (!item.overrides[locId]) item.overrides[locId] = { isActive: true } // default behavior
  
  if (field === 'price') {
    const num = parseFloat(value)
    item.overrides[locId].price = isNaN(num) ? null : num
  } else {
    item.overrides[locId][field] = value
  }
}

function removeSpecLine(idx) {
  form.value.specs.splice(idx, 1)
}

function openForm(group = null, isCopy = false) {
  editingId.value = group && !isCopy ? 'GROUP' : null 
  
  if (group) {
    form.value = {
      originalName: isCopy ? '' : group.name,
      name: isCopy ? `${group.name} (複製)` : group.name,
      specs: group.items.map(p => ({
        key: uuidv4(),
        id: isCopy ? null : p.id,
        spec: p.spec ?? '',
        price: p.price ?? 0,
        minStock: p.minStock ?? 0,
        isActive: isCopy ? true : p.isActive,
        isMarkedForDeletion: false,
        overrides: isCopy ? {} : (p.overrides ? JSON.parse(JSON.stringify(p.overrides)) : {})
      }))
    }
  } else {
    form.value = {
      originalName: '',
      name: '',
      specs: [
        { key: uuidv4(), id: null, spec: '', price: 0, minStock: 0, isActive: true, isMarkedForDeletion: false, overrides: {} }
      ]
    }
  }
  dialogVisible.value = true
}

async function save() {
  saving.value = true
  try {
    const baseName = form.value.name.trim()
    const batch = writeBatch(db)

    if (editingId.value === 'GROUP') {
      const baseOrder = draggableGroups.value.find(g => g.name === form.value.originalName)?.order || 100
      
      // 1. 處理現有規格的更新與標記刪除
      form.value.specs.forEach((s, idx) => {
        const itemOrder = baseOrder + idx
        if (s.id) {
          const pRef = doc(db, 'products', s.id)
          if (s.isMarkedForDeletion) {
             batch.delete(pRef)
          } else {
             batch.update(pRef, {
               name: baseName,
               spec: s.spec.trim(),
               price: s.price,
               minStock: s.minStock,
               isActive: s.isActive,
               order: itemOrder,
               overrides: s.overrides || {}
             })
          }
        } else if (!s.isMarkedForDeletion) {
          // 2. 處理編輯視窗中新增的規格
          const newRef = doc(collection(db, 'products'))
          batch.set(newRef, {
            name: baseName,
            spec: s.spec.trim(),
            price: s.price,
            minStock: s.minStock,
            isActive: s.isActive,
            order: itemOrder,
            overrides: s.overrides || {}
          })
        }
      })
    } else {
      // 全新新增模式
      const nextBaseOrder = (draggableGroups.value.length > 0) 
        ? Math.max(...draggableGroups.value.map(g => g.order)) + 100 
        : 100

      form.value.specs.forEach((s, idx) => {
        if (!s.isMarkedForDeletion) {
          const newRef = doc(collection(db, 'products'))
          batch.set(newRef, {
            name: baseName,
            spec: s.spec.trim(),
            price: s.price,
            minStock: s.minStock,
            isActive: true, // 新建預設啟用
            order: nextBaseOrder + idx,
            overrides: s.overrides || {}
          })
        }
      })
    }
    await batch.commit()
    dialogVisible.value = false
  } catch (e) {
    console.error('儲存失敗', e)
    alert('儲存失敗：' + e.message)
  } finally {
    saving.value = false
  }
}

async function toggleActive(product, val) {
  const locId = appStore.selectedLocationId
  if (!locId) return

  const newOverrides = { ...(product.overrides || {}) }
  if (!newOverrides[locId]) newOverrides[locId] = {}
  newOverrides[locId].isActive = val

  await updateDoc(doc(db, 'products', product.id), { overrides: newOverrides })
}

async function toggleGroupActive(group, val) {
  const locId = appStore.selectedLocationId
  if (!locId) return

  const batch = writeBatch(db)
  group.items.forEach(p => {
    const newOverrides = { ...(p.overrides || {}) }
    if (!newOverrides[locId]) newOverrides[locId] = {}
    newOverrides[locId].isActive = val

    const pRef = doc(db, 'products', p.id)
    batch.update(pRef, { overrides: newOverrides })
  })
  try {
    await batch.commit()
  } catch(e) {
    console.error(e)
    alert('更新群組啟用狀態失敗')
  }
}

async function onDragEnd() {
  try {
    const batch = writeBatch(db)
    draggableGroups.value.forEach((group, index) => {
      const newBaseOrder = (index + 1) * 100
      if (group.order !== newBaseOrder) {
        group.order = newBaseOrder
      }
      group.items.forEach((p, pIdx) => {
        const pRef = doc(db, 'products', p.id)
        batch.update(pRef, { order: newBaseOrder + pIdx })
      })
    })
    await batch.commit()
  } catch(e) {
    console.error('更新排序失敗', e)
  }
}
</script>
