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
            <div class="text-sm text-gray-500 mt-0.5">{{ tx.note || '—' }}</div>
            <div class="text-xs text-gray-400 mt-1 flex gap-3">
              <span>{{ tx.date }}</span>
              <span>{{ tx.operator?.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AppLayout>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { Building2, History, ArrowDownCircle, ArrowUpCircle } from 'lucide-vue-next'
import { db } from '@/firebase'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const appStore = useAppStore()
const loading = ref(false)
const transactions = ref([])
const activeFilter = ref('all')

const filters = [
  { value: 'all', label: '全部' },
  { value: 'in',  label: '入庫' },
  { value: 'out', label: '出庫' },
]

async function load() {
  if (!appStore.selectedLocationId) return
  loading.value = true
  try {
    const constraints = [
      where('locationId', '==', appStore.selectedLocationId),
      orderBy('timestamp', 'desc'),
      limit(50),
    ]
    if (activeFilter.value !== 'all') {
      constraints.unshift(where('type', '==', activeFilter.value))
    }
    const q = query(collection(db, 'transactions'), ...constraints)
    const snap = await getDocs(q)
    transactions.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } finally {
    loading.value = false
  }
}

watch(() => appStore.selectedLocationId, load)
onMounted(load)
</script>
