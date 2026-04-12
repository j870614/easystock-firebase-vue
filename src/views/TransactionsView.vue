<template>
  <AppLayout title="交易紀錄" show-location-picker>
    <div v-if="!appStore.selectedLocation" class="flex flex-col items-center justify-center py-20 text-center">
      <Building2 class="w-16 h-16 text-gray-300 mb-4" />
      <p class="text-gray-500">請先選擇道場</p>
    </div>
    <template v-else>
      <!-- 篩選列 -->
      <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          v-for="f in filters"
          :key="f.value"
          class="flex-shrink-0 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all"
          :class="activeFilter === f.value
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-gray-200 bg-white text-gray-600'"
          @click="activeFilter = f.value; load()"
        >{{ f.label }}</button>
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
              <span class="font-semibold text-gray-800 truncate">
                {{ tx.productSnapshot?.name }}
                <span v-if="tx.productSnapshot?.spec" class="text-gray-500 font-normal">
                  {{ tx.productSnapshot.spec }}
                </span>
              </span>
              <span
                class="ml-auto flex-shrink-0 font-bold text-lg"
                :class="tx.type === 'in' ? 'text-green-600' : 'text-red-600'"
              >
                {{ tx.type === 'in' ? '+' : '−' }}{{ tx.qty }}
              </span>
            </div>
            <div class="text-sm text-gray-500 mt-0.5">
              {{ tx.note || '—' }}
              <span v-if="tx.editReason" class="text-xs text-amber-600 ml-2" :title="'修改原因: ' + tx.editReason">(曾修改)</span>
            </div>
            <div class="text-xs text-gray-400 mt-1 flex gap-3">
              <span>{{ tx.date }}</span>
              <span>{{ tx.operator?.name }}</span>
            </div>
            
            <div v-if="authStore.isAdmin" class="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-4">
               <button class="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-600 active:scale-95 transition-all" @click="openEdit(tx)">
                 <Edit2 class="w-4 h-4"/> 編輯
               </button>
               <button class="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-600 active:scale-95 transition-all" @click="deleteTx(tx)">
                 <Trash2 class="w-4 h-4"/> 刪除
               </button>
            </div>
          </div>
        </div>
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
            <input v-model.number="editForm.qty" type="number" class="input text-lg" min="1" />
          </div>
          <div>
            <label class="label">備註事項</label>
            <input v-model="editForm.note" type="text" class="input" placeholder="選填" />
          </div>
          <div>
            <label class="label">修改原因 <span class="text-red-500">*</span></label>
            <textarea v-model="editForm.reason" class="input h-20 py-2 resize-none" placeholder="請詳細說明修改原因（例如：記錯數量、日期填錯等），此原因將會被系統記錄。"></textarea>
          </div>
          <button class="btn-primary w-full py-4 text-lg mt-4" :disabled="submitting || !editForm.reason.trim()" @click="submitEdit">
            {{ submitting ? '儲存中...' : '確認修改' }}
          </button>
        </div>
      </el-dialog>
    </template>
  </AppLayout>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot, orderBy, limit, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { Building2, History, ArrowDownCircle, ArrowUpCircle, MoreVertical, Edit2, Trash2 } from 'lucide-vue-next'
import { db } from '@/firebase'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const loading = ref(false)
const transactions = ref([])
const activeFilter = ref('all')
const submitting = ref(false)
let unsubscribe = null

const filters = [
  { value: 'all', label: '全部' },
  { value: 'in',  label: '入庫' },
  { value: 'out', label: '出庫' },
]

// Edit States
const editDialog = ref(false)
const editForm = ref({ id: null, qty: 0, date: '', note: '', reason: '', oldQty: 0, type: '', productId: '' })
const selectedTxName = ref('')

function stopListener() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}

function listen() {
  stopListener()
  if (!appStore.selectedLocationId) return
  
  loading.value = true
  const constraints = [
    where('locationId', '==', appStore.selectedLocationId),
    orderBy('timestamp', 'desc'),
    limit(20), // 增加至20筆
  ]
  
  if (activeFilter.value !== 'all') {
    constraints.unshift(where('type', '==', activeFilter.value))
  }
  
  const q = query(collection(db, 'transactions'), ...constraints)
  
  unsubscribe = onSnapshot(q, (snap) => {
    transactions.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loading.value = false
  }, (err) => {
    console.error('Transactions listener error:', err)
    loading.value = false
  })
}

function openEdit(tx) {
  selectedTxName.value = tx.productSnapshot?.name + (tx.productSnapshot?.spec ? ` (${tx.productSnapshot?.spec})` : '')
  editForm.value = {
    id: tx.id,
    qty: tx.qty,
    date: tx.date,
    note: tx.note || '',
    reason: '',
    oldQty: tx.qty,
    type: tx.type,
    productId: tx.productId
  }
  editDialog.value = true
}

async function submitEdit() {
  if (!editForm.value.reason.trim()) {
    alert('請填寫修改原因')
    return
  }
  if (editForm.value.qty <= 0) {
    alert('數量必須大於 0')
    return
  }

  submitting.value = true
  try {
    await runTransaction(db, async (t) => {
      const locId = appStore.selectedLocationId
      const stockDocId = `${locId}_${editForm.value.productId}`
      const stockRef = doc(db, 'stocks', stockDocId)
      const txRef = doc(db, 'transactions', editForm.value.id)

      const stockSnap = await t.get(stockRef)
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

      t.update(txRef, {
        qty: editForm.value.qty,
        date: editForm.value.date,
        note: editForm.value.note,
        editReason: editForm.value.reason,
        editTimestamp: serverTimestamp(),
        editBy: { uid: authStore.user.uid, name: authStore.user.displayName }
      })
    })

    editDialog.value = false
    alert('修改成功')
  } catch(e) {
    alert(e.message || '修改失敗')
  } finally {
    submitting.value = false
  }
}

async function deleteTx(tx) {
  const confirmObj = prompt(`確定要刪除這筆【${tx.type==='in'?'入庫':'出庫'}】紀錄嗎？\n資料將會回推庫存。\n\n請輸入 "delete" 確認刪除：`)
  if (confirmObj !== 'delete') return

  submitting.value = true
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
    alert('已成功刪除')
  } catch(e) {
    alert(e.message || '刪除失敗')
  } finally {
    submitting.value = false
  }
}

watch(() => [appStore.selectedLocationId, activeFilter.value], listen)
onMounted(listen)
onUnmounted(stopListener)
</script>
