<template>
  <AppLayout title="認供結緣" show-location-picker>
    <!-- 無道場提示 -->
    <div
      v-if="!appStore.selectedLocation"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <Building2 class="w-16 h-16 text-gray-300 mb-4" />
      <p class="text-gray-500">請先選擇道場</p>
    </div>

    <template v-else>
      <!-- 日期與類型提示 -->
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <div class="font-bold flex items-center gap-1.5 text-base" :class="appStore.isReplenishMode ? 'text-green-600' : 'text-brand-600'">
          <span v-if="appStore.isReplenishMode">📦 入庫模式</span>
          <span v-else>🙏 認供結緣</span>
        </div>
        <div class="flex items-center gap-1.5 ml-auto">
          <span class="text-xs font-bold transition-colors whitespace-nowrap text-gray-500">
            {{ appStore.isReplenishMode ? '切換成結緣模式' : '切換成入庫模式' }}
          </span>
          <el-switch v-model="appStore.isReplenishMode" style="--el-switch-on-color: #22c55e;" />
        </div>
        <div class="w-full sm:w-auto">
          <el-date-picker
            v-model="date"
            type="date"
            placeholder="選擇日期"
            format="YYYY/MM/DD"
            value-format="YYYY-MM-DD"
            class="w-full"
            :clearable="false"
          />
        </div>
      </div>

      <!-- 篩選列：標題與切換 -->
      <div class="mb-5 space-y-3">
        <div class="flex items-center justify-between">
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
        
        <!-- 面包屑式的篩選標籤 -->
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

      <!-- POS 品項顯示 -->
      <div v-if="loadingProducts" class="text-gray-400 py-10 text-center">載入中…</div>
      
      <!-- 清單模式 -->
      <div v-else-if="viewMode === 'list'" class="flex flex-col gap-2 pb-32" :class="{'pb-72': cart.length > 0}">
        <button
          v-for="(group, name) in groupedProducts"
          :key="name"
          class="card flex items-center p-3 gap-4 transition-all active:scale-95 border-2 text-left relative"
          :class="appStore.isReplenishMode ? 'border-transparent hover:border-green-300' : 'border-transparent hover:border-brand-300'"
          @click="openProductSelect(name, group)"
        >
          <div v-if="hasLowStock(group)" class="absolute top-1 left-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm"></div>
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-sm flex-shrink-0"
            :class="appStore.isReplenishMode ? 'bg-green-400' : 'bg-brand-500'"
          >
            {{ String(name).charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-gray-800 break-words" :style="{ fontSize: 'var(--fs-name)' }">{{ name }}</div>
            <div v-if="group.length > 1" class="text-gray-400 text-sm mt-0.5">
              {{ group.length }} 種規格
            </div>
          </div>
          <div v-if="group.length === 1" class="text-right">
             <div class="text-sm font-bold" :class="appStore.isReplenishMode ? 'text-green-600' : 'text-brand-600'">
               <span v-if="!appStore.isReplenishMode">${{ getProductPrice(group[0]) }}</span>
             </div>
             <div class="text-xs text-gray-500 mt-0.5">總庫存 {{ getStock(group[0].id) }}</div>
          </div>
          <div v-else class="text-gray-400 pl-2 border-l border-gray-100 flex items-center justify-center h-full">
            <ChevronRight class="w-5 h-5"/>
          </div>
        </button>
        <div v-if="Object.keys(groupedProducts).length === 0" class="py-10 text-center text-gray-400">目前沒有符合的品項</div>
      </div>

      <!-- 卡片模式 (原版網格) -->
      <div v-else class="grid gap-3 pb-32" :class="[appStore.fontScale === 2 ? 'grid-cols-1' : 'grid-cols-2', { 'pb-72': cart.length > 0 }]">
        <button
          v-for="(group, name) in groupedProducts"
          :key="name"
          class="card flex flex-col items-center justify-center p-4 gap-2 transition-all active:scale-95 border-2 relative min-w-0"
          :class="appStore.isReplenishMode ? 'border-transparent hover:border-green-300' : 'border-transparent hover:border-brand-300'"
          @click="openProductSelect(name, group)"
        >
          <!-- 安全庫存警示標籤 -->
          <div v-if="hasLowStock(group)" class="absolute -top-2 -right-2 bg-red-500 text-white shadow-md text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse z-10 border border-white">
            建議補貨
          </div>
          <!-- 圓形字首 Icon -->
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-sm flex-shrink-0"
            :class="appStore.isReplenishMode ? 'bg-green-400' : 'bg-brand-500'"
          >
            {{ String(name).charAt(0) }}
          </div>
          <div class="text-center w-full min-w-0">
            <div class="font-bold text-gray-800 leading-snug break-words" :style="{ fontSize: 'var(--fs-name)' }">
              {{ name }}
            </div>
            <div v-if="group.length > 1" class="text-gray-400 mt-1" :style="{ fontSize: 'var(--fs-main)' }">
              {{ group.length }} 種規格
            </div>
            <div v-else class="mt-1">
               <span class="text-gray-500 bg-gray-50 border px-2 py-0.5 rounded-full" :style="{ fontSize: 'var(--fs-main)' }">
                 總庫存 {{ getStock(group[0].id) }}
               </span>
            </div>
          </div>
        </button>
        <div v-if="Object.keys(groupedProducts).length === 0" class="col-span-2 py-10 text-center text-gray-400">目前沒有符合的品項</div>
      </div>

      <!-- 選擇規格加入清單的 Dialog -->
      <el-dialog
        v-model="selectDialog"
        :title="`選擇 ${selectedGroupName} 規格`"
        width="90%"
        align-center
        destroy-on-close
      >
        <div class="space-y-4 py-2">
          <div v-for="p in selectedGroupItems" :key="p.id" class="border-2 rounded-xl p-4 flex justify-between items-center" :class="appStore.isReplenishMode ? 'border-green-50' : 'border-brand-50'">
            <div>
              <div class="font-bold text-gray-800" :style="{ fontSize: 'var(--fs-name)' }">{{ p.spec || '預設規格' }}</div>
              <div class="font-bold text-brand-600 mt-1" v-if="!appStore.isReplenishMode" :style="{ fontSize: 'var(--fs-main)' }">單價：{{ getProductPrice(p) }}</div>
              <div class="text-gray-500 mt-1 flex items-center gap-2" :style="{ fontSize: 'var(--fs-main)' }">
                <div>目前庫存：{{ getStock(p.id) }}</div>
                <div v-if="getStock(p.id) <= (p.minStock || 0)" class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">⚠️ 建議補貨</div>
              </div>
            </div>
            <button class="px-5 py-2.5 rounded-xl text-white font-bold transition-all active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:active:scale-100"
              :class="getCartButtonClass(p)"
              :disabled="isAddToCartDisabled(p)"
              @click="addToCart(p)">
              {{ getCartButtonText(p) }}
            </button>
          </div>
        </div>
      </el-dialog>

      <!-- 購物車 Bottom Sheet -->
      <transition name="slide-up">
        <div v-if="cart.length > 0" class="fixed left-0 right-0 z-40 mx-auto max-w-[480px] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col" style="bottom: calc(64px + env(safe-area-inset-bottom));">
          <div class="p-4 rounded-t-3xl border-b flex justify-between items-center" :class="appStore.isReplenishMode ? 'bg-green-500 text-white' : 'bg-brand-500 text-white'">
            <div class="font-bold text-lg">
              待{{ appStore.isReplenishMode ? '入庫' : '結緣' }}清單
            </div>
            <button class="text-sm font-medium opacity-80 hover:opacity-100 px-2 py-1" @click="cart = []">全部清空</button>
          </div>
          
          <div class="max-h-60 overflow-y-auto p-4 space-y-3 pb-2">
            <div v-for="(item, idx) in cart" :key="idx" class="flex items-center gap-3 bg-white border p-3 rounded-xl shadow-sm">
               <div class="flex-1">
                 <div class="font-bold text-gray-800">{{ item.product.name }}</div>
                 <div v-if="item.product.spec" class="text-sm text-gray-500">{{ item.product.spec }}</div>
                 <div class="text-sm text-brand-600 font-bold mt-1" v-if="!appStore.isReplenishMode">{{ item.price }} x {{ item.qty }} = {{ item.price * item.qty }}</div>
               </div>
               
               <div class="flex items-center gap-1">
                 <button class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 active:bg-gray-200" @click="updateCartQty(idx, -1)"><Minus class="w-4 h-4"/></button>
                 <input type="number" inputmode="numeric" v-model.number="item.qty" @change="validateCartQty(idx)" class="w-12 text-center font-bold text-lg border border-gray-200 rounded-md focus:outline-none focus:border-brand-400 py-1" min="1" />
                 <button class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 active:bg-gray-200" @click="updateCartQty(idx, 1)"><Plus class="w-4 h-4"/></button>
               </div>
               
               <button class="p-2 ml-1 text-gray-400 hover:text-red-500 active:scale-90 transition-transform" @click="cart.splice(idx, 1)">
                 <Trash2 class="w-5 h-5"/>
               </button>
            </div>
          </div>

          <!-- 備註 -->
          <div class="px-4 pb-2">
            <input
              v-model="cartNote"
              type="text"
              class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="備註（例：法名：普某 請購）"
            />
          </div>
          
          <div class="p-4 pt-2">
             <div v-if="!appStore.isReplenishMode" class="mb-4 space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
               <!-- 小計 -->
               <div class="flex justify-between items-center text-gray-600">
                  <span>小計</span>
                  <span class="font-bold text-lg">${{ cartTotalPrice }}</span>
               </div>
               
               <!-- 實收金額 -->
               <div class="flex justify-between items-center">
                  <span class="font-bold text-gray-800">實收金額</span>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      inputmode="numeric"
                      v-model.number="receivedAmount"
                      class="w-32 pl-7 pr-3 py-1.5 text-right font-bold text-xl text-brand-600 border-2 border-brand-200 rounded-xl focus:outline-none focus:border-brand-500 bg-white"
                      min="0"
                    />
                  </div>
               </div>

               <!-- 支付方式 -->
               <div class="flex gap-2 pt-2 border-t border-gray-200">
                  <label class="flex-1 cursor-pointer">
                    <input type="radio" v-model="paymentMethod" value="cash" class="peer sr-only" />
                    <div class="text-center py-2 rounded-lg border-2 text-sm font-bold transition-all peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 border-gray-200 text-gray-500 bg-white">現金</div>
                  </label>
                  <label class="flex-1 cursor-pointer">
                    <input type="radio" v-model="paymentMethod" value="card" class="peer sr-only" />
                    <div class="text-center py-2 rounded-lg border-2 text-sm font-bold transition-all peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 border-gray-200 text-gray-500 bg-white">刷卡</div>
                  </label>
                  <label class="flex-1 cursor-pointer">
                    <input type="radio" v-model="paymentMethod" value="transfer" class="peer sr-only" />
                    <div class="text-center py-2 rounded-lg border-2 text-sm font-bold transition-all peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 border-gray-200 text-gray-500 bg-white">匯款</div>
                  </label>
               </div>
             </div>
             
             <button class="w-full text-xl py-4 rounded-2xl transition-transform active:scale-95 font-bold flex justify-center items-center gap-2"
              :class="appStore.isReplenishMode ? 'bg-green-500 text-white shadow-lg shadow-green-200 hover:bg-green-600' : 'bg-brand-500 text-white shadow-lg shadow-brand-200 hover:bg-brand-600'"
              :disabled="submitting"
              @click="submitCart">
               <span v-if="submitting">處理中…</span>
               <span v-else>確認{{ appStore.isReplenishMode ? '入庫' : '結緣' }} (共 {{ cartTotalQty }} 件)</span>
             </button>
          </div>
        </div>
      </transition>
    </template>

    <!-- 成功提示 -->
    <transition name="slide-up">
      <div
        v-if="successMsg"
        class="fixed top-20 left-4 right-4 z-50 p-4 rounded-2xl font-semibold text-center text-white shadow-lg"
        :class="successMsgType === 'in' ? 'bg-green-500' : 'bg-brand-500'"
      >
        {{ successMsg }}
      </div>
    </transition>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Building2, Minus, Plus, Trash2, LayoutGrid, List, ChevronRight } from 'lucide-vue-next'
import {
  collection, query, where, onSnapshot, doc, runTransaction,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const appStore = useAppStore()

const date       = ref(new Date().toISOString().slice(0, 10))
const stockMap   = ref({})
const loadingProducts = ref(false)
const submitting = ref(false)
const successMsg = ref('')
const successMsgType = ref('')

const selectDialog = ref(false)
const selectedGroupName = ref('')
const selectedGroupItems = ref([])

const viewMode = ref('card')
const selectedGroupNames = ref([])

const productGroups = computed(() => {
  const names = []
  const seen = new Set()
  appStore.activeProducts.forEach(p => {
    // 檢查是不是在目前道場停用
    const locId = appStore.selectedLocationId
    const locOverride = p.overrides?.[locId]
    if (locOverride && locOverride.isActive === false) return
    
    if (!seen.has(p.name)) {
      seen.add(p.name)
      names.push(p.name)
    }
  })
  return names
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

const cartNote = ref('')
const cart = ref([])
const paymentMethod = ref('cash')
const receivedAmount = ref(0)
let unsubscribeStocks = null


// 購物車總數計算
const cartTotalQty = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.qty, 0)
})

// 分組品項：依據名稱歸類，並過濾掉在該道場停用的品項與不符合搜尋的品項
const groupedProducts = computed(() => {
  const groups = {}
  const locId = appStore.selectedLocationId
  if (!locId) return groups

  appStore.activeProducts.forEach(p => {
    // 如果道場有獨立設定不啟用，則略過
    const locOverride = p.overrides?.[locId]
    if (locOverride && locOverride.isActive === false) {
      return
    }
    
    // 如果有使用標籤過濾，檢查品項名稱是否在過濾名單內
    if (selectedGroupNames.value.length > 0 && !selectedGroupNames.value.includes(p.name)) {
      return
    }

    if (!groups[p.name]) groups[p.name] = []
    groups[p.name].push(p)
  })
  return groups
})

const cartTotalPrice = computed(() => {
  return cart.value.reduce((sum, item) => sum + (item.price * item.qty), 0)
})

const locationCountry = computed(() => appStore.selectedLocation?.country || '台灣')

function getProductPrice(p) {
  const overrides = p.overrides || {}
  const countryOverride = overrides[locationCountry.value]
  if (countryOverride && countryOverride.price != null && countryOverride.price !== '') {
    return Number(countryOverride.price)
  }
  return Number(p.price || 0)
}

function getStock(productId) {
  return stockMap.value[productId] ?? 0
}

function hasLowStock(group) {
  return group.some(p => getStock(p.id) <= (p.minStock || 0))
}

function isAddToCartDisabled(p) {
  if (appStore.isReplenishMode) return false
  return getStock(p.id) <= 0
}

function getCartButtonText(p) {
  if (appStore.isReplenishMode) return '加入入庫清單'
  if (getStock(p.id) <= 0) return '庫存不足'
  return '加入結緣清單'
}

function getCartButtonClass(p) {
  if (appStore.isReplenishMode) return 'bg-green-500 hover:bg-green-600'
  if (getStock(p.id) <= 0) return 'bg-gray-400 cursor-not-allowed'
  return 'bg-brand-500 hover:bg-brand-600'
}

function openProductSelect(name, groupItems) {
  if (groupItems.length === 1) {
    const p = groupItems[0]
    // 只有單一規格，直接加入購物車前先檢查防呆
    if (!appStore.isReplenishMode && getStock(p.id) <= 0) {
      if (navigator.vibrate) navigator.vibrate(200)
      alert(`【${p.name}${p.spec ? '-' + p.spec : ''}】庫存不足，無法結緣`)
      return
    }
    addToCart(p)
    return
  }
  selectedGroupName.value = name
  selectedGroupItems.value = groupItems
  selectDialog.value = true
}

function addToCart(product) {
  const price = getProductPrice(product)
  // 檢查購物車內是否已有該商品
  const existing = cart.value.find(item => item.product.id === product.id)
  if (existing) {
    existing.qty += 1
  } else {
    cart.value.push({
      product,
      price,
      qty: 1
    })
  }
  selectDialog.value = false
}

function updateCartQty(index, delta) {
  const item = cart.value[index]
  const newQty = item.qty + delta
  if (newQty >= 1) {
    item.qty = newQty
  }
}

function validateCartQty(index) {
  const item = cart.value[index]
  if (typeof item.qty !== 'number' || isNaN(item.qty) || item.qty < 1) {
    item.qty = 1
  }
}

// 監聽購物車變化以更新實收金額預設值
watch(cartTotalPrice, (newTotal) => {
  receivedAmount.value = newTotal
})

// 監聽模式切換，清空購物車
watch(() => appStore.isReplenishMode, () => {
  cart.value = []
})

function listenStocks() {
  if (unsubscribeStocks) {
    unsubscribeStocks()
    unsubscribeStocks = null
  }
  
  if (!appStore.selectedLocationId) return
  
  loadingProducts.value = true
  const q = query(
    collection(db, 'stocks'),
    where('locationId', '==', appStore.selectedLocationId)
  )
  
  unsubscribeStocks = onSnapshot(q, (snap) => {
    stockMap.value = Object.fromEntries(
      snap.docs.map(d => [d.data().productId, d.data().currentStock])
    )
    loadingProducts.value = false
  }, (err) => {
    console.error('Stocks listener error:', err)
    loadingProducts.value = false
  })
}

async function submitCart() {
  if (cart.value.length === 0) return
  submitting.value = true

  const locId = appStore.selectedLocationId
  const itemsToSubmit = [...cart.value]
  const currentTxType = appStore.isReplenishMode ? 'in' : 'out'
  const currentDate = date.value

  try {
    await runTransaction(db, async (tx) => {
      // 1. 先讀取所有的庫存文件
      const stockSnaps = {}
      for (const item of itemsToSubmit) {
        const stockDocId = `${locId}_${item.product.id}`
        const stockRef = doc(db, 'stocks', stockDocId)
        stockSnaps[item.product.id] = await tx.get(stockRef)
      }

      // 2. 寫入所有的變更與產生交易紀錄
      for (const item of itemsToSubmit) {
        const productId = item.product.id
        const stockDocId = `${locId}_${productId}`
        const stockRef = doc(db, 'stocks', stockDocId)
        const snap = stockSnaps[productId]

        const currentStock = snap.exists() ? snap.data().currentStock : 0
        const delta = currentTxType === 'in' ? item.qty : -item.qty
        const newStock = currentStock + delta

        if (newStock < 0) {
          throw new Error(`【${item.product.name}${item.product.spec ? '-' + item.product.spec : ''}】庫存不足，無法結緣`)
        }

        // 更新或新增 Stock
        if (snap.exists()) {
          tx.update(stockRef, { currentStock: newStock })
        } else {
          tx.set(stockRef, {
            locationId: locId,
            productId,
            currentStock: newStock,
          })
        }

        // 產生交易紀錄
        const txPayload = {
          locationId: locId,
          date: currentDate,
          timestamp: serverTimestamp(),
          type: currentTxType,
          productId,
          productSnapshot: {
            name: item.product.name,
            spec: item.product.spec ?? '',
            price: item.price ?? 0,
          },
          qty: item.qty,
          note: cartNote.value.trim(),
          operator: {
            uid: authStore.user.uid,
            name: authStore.user.displayName,
            dharmaName: authStore.profile?.dharmaName || '',
          },
        }

        if (currentTxType === 'out') {
          txPayload.orderSubtotal = cartTotalPrice.value
          txPayload.orderReceivedAmount = receivedAmount.value
          txPayload.paymentMethod = paymentMethod.value
        }

        const txDocRef = doc(collection(db, 'transactions'))
        tx.set(txDocRef, txPayload)
      }
    })

    // Local 扣除/增加庫存
    itemsToSubmit.forEach(item => {
      const delta = currentTxType === 'in' ? item.qty : -item.qty
      stockMap.value[item.product.id] = (stockMap.value[item.product.id] ?? 0) + delta
    })

    // 清空購物車與備註
    cart.value = []
    cartNote.value = ''

    successMsgType.value = currentTxType
    successMsg.value = currentTxType === 'in'
      ? `✓ 已成功入庫 ${itemsToSubmit.length} 項物資`
      : `✓ 已成功結緣 ${itemsToSubmit.length} 項物資`

    setTimeout(() => { successMsg.value = '' }, 3000)
  } catch (e) {
    alert(e.message || '操作失敗，請重試')
  } finally {
    submitting.value = false
  }
}

watch(() => appStore.selectedLocationId, listenStocks)
onMounted(listenStocks)
onUnmounted(() => {
  if (unsubscribeStocks) unsubscribeStocks()
})
</script>
