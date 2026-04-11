<template>
  <AppLayout title="道場管理" :show-location-picker="false">
    <div class="flex justify-end mb-4">
      <button class="btn-primary gap-2 text-base" @click="openForm()">
        <Plus class="w-5 h-5" /> 新增道場
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="loc in locations"
        :key="loc.id"
        class="card flex items-center gap-3"
        :class="!loc.isActive ? 'opacity-50' : ''"
      >
        <Building2 class="w-8 h-8 text-brand-400 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-800">{{ loc.name }}</div>
          <div v-if="loc.address" class="text-sm text-gray-400 truncate">{{ loc.address }}</div>
        </div>
        <el-switch v-model="loc.isActive" @change="toggleActive(loc)" />
        <button class="p-2 rounded-xl hover:bg-gray-100" @click="openForm(loc)">
          <Pencil class="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '編輯道場' : '新增道場'" width="92%" align-center>
      <div class="space-y-4 py-2">
        <div>
          <label class="label">道場名稱 *</label>
          <input v-model="form.name" type="text" class="input" placeholder="例如：本會道場" />
        </div>
        <div>
          <label class="label">地址（選填）</label>
          <input v-model="form.address" type="text" class="input" placeholder="例如：香港XX區XX路XX號" />
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
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore'
import { Plus, Pencil, Building2 } from 'lucide-vue-next'
import { db } from '@/firebase'
import AppLayout from '@/components/AppLayout.vue'

const locations = ref([])
const loading    = ref(false)
const saving     = ref(false)
const dialogVisible = ref(false)
const editingId  = ref(null)
const form = ref({ name: '', address: '', isActive: true })

async function load() {
  loading.value = true
  const snap = await getDocs(query(collection(db, 'locations'), orderBy('name')))
  locations.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  loading.value = false
}

function openForm(loc = null) {
  editingId.value = loc?.id ?? null
  form.value = loc
    ? { name: loc.name, address: loc.address ?? '', isActive: loc.isActive }
    : { name: '', address: '', isActive: true }
  dialogVisible.value = true
}

async function save() {
  saving.value = true
  try {
    const data = { ...form.value }
    if (editingId.value) {
      await updateDoc(doc(db, 'locations', editingId.value), data)
      const idx = locations.value.findIndex(l => l.id === editingId.value)
      if (idx !== -1) locations.value[idx] = { id: editingId.value, ...data }
    } else {
      const ref = await addDoc(collection(db, 'locations'), data)
      locations.value.push({ id: ref.id, ...data })
    }
    dialogVisible.value = false
  } finally {
    saving.value = false
  }
}

async function toggleActive(loc) {
  await updateDoc(doc(db, 'locations', loc.id), { isActive: loc.isActive })
}

onMounted(load)
</script>
