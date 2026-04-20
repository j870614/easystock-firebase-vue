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
          <span class="text-xs font-bold transition-colors whitespace-nowrap" :class="appStore.isReplenishMode ? 'text-green-600' : 'text-gray-400'">補貨</span>
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

      <!-- POS 品項網格 -->
      <div v-if="loadingProducts" class="text-gray-400 py-10 text-center">載入中…</div>
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
                 <span class="w-10 text-center font-bold text-lg">{{ item.qty }}</span>
                 <button class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 active:bg-gray-200" @click="updateCartQty(idx, 1)"><Plus class="w-4 h-4"/></button>
               </div>
               
               <button class="p-2 ml-1 text-gray-400 hover:text-red-500 active:scale-90 transition-transform" @click="cart.splice(idx, 1)">
                 <Trash2 class="w-5 h-5"/>
               </button>
            </div>
          </div>

          <!-- 備註（僅結緣模式顯示） -->
          <div v-if="!appStore.isReplenishMode" class="px-4 pb-2">
            <input
              v-model="cartNote"
              type="text"
              class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="備註（例：法名：普某 請購）"
            />
          </div>
          
          <div class="p-4 pt-2">
             <div class="flex justify-between items-center px-2 mb-3 text-lg font-bold text-gray-800" v-if="!appStore.isReplenishMode">
                <span>總計金額</span>
                <span class="text-brand-600">${{ cartTotalPrice }}</span>
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
import { Building2, Minus, Plus, Trash2 } from 'lucide-vue-next'
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

const cartNote = ref('')
const cart = ref([])
let unsubscribeStocks = null


// 購物車總數計算
const cartTotalQty = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.qty, 0)
})

// 分組品項：依據名稱歸類
const groupedProducts = computed(() => {
  const groups = {}
  appStore.activeProducts.forEach(p => {
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
        const txDocRef = doc(collection(db, 'transactions'))
        tx.set(txDocRef, {
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
          note: currentTxType === 'out' ? cartNote.value.trim() : '',
          operator: {
            uid: authStore.user.uid,
            name: authStore.user.displayName,
            dharmaName: authStore.profile?.dharmaName || '',
          },
        })
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
