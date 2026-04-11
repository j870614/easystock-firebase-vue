<template>
  <AppLayout title="入出庫登記" show-location-picker>
    <!-- 無道場提示 -->
    <div
      v-if="!appStore.selectedLocation"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <Building2 class="w-16 h-16 text-gray-300 mb-4" />
      <p class="text-gray-500">請先選擇道場</p>
    </div>

    <template v-else>
      <!-- 入庫 / 出庫 大型切換按鈕 -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <button
          class="btn text-xl py-6 rounded-2xl flex-col gap-1 h-auto"
          :class="txType === 'in'
            ? 'bg-stock-in text-white shadow-lg shadow-green-200'
            : 'bg-green-50 text-green-700 border-2 border-green-200'"
          @click="txType = 'in'"
        >
          <ArrowDownCircle class="w-10 h-10" />
          <span class="font-bold text-2xl">入庫</span>
        </button>
        <button
          class="btn text-xl py-6 rounded-2xl flex-col gap-1 h-auto"
          :class="txType === 'out'
            ? 'bg-stock-out text-white shadow-lg shadow-red-200'
            : 'bg-red-50 text-red-700 border-2 border-red-200'"
          @click="txType = 'out'"
        >
          <ArrowUpCircle class="w-10 h-10" />
          <span class="font-bold text-2xl">出庫</span>
        </button>
      </div>

      <!-- 表單 -->
      <div class="card space-y-4">
        <!-- 日期 -->
        <div>
          <label class="label">日期</label>
          <el-date-picker
            v-model="form.date"
            type="date"
            placeholder="選擇日期"
            format="YYYY/MM/DD"
            value-format="YYYY-MM-DD"
            class="w-full !text-lg"
            :clearable="false"
          />
        </div>

        <!-- 品項選擇 -->
        <div>
          <label class="label">品項</label>
          <div v-if="loadingProducts" class="text-gray-400 py-4 text-center">載入中…</div>
          <div v-else class="grid gap-2">
            <button
              v-for="product in products"
              :key="product.id"
              class="flex items-center justify-between px-4 py-4 rounded-xl border-2 transition-all"
              :class="form.productId === product.id
                ? (txType === 'in'
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-red-500 bg-red-50 text-red-800')
                : 'border-gray-200 bg-white text-gray-700'"
              @click="form.productId = product.id"
            >
              <span class="font-medium">
                {{ product.name }}
                <span v-if="product.spec" class="ml-2 text-gray-500">{{ product.spec }}</span>
              </span>
              <span class="text-sm text-gray-400">
                庫存：{{ getStock(product.id) }} 件
              </span>
            </button>
          </div>
        </div>

        <!-- 數量 -->
        <div>
          <label class="label">數量</label>
          <div class="flex items-center gap-3">
            <button
              class="w-14 h-14 rounded-xl bg-gray-100 text-gray-700 text-3xl font-light flex items-center justify-center active:bg-gray-200"
              @click="form.qty = Math.max(1, form.qty - 1)"
            >−</button>
            <input
              v-model.number="form.qty"
              type="number"
              min="1"
              class="input text-center text-2xl font-bold flex-1"
            />
            <button
              class="w-14 h-14 rounded-xl bg-gray-100 text-gray-700 text-3xl font-light flex items-center justify-center active:bg-gray-200"
              @click="form.qty++"
            >＋</button>
          </div>
        </div>

        <!-- 摘要 -->
        <div>
          <label class="label">摘要（選填）</label>
          <input
            v-model="form.note"
            type="text"
            class="input"
            placeholder="例如：薄圍巾 *1"
          />
        </div>

        <!-- 提交 -->
        <button
          class="w-full btn text-xl py-5 rounded-2xl"
          :class="txType === 'in' ? 'btn-in' : 'btn-out'"
          :disabled="submitting || !form.productId || form.qty < 1"
          @click="submit"
        >
          <span v-if="submitting">
            <span class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            處理中…
          </span>
          <span v-else>
            確認{{ txType === 'in' ? '入庫' : '出庫' }}
          </span>
        </button>
      </div>
    </template>

    <!-- 成功提示 -->
    <transition name="slide-up">
      <div
        v-if="successMsg"
        class="fixed bottom-24 left-4 right-4 z-50 p-4 rounded-2xl font-semibold text-center text-white"
        :class="txType === 'in' ? 'bg-stock-in' : 'bg-stock-out'"
      >
        {{ successMsg }}
      </div>
    </transition>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ArrowDownCircle, ArrowUpCircle, Building2 } from 'lucide-vue-next'
