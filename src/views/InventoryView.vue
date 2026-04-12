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
      <div class="mb-4 flex items-center justify-between">
        <div class="text-xl font-bold flex items-center gap-2" :class="appStore.isReplenishMode ? 'text-green-600' : 'text-brand-600'">
          <span v-if="appStore.isReplenishMode">📦 入庫作業模式</span>
          <span v-else>🙏 認供結緣模式</span>
        </div>
        <div class="w-32">
          <el-date-picker
            v-model="date"
            type="date"
            placeholder="選擇日期"
            format="YYYY/MM/DD"
            value-format="YYYY-MM-DD"
            class="w-full flex-1"
            :clearable="false"
          />
        </div>
      </div>

      <!-- POS 品項網格 -->
      <div v-if="loadingProducts" class="text-gray-400 py-10 text-center">載入中…</div>
      <div v-else class="grid grid-cols-2 gap-3 pb-32" :class="{ 'pb-72': cart.length > 0 }">
        <button
          v-for="(group, name) in groupedProducts"
          :key="name"
          class="card flex flex-col items-center justify-center p-4 gap-2 transition-all active:scale-95 border-2"
          :class="appStore.isReplenishMode ? 'border-transparent hover:border-green-300' : 'border-transparent hover:border-brand-300'"
          @click="openProductSelect(name, group)"
        >
          <!-- 圓形字首 Icon -->
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-sm"
            :class="appStore.isReplenishMode ? 'bg-green-400' : 'bg-brand-500'"
          >
            {{ String(name).charAt(0) }}
          </div>
          <div class="text-center w-full">
            <div class="font-bold text-gray-800 truncate leading-snug text-lg">
              {{ name }}
            </div>
            <div v-if="group.length > 1" class="text-xs text-gray-400 mt-1">
              {{ group.length }} 種規格
            </div>
            <!-- Show total stock of all variants in this group -->
            <div v-else class="mt-1">
               <span class="text-sm text-gray-500 bg-gray-50 border px-2 py-0.5 rounded-full">
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
              <div class="font-bold text-gray-800 text-lg">{{ p.spec || '預設規格' }}</div>
              <div class="text-sm text-gray-500 mt-1">目前庫存：{{ getStock(p.id) }}</div>
            </div>
            <button class="px-5 py-2.5 rounded-xl text-white font-bold transition-all active:scale-95"
              :class="appStore.isReplenishMode ? 'bg-green-500 hover:bg-green-600' : 'bg-brand-500 hover:bg-brand-600'"
              @click="addToCart(p)">
              加入清單
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
          
          <div class="p-4 pt-2">
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

function getStock(productId) {
  return stockMap.value[productId] ?? 0
}

function openProductSelect(name, groupItems) {
  if (groupItems.length === 1) {
    // 只有單一規格，直接加入購物車
    addToCart(groupItems[0])
    return
  }
  selectedGroupName.value = name
  selectedGroupItems.value = groupItems
  selectDialog.value = true
}

function addToCart(product) {
  // 檢查購物車內是否已有該商品
  const existing = cart.value.find(item => item.product.id === product.id)
  if (existing) {
    existing.qty += 1
  } else {
    cart.value.push({
      product,
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
            price: item.product.price ?? 0,
          },
          qty: item.qty,
          operator: {
            uid: authStore.user.uid,
            name: authStore.user.displayName,
          },
        })
      }
    })

    // Local 扣除/增加庫存
    itemsToSubmit.forEach(item => {
      const delta = currentTxType === 'in' ? item.qty : -item.qty
      stockMap.value[item.product.id] = (stockMap.value[item.product.id] ?? 0) + delta
    })

    // 清空購物車
    cart.value = []

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
