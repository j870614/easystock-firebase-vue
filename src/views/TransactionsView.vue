<template>
  <AppLayout title="出入庫紀錄" show-location-picker>
    <div v-if="!appStore.selectedLocationId" class="flex flex-col items-center justify-center py-20 text-center">
      <Building2 class="w-16 h-16 text-gray-300 mb-4" />
      <p class="text-gray-500">請先選擇道場</p>
    </div>
    <template v-else>
      <!-- 篩選列：類型與日期 -->
      <div class="flex flex-col gap-3 mb-4">
        <!-- 交易類型 -->
        <div class="flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="f in filters"
            :key="f.value"
            class="flex-shrink-0 px-4 py-2 rounded-xl border-2 font-medium transition-all"
            :style="{ fontSize: 'var(--fs-main)' }"
            :class="activeFilter === f.value
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-gray-200 bg-white text-gray-600'"
            @click="activeFilter = f.value; resetPageAndListen()"
          >{{ f.label }}</button>
        </div>
        
        <!-- 時段篩選 (與報表類似) -->
        <div class="flex flex-wrap items-center gap-2">
           <div class="flex gap-1 overflow-x-auto">
             <button class="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border font-medium transition-all" :class="dateFilterType === 'all' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'" @click="dateFilterType = 'all'; resetPageAndListen()">全部時間</button>
             <button class="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border font-medium transition-all" :class="dateFilterType === 'month' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'" @click="dateFilterType = 'month'; resetPageAndListen()">按月份</button>
             <button class="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border font-medium transition-all" :class="dateFilterType === 'custom' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'" @click="dateFilterType = 'custom'; resetPageAndListen()">自訂區間</button>
           </div>
           
           <div class="w-full sm:w-auto flex-1 min-w-[200px]">
              <el-date-picker
                v-if="dateFilterType === 'month'"
                v-model="selectedMonth"
                type="month"
                placeholder="選擇月份"
                value-format="YYYY-MM"
                class="w-full h-10"
                :clearable="false"
                @change="resetPageAndListen"
              />
              <el-config-provider v-else-if="dateFilterType === 'custom'" :locale="zhTwLocale">
                <el-date-picker
                  v-model="selectedRange"
                  type="daterange"
                  range-separator="-"
                  start-placeholder="開始"
                  end-placeholder="結束"
                  value-format="YYYY-MM-DD"
                  class="w-full h-10"
                  :clearable="false"
                  @change="resetPageAndListen"
                />
              </el-config-provider>
           </div>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <div v-else-if="transactions.length === 0" class="text-center py-16 text-gray-400">
        <History class="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>尚無交易紀錄</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="tx in transactions"
          :key="tx.id"
          class="card flex items-start gap-3"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            :class="tx.type === 'in' ? 'bg-green-100' : 'bg-red-100'"
          >
            <ArrowDownCircle v-if="tx.type === 'in'" class="w-5 h-5 text-green-600" />
            <ArrowUpCircle v-else class="w-5 h-5 text-red-600" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-800 break-all" :style="{ fontSize: 'var(--fs-main)' }">
                {{ tx.productSnapshot?.name }}
                <span v-if="tx.productSnapshot?.spec" class="text-gray-500 font-normal">
                  {{ tx.productSnapshot.spec }}
                </span>
              </span>
              <span
                class="ml-auto flex-shrink-0 font-bold"
                :style="{ fontSize: 'calc(var(--fs-name) * 1.1)' }"
                :class="tx.type === 'in' ? 'text-green-600' : 'text-red-600'"
              >
                {{ tx.type === 'in' ? '+' : '−' }}{{ tx.qty }}
              </span>
            </div>
            <div class="text-gray-500 mt-1 leading-relaxed" :style="{ fontSize: 'var(--fs-main)' }">
              {{ tx.note || '—' }}
              <span v-if="tx.editReason" class="text-xs text-amber-600 ml-2" :title="'修改原因: ' + tx.editReason">(曾修改)</span>
            </div>
            <div class="text-xs text-gray-400 mt-1 flex gap-3">
              <span>{{ tx.date }}</span>
              <span>{{ tx.operator?.dharmaName || tx.operator?.name }}</span>
            </div>

            <!-- 會計快捷資訊顯示 -->
            <div v-if="tx.type === 'out'" class="mt-1.5 flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-full font-bold" :style="{ fontSize: 'var(--fs-main)' }">
                實付：${{ getDisplayAmount(tx) }}
              </span>
              <span v-if="tx.paymentMethod" class="inline-flex items-center gap-1 bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full font-medium" :style="{ fontSize: 'var(--fs-main)' }">
                💳 {{ paymentLabel(tx.paymentMethod) }}
              </span>
              <span v-if="tx.accountantReceivedDate" class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium" :style="{ fontSize: 'var(--fs-main)' }">
                <CheckCircle2 class="w-3.5 h-3.5" /> 已收款：{{ tx.accountantReceivedDate }}
              </span>
            </div>
            
            <div class="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-4">
              <!-- 會計快捷標記收款日期 -->
              <button
                v-if="authStore.isAccountant && tx.type === 'out'"
                class="flex items-center gap-1.5 text-sm font-medium transition-all active:scale-95"
                :class="tx.accountantReceivedDate ? 'text-emerald-600 hover:text-emerald-700' : 'text-amber-500 hover:text-amber-600'"
                @click="openAccountantDatePicker(tx)"
              >
                <CalendarCheck class="w-4 h-4" />
                {{ tx.accountantReceivedDate ? '修改收款日期' : '標記收款日期' }}
              </button>
              <template v-if="authStore.isAdmin">
                <button class="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-600 active:scale-95 transition-all" @click="openEdit(tx)">
                  <Edit2 class="w-4 h-4"/> 編輯
                </button>
                <button class="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-600 active:scale-95 transition-all" @click="deleteTx(tx)">
                  <Trash2 class="w-4 h-4"/> 刪除
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 分頁操作區 -->
      <div v-if="transactions.length > 0 || currentPage > 0" class="flex justify-between items-center mt-6 pt-4 pb-32 border-t border-gray-100">
        <button
          class="px-4 py-2 flex items-center justify-center rounded-xl bg-white border border-gray-200 font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:bg-gray-100"
          :disabled="currentPage === 0 || loading"
          @click="changePage(-1)"
        >
          上一頁
        </button>
        <div class="flex items-center gap-2">
          <select v-model="pageSize" @change="resetPageAndListen" class="border flex-shrink-0 border-gray-200 rounded-lg text-sm bg-white py-1.5 pl-2 pr-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500">
            <option :value="10">10 筆/頁</option>
            <option :value="20">20 筆/頁</option>
            <option :value="50">50 筆/頁</option>
          </select>
          <div class="text-sm text-gray-500 whitespace-nowrap">
            第 {{ currentPage + 1 }} 頁
          </div>
        </div>
        <button
          class="px-4 py-2 flex items-center justify-center rounded-xl bg-white border border-gray-200 font-medium text-brand-600 transition-all hover:bg-brand-50 hover:border-brand-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:bg-gray-100 disabled:text-gray-400"
          :disabled="!hasMore || loading"
          @click="changePage(1)"
        >
          下一頁
        </button>
      </div>
      
      <!-- 編輯 Dialog -->
      <el-dialog
        v-model="editDialog"
        title="編輯交易紀錄"
        width="90%"
        align-center
        destroy-on-close
      >
        <div class="space-y-4 pt-2">
          <div class="border p-3 rounded-xl bg-gray-50">
            <div class="text-sm text-gray-500">變更品項</div>
            <div class="font-bold text-gray-800 text-lg">{{ selectedTxName }}</div>
          </div>
          <div>
            <label class="label">日期</label>
            <el-date-picker
              v-model="editForm.date"
              type="date"
              value-format="YYYY-MM-DD"
              class="w-full h-12"
            />
          </div>
          <div>
            <label class="label">數量 <span class="text-red-500">*</span></label>
            <input v-model.number="editForm.qty" type="number" class="input text-lg" :class="{'ring-2 ring-red-300 border-red-500 bg-red-50': showErrors && editForm.qty <= 0}" min="1" />
            <div v-if="showErrors && editForm.qty <= 0" class="text-red-500 text-sm mt-1 font-medium">數量必須大於 0</div>
          </div>
          <div>
            <label class="label">備註事項</label>
            <input v-model="editForm.note" type="text" class="input" placeholder="選填" />
          </div>
          <template v-if="editForm.type === 'out'">
            <div>
              <label class="label">付款方式</label>
              <el-select v-model="editForm.paymentMethod" class="w-full h-12">
                <el-option label="現金" value="cash" />
                <el-option label="刷卡" value="card" />
                <el-option label="匯款" value="transfer" />
              </el-select>
            </div>
            <div>
              <label class="label">實付金額</label>
              <div class="relative">
                <span class="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                <input v-model.number="editForm.itemReceivedAmount" type="number" class="input pl-8 text-lg font-bold text-brand-600" placeholder="0" />
              </div>
            </div>
          </template>
          <div>
            <label class="label">修改原因 <span class="text-red-500">*</span></label>
            <textarea v-model="editForm.reason" class="input h-20 py-2 resize-none" :class="{'ring-2 ring-red-300 border-red-500 bg-red-50': showErrors && !editForm.reason.trim()}" placeholder="請詳細說明修改原因（例如：記錯數量、日期填錯等），此原因將會被系統記錄。"></textarea>
            <div v-if="showErrors && !editForm.reason.trim()" class="text-red-500 text-sm mt-1 font-medium">請填寫修改原因</div>
          </div>
          <button class="btn-primary w-full py-4 text-lg mt-4" :disabled="submitting" @click="submitEdit">
            {{ submitting ? '儲存中...' : '確認修改' }}
          </button>
        </div>
      </el-dialog>

      <!-- 會計收款日期 Dialog -->
      <el-dialog
        v-model="accountantDateDialog"
        title="標記收款日期"
        width="90%"
        align-center
        destroy-on-close
      >
        <div class="space-y-4 pt-2">
          <div class="border p-3 rounded-xl bg-emerald-50 border-emerald-100">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-sm text-emerald-800 font-bold">{{ selectedTxForDate?.productSnapshot?.name }}<span v-if="selectedTxForDate?.productSnapshot?.spec" class="font-normal opacity-70"> ({{ selectedTxForDate?.productSnapshot?.spec }})</span></div>
                <div class="text-xs text-emerald-600 mt-0.5">出庫日期：{{ selectedTxForDate?.date }}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-emerald-600">實付金額</div>
                <div class="text-lg font-black text-emerald-700">${{ getDisplayAmount(selectedTxForDate) }}</div>
              </div>
            </div>
          </div>
          <div>
            <label class="label">會計收款日期</label>
            <el-date-picker
              v-model="accountantReceivedDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="選擇收款日期"
              class="w-full h-12"
            />
          </div>
          <button class="btn-primary w-full py-4 text-lg" :disabled="!accountantReceivedDate || submitting" @click="submitAccountantDate">
            {{ submitting ? '儲存中...' : '確認標記' }}
          </button>
        </div>
      </el-dialog>

      <!-- 刪除確認 Dialog -->
      <el-dialog
        v-model="deleteDialog"
        title="確認刪除"
        width="400px"
        align-center
        destroy-on-close
      >
        <div class="space-y-4 pt-2">
          <p class="text-gray-600">確定要刪除這筆【{{ txToDelete?.type === 'in' ? '入庫' : '出庫' }}】紀錄嗎？資料將會回推庫存。</p>
          <div class="border p-3 rounded-xl bg-gray-50 flex justify-between items-center">
            <div>
               <div class="font-bold text-gray-800">{{ txToDelete?.productSnapshot?.name }}<span v-if="txToDelete?.productSnapshot?.spec"> ({{txToDelete?.productSnapshot?.spec}})</span></div>
               <div class="text-sm text-gray-500">{{ txToDelete?.date }}</div>
            </div>
            <div class="font-bold text-lg" :class="txToDelete?.type === 'in' ? 'text-green-600' : 'text-red-600'">
                {{ txToDelete?.type === 'in' ? '+' : '−' }}{{ txToDelete?.qty }}
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <button class="btn-ghost flex-1 py-3 border-gray-200" @click="deleteDialog = false">取消</button>
            <button class="btn-primary flex-1 py-3 bg-red-500 hover:bg-red-600 shadow-red-200 border-red-500" :disabled="submitting" @click="confirmDelete">
              {{ submitting ? '刪除中...' : '確認刪除' }}
            </button>
          </div>
        </div>
      </el-dialog>
    </template>
  </AppLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot, orderBy, limit, doc, runTransaction, updateDoc, serverTimestamp, startAfter } from 'firebase/firestore'
