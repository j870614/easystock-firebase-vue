<template>
  <AppLayout title="庫存總覽" show-location-picker>
    <!-- 無道場提示 -->
    <div
      v-if="!appStore.selectedLocationId || !appStore.selectedHallId"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <Building2 class="w-16 h-16 text-gray-300 mb-4" />
      <p class="text-gray-500">尚未選擇道場與堂口<br />請點選右上角選擇</p>
    </div>

    <template v-else>
      <!-- 歡迎卡片 -->
      <div class="card bg-gradient-to-r from-brand-600 to-brand-500 text-white mb-4 !border-0">
        <div class="flex items-center gap-3">
          <img
            :src="authStore.user?.photoURL || ''"
            class="w-12 h-12 rounded-full bg-white/20 flex-shrink-0"
          />
          <div>
            <div class="text-white/80 text-sm">歡迎回來，</div>
            <div class="font-bold text-xl">{{ authStore.user?.displayName }}</div>
          </div>
          <span
            class="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-white/20"
          >
            {{ roleLabel }}
          </span>
        </div>
        <div class="mt-3 pt-3 border-t border-white/20 flex items-center gap-2 text-sm text-white/80">
          <MapPin class="w-4 h-4" />
          {{ appStore.selectedLocation.name }} / {{ appStore.selectedHall?.name }}
          <span class="ml-auto">{{ today }}</span>
        </div>
      </div>

      <!-- 庫存卡片列表 -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <template v-else>
        <!-- 顯示選項與篩選 -->
        <div class="mb-5 space-y-3">
          <!-- 標題與切換 -->
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-gray-500" :style="{ fontSize: 'var(--fs-main)' }">各品項庫存</h2>
            <div class="flex items-center gap-3">
              <div class="flex gap-2 text-xs">
                <button
                  class="text-brand-600 hover:underline"
                  @click="selectAllProducts"
                  v-if="selectedGroupNames.length !== productGroups.length"
                >全選</button>
                <button
                  class="text-gray-400 hover:underline"
                  @click="selectedGroupNames = []"
                  v-else
                >取消全選</button>
              </div>
              <div class="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                 <button class="p-1 rounded-md transition-colors" :class="viewMode === 'card' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'" @click="viewMode = 'card'">
                   <LayoutGrid class="w-4 h-4"/>
                 </button>
                 <button class="p-1 rounded-md transition-colors" :class="viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'" @click="viewMode = 'list'">
                   <List class="w-4 h-4"/>
                 </button>
              </div>
            </div>
          </div>
          
          <!-- 篩選標籤 -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="name in productGroups"
              :key="name"
              class="px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all"
              :class="selectedGroupNames.includes(name)
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'"
              @click="toggleProduct(name)"
            >
              {{ name }}
            </button>
          </div>
        </div>

        <!-- 清單模式 -->
        <div v-if="viewMode === 'list'" class="flex flex-col gap-2 mb-4">
          <div
            v-for="item in stockItems"
            :key="item.id"
            class="card flex items-center justify-between p-3 relative overflow-hidden"
            :class="item.currentStock <= (item.minStock || 0) ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-sm flex-shrink-0"
                :class="item.currentStock <= (item.minStock || 0) ? 'bg-red-400' : 'bg-green-500'"
              >
                {{ String(item.name).charAt(0) }}
              </div>
              <div class="leading-snug break-words" :class="item.currentStock <= (item.minStock || 0) ? 'text-red-900' : 'text-gray-800'" :style="{ fontSize: 'var(--fs-name)' }">
                <span class="font-bold">{{ item.name }}</span>
                <div v-if="item.spec" class="text-sm text-gray-500">{{ item.spec }}</div>
              </div>
            </div>
            
            <div class="text-right">
              <div
                class="text-xl font-bold"
                :class="item.currentStock <= (item.minStock || 0) ? 'text-red-600' : 'text-gray-800'"
              >
                {{ item.currentStock }}
              </div>
              <div v-if="item.currentStock <= (item.minStock || 0)" class="text-[10px] text-red-500 font-bold bg-red-50 px-1 rounded">
                注補 (安全: {{ item.minStock || 0 }})
              </div>
            </div>
          </div>
          <div v-if="stockItems.length === 0" class="py-10 text-center text-gray-400">目前沒有符合的品項</div>
        </div>

        <!-- 卡片模式 -->
        <div v-else class="grid grid-cols-2 gap-3 mb-4">
          <div
            v-for="item in stockItems"
            :key="item.id"
            class="card flex flex-col gap-1 relative overflow-hidden"
            :class="item.currentStock <= (item.minStock || 0)
              ? 'border-l-4 border-l-red-500 bg-red-50'
              : 'border-l-4 border-l-green-500'"
          >
            <!-- 低庫存角標 -->
            <span
              v-if="item.currentStock <= (item.minStock || 0)"
              class="absolute top-2 right-2 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none"
            >注補</span>
            <div class="leading-snug pr-8 break-words" :class="item.currentStock <= (item.minStock || 0) ? 'text-red-900' : 'text-gray-500'" :style="{ fontSize: 'var(--fs-main)' }">
              {{ item.name }}
              <span v-if="item.spec" class="font-medium">・{{ item.spec }}</span>
            </div>
            <div
              class="text-3xl font-bold mt-1"
              :class="item.currentStock <= (item.minStock || 0) ? 'text-red-600' : 'text-gray-800'"
            >
              {{ item.currentStock }}
            </div>
            <div class="text-xs" :class="item.currentStock <= (item.minStock || 0) ? 'text-red-400' : 'text-gray-400'">
              件（安全: {{ item.minStock || 0 }}）
            </div>
          </div>
          <div v-if="stockItems.length === 0" class="col-span-2 py-10 text-center text-gray-400">目前沒有符合的品項</div>
        </div>

        <!-- 今日統計 -->
        <h2 class="font-semibold text-gray-500 mb-3" :style="{ fontSize: 'var(--fs-main)' }">今日交易</h2>
        <div class="grid grid-cols-2 gap-3">
          <div class="card text-center">
            <div class="text-sm text-green-600 font-medium mb-1">入庫</div>
            <div class="text-3xl font-bold text-green-600">{{ todayIn }}</div>
            <div class="text-xs text-gray-400">筆</div>
          </div>
          <div class="card text-center">
            <div class="text-sm text-red-600 font-medium mb-1">出庫</div>
            <div class="text-3xl font-bold text-red-600">{{ todayOut }}</div>
            <div class="text-xs text-gray-400">筆</div>
          </div>
        </div>
      </template>
    </template>
  </AppLayout>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { Building2, MapPin, LayoutGrid, List } from 'lucide-vue-next'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const appStore = useAppStore()

