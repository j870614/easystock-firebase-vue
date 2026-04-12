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
          <div class="font-semibold text-gray-800 truncate">
            <span v-if="u.dharmaName">{{ u.dharmaName }} ({{ u.secularName }})</span>
            <span v-else-if="u.secularName">{{ u.secularName }}</span>
            <span v-else>{{ u.displayName }}</span>
          </div>
          <div class="text-sm text-gray-400 truncate">{{ u.email }}</div>
          <span :class="`badge-role-${u.role}`" class="mt-1">{{ roleLabel(u.role) }}</span>
        </div>

        <!-- 角色與道場設定堆疊 -->
        <div class="flex flex-col gap-2 items-end">
          <!-- 角色選擇（只有 owner 可操作，且不可改自己） -->
          <el-select
            v-if="u.uid !== selfUid"
            v-model="u.role"
            class="w-28"
            :disabled="!authStore.isOwner"
            @change="changeRole(u)"
          >
            <el-option label="待審核" value="pending" />
            <el-option label="一般人員" value="staff" />
            <el-option label="管理員" value="admin" />
            <el-option label="系統總管" value="owner" />
          </el-select>
          <span v-else-if="u.uid === selfUid" class="text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded">本人</span>
          
          <!-- 道場指派設定（owner 或 admin 均可幫自己或他人改）-->
          <el-select
            v-if="authStore.isAdmin"
            v-model="u.assignedLocationId"
            class="w-32"
            placeholder="指派道場"
            clearable
            @change="changeLocation(u)"
          >
            <el-option
              v-for="loc in appStore.locations"
              :key="loc.id"
              :label="loc.name"
              :value="loc.id"
            />
          </el-select>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { collection, onSnapshot, updateDoc, doc, orderBy, query } from 'firebase/firestore'
import { ElMessage } from 'element-plus'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const appStore = useAppStore()
const selfUid = computed(() => authStore.user?.uid)

const users = ref([])
const loading = ref(false)
let unsubscribe = null

const ROLE_MAP = {
  owner:   '系統總管',
  admin:   '管理員',
  staff:   '一般人員',
  pending: '待審核',
}
const roleLabel = r => ROLE_MAP[r] ?? r

function listen() {
  loading.value = true
  const q = query(collection(db, 'users'), orderBy('displayName'))
  
  unsubscribe = onSnapshot(q, (snap) => {
    users.value = snap.docs.map(d => ({ ...d.data(), uid: d.id }))
    loading.value = false
  }, (err) => {
    console.error('Users listener error:', err)
    loading.value = false
  })
}

async function changeRole(u) {
  if (!authStore.isOwner) {
    ElMessage.error('僅系統總管可變更角色。')
    return
  }
  try {
    await updateDoc(doc(db, 'users', u.uid), { role: u.role })
    ElMessage.success(`已將 ${u.displayName} 的角色更新為「${roleLabel(u.role)}」`)
  } catch (e) {
    ElMessage.error('更新失敗，請確認您的權限。')
  }
}

async function changeLocation(u) {
  try {
    await updateDoc(doc(db, 'users', u.uid), { assignedLocationId: u.assignedLocationId || null })
    const locName = appStore.locations.find(l => l.id === u.assignedLocationId)?.name || '無'
    ElMessage.success(`已將 ${u.displayName} 指派至「${locName}」`)
  } catch (e) {
    ElMessage.error('更新道場失敗，請確認您的權限。')
  }
}

onMounted(() => {
  appStore.init()
  listen()
})
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})
</script>
