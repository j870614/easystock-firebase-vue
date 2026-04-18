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
        class="card flex flex-col gap-2"
      >
        <!-- 第一行：頭像 + 名稱/執事 + role badge -->
        <div class="flex items-center gap-3">
          <img
            :src="u.photoURL || ''"
            class="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"
            :alt="u.displayName"
          />
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-800 truncate">
              <span v-if="u.dharmaName">{{ u.dharmaName }}</span>
              <span v-else-if="u.secularName">{{ u.secularName }}</span>
              <span v-else>{{ u.displayName }}</span>
            </div>
            <div class="text-sm text-gray-400 truncate">
              <span v-if="u.dharmaName && u.secularName">{{ u.secularName }} · </span>
              {{ u.email }}
            </div>
            <div class="flex items-center gap-1.5 mt-1 flex-wrap">
              <span :class="`badge-role-${u.role}`">{{ roleLabel(u.role) }}</span>
              <span v-if="u.dutyName" class="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">{{ u.dutyName }}</span>
              <span v-if="u.uid === selfUid" class="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">本人</span>
            </div>
          </div>
        </div>

        <!-- 系統總管可編輯法名/俗名 -->
        <div v-if="authStore.isOwner && editingUid === u.uid" class="flex flex-col gap-2 bg-gray-50 rounded-xl p-3 border">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-gray-500 block mb-1">法名</label>
              <input v-model="editForm.dharmaName" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="法名（選填）" />
            </div>
            <div>
              <label class="text-xs text-gray-500 block mb-1">俗名</label>
              <input v-model="editForm.secularName" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="俗名（選填）" />
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100" @click="editingUid = null">取消</button>
            <button class="text-sm px-4 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600" @click="saveNames(u)">儲存</button>
          </div>
        </div>
        <div v-else-if="authStore.isOwner" class="flex justify-end">
          <button class="text-xs text-brand-600 hover:underline flex items-center gap-1" @click="startEditNames(u)">
            ✏️ 編輯法名/俗名
          </button>
        </div>

        <!-- 第二行：owner 可編輯的下拉選單 -->
        <div v-if="authStore.isOwner && u.uid !== selfUid" class="grid grid-cols-1 gap-2">
          <el-select
            v-model="u.role"
            class="w-full"
            @change="changeRole(u)"
          >
            <el-option label="待審核" value="pending" />
            <el-option label="一般人員" value="staff" />
            <el-option label="管理員" value="admin" />
            <el-option label="系統總管" value="owner" />
          </el-select>

          <el-select
            v-model="u.assignedLocationId"
            class="w-full"
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

          <el-select
            v-model="u.dutyId"
            class="w-full"
            placeholder="執事"
            clearable
            @change="changeDuty(u)"
          >
            <el-option
              v-for="d in appStore.activeDuties"
              :key="d.id"
              :label="d.name"
              :value="d.id"
            />
          </el-select>
        </div>

        <!-- admin（非 owner）僅可改道場 -->
        <div v-else-if="authStore.isAdmin && !authStore.isOwner && u.uid !== selfUid" class="flex gap-2">
          <el-select
            v-model="u.assignedLocationId"
            class="flex-1 min-w-0"
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
const editingUid = ref(null)
const editForm = ref({ dharmaName: '', secularName: '' })
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
    ElMessage.success(`已將角色更新為「${roleLabel(u.role)}」`)
  } catch (e) {
    ElMessage.error('更新失敗，請確認您的權限。')
  }
}

async function changeLocation(u) {
  try {
    await updateDoc(doc(db, 'users', u.uid), { assignedLocationId: u.assignedLocationId || null })
    const locName = appStore.locations.find(l => l.id === u.assignedLocationId)?.name || '無'
    ElMessage.success(`道場已更新為「${locName}」`)
  } catch (e) {
    ElMessage.error('更新道場失敗，請確認您的權限。')
  }
}

async function changeDuty(u) {
  const duty = appStore.activeDuties.find(d => d.id === u.dutyId)
  const dutyName = duty?.name || ''
  try {
    await updateDoc(doc(db, 'users', u.uid), { dutyId: u.dutyId || null, dutyName })
    u.dutyName = dutyName
    ElMessage.success(dutyName ? `執事已更新為「${dutyName}」` : '已清除執事')
  } catch (e) {
    ElMessage.error('更新執事失敗，請確認您的權限。')
  }
}

function startEditNames(u) {
  editingUid.value = u.uid
  editForm.value = { dharmaName: u.dharmaName || '', secularName: u.secularName || '' }
}

async function saveNames(u) {
  try {
    await updateDoc(doc(db, 'users', u.uid), {
      dharmaName: editForm.value.dharmaName.trim(),
      secularName: editForm.value.secularName.trim(),
    })
    u.dharmaName = editForm.value.dharmaName.trim()
    u.secularName = editForm.value.secularName.trim()
    editingUid.value = null
    ElMessage.success('法名/俗名已更新')
  } catch (e) {
    ElMessage.error('更新失敗：' + e.message)
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
