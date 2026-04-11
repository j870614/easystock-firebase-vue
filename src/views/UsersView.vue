<template>
  <AppLayout title="成員管理" :show-location-picker="false">
    <div class="mb-4 text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-xl p-3">
      ⚠️ 僅系統總管可以變更成員角色
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="u in users"
        :key="u.uid"
        class="card flex items-center gap-3"
      >
        <img
          :src="u.photoURL || ''"
          class="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"
          :alt="u.displayName"
        />
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-800 truncate">{{ u.displayName }}</div>
          <div class="text-sm text-gray-400 truncate">{{ u.email }}</div>
          <span :class="`badge-role-${u.role}`" class="mt-1">{{ roleLabel(u.role) }}</span>
        </div>

        <!-- 角色選擇（只有 owner 可操作，且不可改自己） -->
        <el-select
          v-if="u.uid !== selfUid"
          v-model="u.role"
          class="w-28"
          @change="changeRole(u)"
        >
          <el-option label="待審核" value="pending" />
          <el-option label="一般人員" value="staff" />
          <el-option label="管理員" value="admin" />
          <el-option label="系統總管" value="owner" />
        </el-select>
        <span v-else class="text-xs text-gray-400">（自己）</span>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { collection, getDocs, updateDoc, doc, orderBy, query } from 'firebase/firestore'
import { ElMessage } from 'element-plus'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const selfUid = computed(() => authStore.user?.uid)

const users = ref([])
const loading = ref(false)

const ROLE_MAP = {
  owner:   '系統總管',
  admin:   '管理員',
  staff:   '一般人員',
  pending: '待審核',
}
const roleLabel = r => ROLE_MAP[r] ?? r

async function load() {
  loading.value = true
  const snap = await getDocs(query(collection(db, 'users'), orderBy('displayName')))
  users.value = snap.docs.map(d => ({ ...d.data(), uid: d.id }))
  loading.value = false
}

async function changeRole(u) {
  try {
    await updateDoc(doc(db, 'users', u.uid), { role: u.role })
    ElMessage.success(`已將 ${u.displayName} 的角色更新為「${roleLabel(u.role)}」`)
  } catch (e) {
    ElMessage.error('更新失敗，請確認您的權限。')
  }
}

onMounted(load)
</script>