const loading = ref(false)
const stockMap = ref({})
const todayIn = ref(0)
const todayOut = ref(0)
let unsubscribeStocks = null
let unsubscribeTx = null

const viewMode = ref('card')
const selectedGroupNames = ref([])

const productGroups = computed(() => {
  const names = []
  const seen = new Set()
  appStore.activeProducts.forEach(p => {
    if (!seen.has(p.name)) {
      seen.add(p.name)
      names.push(p.name)
    }
  })
  return names
})

const today = computed(() =>
  new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
)

const roleLabel = computed(() => ({
  owner: '系統總管',
  admin: '管理員',
  hallLead: '執事負責人',
  staff: '一般人員',
}[authStore.role] ?? '待審核'))

const stockItems = computed(() => {
  let items = appStore.activeProducts.map(p => ({
    ...p,
    currentStock: stockMap.value[p.id] ?? 0,
  }))
  
  // 篩選選中的標籤 (如果有選)
  if (selectedGroupNames.value.length > 0) {
    items = items.filter(p => selectedGroupNames.value.includes(p.name))
  }
  
  return items
})

function selectAllProducts() {
  selectedGroupNames.value = [...productGroups.value]
}

function toggleProduct(name) {
  const idx = selectedGroupNames.value.indexOf(name)
  if (idx === -1) {
    selectedGroupNames.value.push(name)
  } else {
    selectedGroupNames.value.splice(idx, 1)
  }
}

function stopListeners() {
  if (unsubscribeStocks) {
    unsubscribeStocks()
    unsubscribeStocks = null
  }
  if (unsubscribeTx) {
    unsubscribeTx()
    unsubscribeTx = null
  }
}

function listenData() {
  stopListeners()
  if (!appStore.selectedLocationId || !appStore.selectedHallId) return
  
  loading.value = true
  const locId = appStore.selectedLocationId
  const hallId = appStore.selectedHallId

  // 1. 監聽庫存
  const stockQ = query(
    collection(db, 'stocks'),
    where('locationId', '==', locId),
    where('hallId', '==', hallId)
  )
  unsubscribeStocks = onSnapshot(stockQ, (snap) => {
    stockMap.value = Object.fromEntries(
      snap.docs.map(d => [d.data().productId, d.data().currentStock])
    )
    loading.value = false
  }, (err) => {
    console.error('Dashboard stocks error:', err)
    loading.value = false
  })

  // 2. 監聽今日交易
  const todayStr = new Date().toISOString().slice(0, 10)
  const txQ = query(
    collection(db, 'transactions'),
    where('locationId', '==', locId),
    where('hallId', '==', hallId),
    where('date', '==', todayStr)
  )
  unsubscribeTx = onSnapshot(txQ, (snap) => {
    todayIn.value  = snap.docs.filter(d => d.data().type === 'in').length
    todayOut.value = snap.docs.filter(d => d.data().type === 'out').length
  }, (err) => {
    console.error('Dashboard tx error:', err)
  })
}

watch(() => [appStore.selectedLocationId, appStore.selectedHallId], listenData)
onMounted(listenData)
onUnmounted(stopListeners)
</script>
