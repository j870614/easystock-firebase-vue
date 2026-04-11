<template>
  <AppLayout title="品項管理" :show-location-picker="false">
    <div class="flex justify-end mb-4">
      <button class="btn-primary gap-2 text-base" @click="openForm()">
        <Plus class="w-5 h-5" /> 新增品項
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="p in products"
        :key="p.id"
        class="card flex items-center gap-3"
        :class="!p.isActive ? 'opacity-50' : ''"
      >
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-800">
            {{ p.name }}
            <span v-if="p.spec" class="text-gray-500 font-normal ml-1">{{ p.spec }}</span>
          </div>
          <div class="text-sm text-gray-400">排序 {{ p.order }} ・ HK$ {{ p.price }}</div>
        </div>
        <el-switch v-model="p.isActive" @change="toggleActive(p)" />
        <button class="p-2 rounded-xl hover:bg-gray-100" @click="openForm(p)">
          <Pencil class="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </div>

    <!-- 新增/編輯 Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '編輯品項' : '新增品項'" width="92%" align-center>
      <div class="space-y-4 py-2">
        <div>
          <label class="label">品項名稱 *</label>
          <input v-model="form.name" type="text" class="input" placeholder="例如：背心" />
        </div>
        <div>
          <label class="label">規格</label>
          <input v-model="form.spec" type="text" class="input" placeholder="例如：M、L、薄、厚" />
        </div>
        <div>
          <label class="label">單價 (HK$)</label>
          <input v-model.number="form.price" type="number" class="input" placeholder="0" />
        </div>
        <div>
          <label class="label">排序序號</label>
          <input v-model.number="form.order" type="number" class="input" />
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost mr-2" @click="dialogVisible = false">取消</button>
        <button class="btn-primary" :disabled="!form.name || saving" @click="save">
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  collection, getDocs, addDoc, updateDoc, doc, query, orderBy
} from 'firebase/firestore'
import { Plus, Pencil } from 'lucide-vue-next'
import { db } from '@/firebase'
import AppLayout from '@/components/AppLayout.vue'

const products = ref([])
const loading  = ref(false)
const saving   = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const form = ref({ name: '', spec: '', price: 0, order: 1, isActive: true })

async function load() {
  loading.value = true
  const q = query(collection(db, 'products'), orderBy('order'))
  const snap = await getDocs(q)
  products.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  loading.value = false
}

function openForm(product = null) {
  editingId.value = product?.id ?? null
  form.value = product
    ? { name: product.name, spec: product.spec ?? '', price: product.price ?? 0, order: product.order ?? 1, isActive: product.isActive }
    : { name: '', spec: '', price: 0, order: (products.value.length + 1) * 10, isActive: true }
  dialogVisible.value = true
}

async function save() {
  saving.value = true
  try {
    const data = { ...form.value }
    if (editingId.value) {
      await updateDoc(doc(db, 'products', editingId.value), data)
      const idx = products.value.findIndex(p => p.id === editingId.value)
      if (idx !== -1) products.value[idx] = { id: editingId.value, ...data }
    } else {
      const ref = await addDoc(collection(db, 'products'), data)
      products.value.push({ id: ref.id, ...data })
    }
    dialogVisible.value = false
  } finally {
    saving.value = false
  }
}

async function toggleActive(product) {
  await updateDoc(doc(db, 'products', product.id), { isActive: product.isActive })
}

onMounted(load)
</script>