import { Building2, History, ArrowDownCircle, ArrowUpCircle, MoreVertical, Edit2, Trash2, CalendarCheck, CheckCircle2 } from 'lucide-vue-next'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import { db } from '@/firebase'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const zhTwLocale = zhTw

const appStore = useAppStore()
const authStore = useAuthStore()
const loading = ref(false)
const transactions = ref([])
const activeFilter = ref('all')
const submitting = ref(false)

function paymentLabel(method) {
  return { cash: '現金', card: '刷卡', transfer: '匯款' }[method] || method
}

let unsubscribe = null
let fallbackTimer = null

const filters = [
  { value: 'all', label: '全部' },
  { value: 'in',  label: '入庫' },
  { value: 'out', label: '出庫' },
]

// Date Filters
const dateFilterType = ref('all')
const selectedMonth = ref(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2, '0')}`)
const selectedRange = ref([
  `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2, '0')}-01`,
  `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2, '0')}-28`
])

// Pagination
const pageSize = ref(10)
const currentPage = ref(0)
const hasMore = ref(false)
let pageCursors = [null] // Use a plain array (not ref!) to prevent Vue from proxying Firebase DocumentSnapshot

// Edit States
const editDialog = ref(false)
const showErrors = ref(false)
const editForm = ref({ id: null, qty: 0, date: '', note: '', reason: '', oldQty: 0, type: '', productId: '', buyerName: '', orderReceivedAmount: 0, itemReceivedAmount: 0, paymentMethod: '' })
const selectedTxName = ref('')

// Delete States
const deleteDialog = ref(false)
const txToDelete = ref(null)

// Accountant States
const accountantDateDialog = ref(false)
const selectedTxForDate = ref(null)
const accountantReceivedDate = ref('')
const isAccountant = computed(() => authStore.isAccountant)

function getDisplayAmount(tx) {
  if (!tx) return 0
  // 1. 優先使用品項層級實收/小計 (新版數據)
  let amount = tx.itemReceivedAmount ?? tx.itemSubtotal;
  if (amount != null) return amount;

  // 2. 舊資料處理：使用快照單價計算，以避免誤用整筆訂單總額
  if (tx.productSnapshot?.price != null) {
    return tx.productSnapshot.price * (tx.qty || 0);
  }

  // 3. 最後備援
  return tx.orderReceivedAmount ?? tx.orderSubtotal ?? 0;
}

function stopListener() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (fallbackTimer) {
    clearTimeout(fallbackTimer)
    fallbackTimer = null
  }
}

function resetPageAndListen() {
  currentPage.value = 0
  pageCursors = [null]
  hasMore.value = false
  listen()
}

function changePage(delta) {
  const newPage = currentPage.value + delta
  if (newPage < 0) return
  if (delta === 1 && !hasMore.value) return
  
  currentPage.value = newPage
  listen()
}

function listen() {
  stopListener()
  transactions.value = [] // 切換條件時先清空資料
  if (!appStore.selectedLocationId) return
  
  loading.value = true
  const constraints = [
    where('locationId', '==', appStore.selectedLocationId),
  ]
  
  if (activeFilter.value !== 'all') {
    constraints.push(where('type', '==', activeFilter.value))
  }
  
  if (dateFilterType.value === 'month') {
    const monthStart = selectedMonth.value + '-01'
    const monthEnd = selectedMonth.value + '-31' // 字串比對，31可以涵蓋所有月份結束
    constraints.push(where('date', '>=', monthStart), where('date', '<=', monthEnd))
  } else if (dateFilterType.value === 'custom') {
    constraints.push(where('date', '>=', selectedRange.value[0]), where('date', '<=', selectedRange.value[1]))
  }

  // 若有 date 區間篩選，Firestore 會要求 orderBy 必須先排 date。為了簡單相容，我們不加 date 排序，而是使用 timestamp 來代替 date 來查詢，或是請使用者補齊 index。
  // 注意：若沒有額外 index，加入 date range 的 query 若沒有 orderBy date 且與 orderBy timestamp 衝突，會報錯。
  // 在此我們保留原本的 orderBy('timestamp', 'desc') 但配合上述會報錯，所以改寫邏輯：
  // "如果有日期篩選，Firestore 強制必須 orderBy('date')"
  // 因此動態加入 orderBy
  if (dateFilterType.value !== 'all') {
    constraints.push(orderBy('date', 'desc'))
  }
  constraints.push(orderBy('timestamp', 'desc'))
  constraints.push(limit(pageSize.value + 1)) // Fetch +1 to check if there is a next page

  // Pagination Cursor
  const cursor = pageCursors[currentPage.value]
  if (cursor) {
    constraints.push(startAfter(cursor))
  }
  
  fallbackTimer = setTimeout(() => {
    loading.value = false
  }, 3000)
  
  const q = query(collection(db, 'transactions'), ...constraints)
  
  unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    // Pagination logic: check if we got the extra doc
    hasMore.value = snap.docs.length > pageSize.value
    
    // Slice off the extra doc for display
    const visibleDocs = snap.docs.slice(0, pageSize.value)
    transactions.value = visibleDocs.map(d => ({ id: d.id, ...d.data() }))
    
    // Store cursor for the next page
    if (hasMore.value) {
      pageCursors[currentPage.value + 1] = visibleDocs[visibleDocs.length - 1]
    }
    
    if (!snap.metadata.fromCache || snap.metadata.hasPendingWrites) {
      loading.value = false
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
  }, (err) => {
    console.error('Transactions listener error:', err)
    // Here we can alert the admin to create the missing index if needed
    if (err.message.includes('index')) {
      console.warn("Missing index for query. Please check Firebase Console.")
    }
    loading.value = false
    if (fallbackTimer) clearTimeout(fallbackTimer)
  })
}

function openEdit(tx) {
  showErrors.value = false
  selectedTxName.value = tx.productSnapshot?.name + (tx.productSnapshot?.spec ? ` (${tx.productSnapshot?.spec})` : '')
  editForm.value = {
    id: tx.id,
    qty: tx.qty,
    date: tx.date,
    note: tx.note || '',
    reason: '',
    oldQty: tx.qty,
    type: tx.type,
    productId: tx.productId,
    buyerName: tx.buyerName || '',
    orderReceivedAmount: tx.orderReceivedAmount ?? 0,
    itemReceivedAmount: tx.itemReceivedAmount ?? getDisplayAmount(tx),
    paymentMethod: tx.paymentMethod || 'cash'
  }
  editDialog.value = true
}

async function submitEdit() {
  if (!editForm.value.reason.trim() || editForm.value.qty <= 0) {
    showErrors.value = true
    return
  }

  submitting.value = true
  loading.value = true
  try {
    await runTransaction(db, async (t) => {
      const locId = appStore.selectedLocationId
      const stockDocId = `${locId}_${editForm.value.productId}`
      const stockRef = doc(db, 'stocks', stockDocId)
      const txRef = doc(db, 'transactions', editForm.value.id)

      const [stockSnap, txSnap] = await Promise.all([t.get(stockRef), t.get(txRef)])
      const currentStock = stockSnap.exists() ? stockSnap.data().currentStock : 0

      const delta = editForm.value.qty - editForm.value.oldQty
      const stockChange = editForm.value.type === 'in' ? delta : -delta
      const newStock = currentStock + stockChange

      if (newStock < 0) {
        throw new Error('修改後會導致庫存變為負數，無法修改。')
      }

      if (stockSnap.exists()) {
        t.update(stockRef, { currentStock: newStock })
      } else {
        t.set(stockRef, { locationId: locId, productId: editForm.value.productId, currentStock: newStock })
      }
      
      const updateData = {
        qty: editForm.value.qty,
        date: editForm.value.date,
        note: editForm.value.note,
        editReason: editForm.value.reason,
        editTimestamp: serverTimestamp(),
        editBy: { 
          uid: authStore.user.uid, 
          name: authStore.user.displayName,
          dharmaName: authStore.profile?.dharmaName || '',
        }
      }
      
      if (editForm.value.type === 'out') {
        const snapshot = txSnap.data()
        const price = snapshot?.productSnapshot?.price || 0
        updateData.itemSubtotal = price * editForm.value.qty
        updateData.itemReceivedAmount = Number(editForm.value.itemReceivedAmount ?? 0)
        updateData.orderReceivedAmount = updateData.itemReceivedAmount // 回填以維持兼容
        updateData.paymentMethod = editForm.value.paymentMethod
      }
      
      t.update(txRef, updateData)
    })

    editDialog.value = false
    alert('修改成功')
  } catch(e) {
    alert(e.message || '修改失敗')
  } finally {
    submitting.value = false
    loading.value = false
  }
}

function deleteTx(tx) {
  txToDelete.value = tx
  deleteDialog.value = true
}

async function confirmDelete() {
  const tx = txToDelete.value;
  submitting.value = true
  loading.value = true
  try {
    await runTransaction(db, async (t) => {
      const locId = appStore.selectedLocationId
      const stockDocId = `${locId}_${tx.productId}`
      const stockRef = doc(db, 'stocks', stockDocId)
      const txRef = doc(db, 'transactions', tx.id)

      const stockSnap = await t.get(stockRef)
      const currentStock = stockSnap.exists() ? stockSnap.data().currentStock : 0

      // 刪除入庫會減少庫存，刪除出庫會增加庫存
      const stockChange = tx.type === 'in' ? -tx.qty : tx.qty
      const newStock = currentStock + stockChange

      if (newStock < 0) {
        throw new Error('刪除後會導致庫存變為負數，無法刪除。')
      }

      if (stockSnap.exists()) {
        t.update(stockRef, { currentStock: newStock })
      } else {
        t.set(stockRef, { locationId: locId, productId: tx.productId, currentStock: newStock })
      }

      t.delete(txRef)
    })
    deleteDialog.value = false
    alert('已成功刪除')
  } catch(e) {
    alert(e.message || '刪除失敗')
  } finally {
    submitting.value = false
    loading.value = false
  }
}

function openAccountantDatePicker(tx) {
  selectedTxForDate.value = tx
  accountantReceivedDate.value = tx.accountantReceivedDate || ''
  accountantDateDialog.value = true
}

async function submitAccountantDate() {
  if (!accountantReceivedDate.value) return
  submitting.value = true
  try {
    await updateDoc(doc(db, 'transactions', selectedTxForDate.value.id), {
      accountantReceivedDate: accountantReceivedDate.value,
      accountantMarkedBy: {
        uid: authStore.user.uid,
        name: authStore.user.displayName,
        dharmaName: authStore.profile?.dharmaName || '',
      },
      accountantMarkedAt: serverTimestamp(),
    })
    accountantDateDialog.value = false
  } catch (e) {
    alert(e.message || '標記失敗，請重試')
  } finally {
    submitting.value = false
  }
}

watch(() => appStore.selectedLocationId, resetPageAndListen)
onMounted(resetPageAndListen)
onUnmounted(stopListener)
</script>