import {
  collection, query, where, getDocs, doc, runTransaction,
  serverTimestamp, addDoc, orderBy,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const appStore = useAppStore()

const txType     = ref('in')
const products   = ref([])
const stockMap   = ref({})
const loadingProducts = ref(false)
const submitting = ref(false)
const successMsg = ref('')

const form = ref({
  date:      new Date().toISOString().slice(0, 10),
  productId: null,
  qty:       1,
  note:      '',
})

function getStock(productId) {
  return stockMap.value[productId] ?? 0
}

async function loadProducts() {
  loadingProducts.value = true
  try {
    const q = query(
      collection(db, 'products'),
      where('isActive', '==', true),
      orderBy('order')
    )
    const snap = await getDocs(q)
    products.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // 讀取此道場庫存
    if (appStore.selectedLocationId) {
      await loadStocks()
    }
  } finally {
    loadingProducts.value = false
  }
}

async function loadStocks() {
  const q = query(
    collection(db, 'stocks'),
    where('locationId', '==', appStore.selectedLocationId)
  )
  const snap = await getDocs(q)
  stockMap.value = Object.fromEntries(
    snap.docs.map(d => [d.data().productId, d.data().currentStock])
  )
}

async function submit() {
  if (!form.value.productId || form.value.qty < 1) return
  submitting.value = true

  const locId     = appStore.selectedLocationId
  const productId = form.value.productId
  const product   = products.value.find(p => p.id === productId)
  const stockDocId = `${locId}_${productId}`
  const stockRef   = doc(db, 'stocks', stockDocId)

  try {
    await runTransaction(db, async (tx) => {
      const stockSnap = await tx.get(stockRef)
      const current   = stockSnap.exists() ? stockSnap.data().currentStock : 0
      const delta     = txType.value === 'in' ? form.value.qty : -form.value.qty
      const newStock  = current + delta

      if (newStock < 0) throw new Error('庫存不足，無法出庫')

      // 更新 stock 文件（原子操作）
      if (stockSnap.exists()) {
        tx.update(stockRef, { currentStock: newStock })
      } else {
        tx.set(stockRef, {
          locationId:   locId,
          productId,
          currentStock: newStock,
        })
      }

      // 新增交易紀錄（在 Transaction 外執行避免限制）
      // 注意：Firestore Transaction 不支援 addDoc，改用 set with auto-id
      const txDocRef = doc(collection(db, 'transactions'))
      tx.set(txDocRef, {
        locationId:      locId,
        date:            form.value.date,
        timestamp:       serverTimestamp(),
        type:            txType.value,
        productId,
        productSnapshot: {
          name:  product.name,
          spec:  product.spec ?? '',
          price: product.price ?? 0,
        },
        qty:      form.value.qty,
        note:     form.value.note,
        operator: {
          uid:  authStore.user.uid,
          name: authStore.user.displayName,
        },
      })
    })

    // 更新本地庫存快取
    const delta = txType.value === 'in' ? form.value.qty : -form.value.qty
    stockMap.value[productId] = (stockMap.value[productId] ?? 0) + delta

    // 重置表單（保留日期和類型）
    form.value.productId = null
    form.value.qty       = 1
    form.value.note      = ''

    successMsg.value = txType.value === 'in'
      ? `✓ 已入庫 ${product.name}${product.spec ? ' ' + product.spec : ''} ${form.value.qty > 1 ? form.value.qty : delta} 件`
      : `✓ 已出庫 ${product.name}${product.spec ? ' ' + product.spec : ''}`

    setTimeout(() => { successMsg.value = '' }, 2500)
  } catch (e) {
    alert(e.message || '操作失敗，請重試')
  } finally {
    submitting.value = false
  }
}

watch(() => appStore.selectedLocationId, loadProducts)
onMounted(loadProducts)
</script>
