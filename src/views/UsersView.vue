<template>
  <AppLayout title="成員管理" :show-location-picker="false">
    <div class="mb-4 text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-xl p-3">
      角色、道場、堂口與職稱分開管理；`staff` / `hallLead` 必須綁堂口。
    </div>

    <div class="card mb-4 space-y-3">
      <div v-for="group in filterGroups" :key="group.key" class="space-y-1.5">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-gray-400">{{ group.label }}</h3>
          <button class="text-[10px] text-brand-600 hover:underline" @click="toggleGroupAll(group)">
            {{ isGroupAll(group) ? '取消全選' : '全選' }}
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in group.options"
            :key="item.value"
            class="px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-all"
            :class="group.selected.value.includes(item.value) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'"
            @click="toggleFilter(group.selected.value, item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else class="space-y-3 pb-24">
      <div v-for="u in filteredUsers" :key="u.uid" class="card flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <img :src="u.photoURL || ''" class="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" :alt="u.displayName" />
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
              <span v-if="scopeLabel(u)" class="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">{{ scopeLabel(u) }}</span>
              <span v-if="u.uid === selfUid" class="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">本人</span>
            </div>
          </div>
        </div>

        <div v-if="authStore.isOwner && editingUid === u.uid" class="flex flex-col gap-2 bg-gray-50 rounded-xl p-3 border">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label class="text-xs text-gray-500 block mb-1">法名</label>
              <input v-model="editForm.dharmaName" type="text" class="input py-2 text-sm" placeholder="法名（選填）" />
            </div>
            <div>
              <label class="text-xs text-gray-500 block mb-1">俗名</label>
              <input v-model="editForm.secularName" type="text" class="input py-2 text-sm" placeholder="俗名（選填）" />
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100" @click="editingUid = null">取消</button>
            <button class="text-sm px-4 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600" @click="saveNames(u)">儲存</button>
          </div>
        </div>
        <div v-else-if="authStore.isOwner" class="flex justify-end">
          <button class="text-xs text-brand-600 hover:underline" @click="startEditNames(u)">編輯法名 / 俗名</button>
        </div>

        <div v-if="authStore.canManageUsers && canManageUser(u)" class="grid grid-cols-1 gap-2">
          <el-select
            v-model="u.role"
            class="w-full"
            :disabled="u.uid === selfUid && u.role === 'owner'"
            @change="() => changeRole(u)"
          >
            <el-option
              v-for="option in roleOptionsForUser(u)"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>

          <el-select
            v-model="u.assignedLocationId"
            class="w-full"
            placeholder="指派道場"
            clearable
            :disabled="!needsScopedAssignment(u.role)"
            @change="() => changeLocation(u)"
          >
            <el-option
              v-for="loc in sortedLocations"
              :key="loc.id"
              :label="loc.name"
              :value="loc.id"
            />
          </el-select>

          <el-select
            v-model="u.assignedHallId"
            class="w-full"
            placeholder="指派堂口"
            clearable
            :disabled="!needsScopedAssignment(u.role) || !u.assignedLocationId"
            @change="() => changeHall(u)"
          >
            <el-option
              v-for="hall in hallOptionsForUser(u)"
              :key="hall.id"
              :label="hall.name"
              :value="hall.id"
            />
          </el-select>

          <el-select
            v-model="u.dutyId"
            class="w-full"
            placeholder="職稱"
            clearable
            @change="() => changeDuty(u)"
          >
            <el-option
              v-for="duty in appStore.activeDuties"
              :key="duty.id"
              :label="duty.name"
              :value="duty.id"
            />
          </el-select>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { ElMessage } from 'element-plus'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'
import { ROLE_MAP, sortByOrder } from '@/utils/multiDept'

const authStore = useAuthStore()
const appStore = useAppStore()

const loading = ref(false)
const users = ref([])
const editingUid = ref(null)
const editForm = ref({ dharmaName: '', secularName: '' })

const selfUid = computed(() => authStore.user?.uid)

const selectedRoles = ref(Object.keys(ROLE_MAP))
const selectedLocs = ref([])
const selectedHalls = ref([])
const selectedDuties = ref([])
const sortedLocations = computed(() => [...appStore.locations].sort(sortByOrder))

const hallFilterOptions = computed(() => {
  const scopedLocationIds =
    selectedLocs.value.length === 1 && selectedLocs.value[0] !== 'none'
      ? new Set(selectedLocs.value)
      : null

  return sortedLocations.value.flatMap((location) =>
    appStore
      .getHallsForLocation(location.id)
      .filter((hall) => !scopedLocationIds || scopedLocationIds.has(hall.locationId))
      .map((hall) => ({
        value: hall.id,
        label: `${location.name} / ${hall.name}`,
      }))
  )
})

const filterGroups = computed(() => [
  {
    key: 'role',
    label: '權限角色',
    selected: selectedRoles,
    options: Object.entries(ROLE_MAP).map(([value, label]) => ({ value, label })),
  },
  {
    key: 'loc',
    label: '所屬道場',
    selected: selectedLocs,
    options: [{ value: 'none', label: '未指派' }, ...sortedLocations.value.map((loc) => ({ value: loc.id, label: loc.name }))],
  },
  {
    key: 'hall',
    label: '所屬堂口',
    selected: selectedHalls,
    options: [{ value: 'none', label: '未指派' }, ...hallFilterOptions.value],
  },
  {
    key: 'duty',
    label: '職稱',
    selected: selectedDuties,
    options: [{ value: 'none', label: '無職稱' }, ...appStore.activeDuties.map((duty) => ({ value: duty.id, label: duty.name }))],
  },
])

const filteredUsers = computed(() =>
  users.value.filter((user) => {
    const roleMatch = selectedRoles.value.includes(user.role)
    const locMatch =
      selectedLocs.value.length === 0 ||
      (selectedLocs.value.includes('none') && !user.assignedLocationId) ||
      selectedLocs.value.includes(user.assignedLocationId)
    const hallMatch =
      selectedHalls.value.length === 0 ||
      (selectedHalls.value.includes('none') && !user.assignedHallId) ||
      selectedHalls.value.includes(user.assignedHallId)
    const dutyMatch =
      selectedDuties.value.length === 0 ||
      (selectedDuties.value.includes('none') && !user.dutyId) ||
      selectedDuties.value.includes(user.dutyId)
    return roleMatch && locMatch && hallMatch && dutyMatch
  })
)

function toggleFilter(arr, value) {
  const index = arr.indexOf(value)
  if (index === -1) arr.push(value)
  else arr.splice(index, 1)
}

function isGroupAll(group) {
  return group.selected.value.length === group.options.length
}

function toggleGroupAll(group) {
  if (isGroupAll(group)) group.selected.value = []
  else group.selected.value = group.options.map((option) => option.value)
}

function roleLabel(role) {
  return ROLE_MAP[role] ?? role
}

function scopeLabel(user) {
  const hall = appStore.halls.find((item) => item.id === user.assignedHallId)
  const location =
    appStore.locations.find((item) => item.id === user.assignedLocationId) ??
    appStore.locations.find((item) => item.id === hall?.locationId)

  if (!location && !hall) {
    return ['owner', 'admin'].includes(user.role) ? '全域' : ''
  }

  return [location?.name, hall?.name].filter(Boolean).join(' / ')
}

function needsScopedAssignment(role) {
  return ['staff', 'hallLead'].includes(role)
}

function canManageUser(user) {
  if (authStore.isOwner) return true
  if (!authStore.isAdmin) return false
  return user.role !== 'owner'
}

function roleOptionsForUser(user) {
  if (authStore.isOwner) {
    return Object.entries(ROLE_MAP).map(([value, label]) => ({ value, label }))
  }

  return Object.entries(ROLE_MAP)
    .filter(([value]) => !['owner'].includes(value))
    .map(([value, label]) => ({ value, label }))
}

function hallOptionsForUser(user) {
  if (!user.assignedLocationId) return []
  return appStore.getHallsForLocation(user.assignedLocationId)
}

function getFallbackHallId(locationId) {
  return appStore.getDefaultHallForLocation(locationId)?.id ?? null
}

function startEditNames(user) {
  editingUid.value = user.uid
  editForm.value = {
    dharmaName: user.dharmaName || '',
    secularName: user.secularName || '',
  }
}

async function saveNames(user) {
  await updateDoc(doc(db, 'users', user.uid), {
    dharmaName: editForm.value.dharmaName.trim(),
    secularName: editForm.value.secularName.trim(),
  })
  editingUid.value = null
  ElMessage.success('已更新名稱')
}

async function changeRole(user) {
  const payload = { role: user.role }
  if (!needsScopedAssignment(user.role)) {
    payload.assignedLocationId = null
    payload.assignedHallId = null
    user.assignedLocationId = null
    user.assignedHallId = null
  } else if (user.assignedLocationId && !user.assignedHallId) {
    const hallId = getFallbackHallId(user.assignedLocationId)
    payload.assignedHallId = hallId
    user.assignedHallId = hallId
  }

  await updateDoc(doc(db, 'users', user.uid), payload)
  ElMessage.success(`角色已更新為「${roleLabel(user.role)}」`)
}

async function changeLocation(user) {
  if (!needsScopedAssignment(user.role)) {
    await updateDoc(doc(db, 'users', user.uid), {
      assignedLocationId: null,
      assignedHallId: null,
    })
    return
  }

  const hallId = user.assignedLocationId ? getFallbackHallId(user.assignedLocationId) : null
  user.assignedHallId = hallId
  await updateDoc(doc(db, 'users', user.uid), {
    assignedLocationId: user.assignedLocationId || null,
    assignedHallId: hallId,
  })
  ElMessage.success('道場與預設堂口已更新')
}

async function changeHall(user) {
  const hallId = user.assignedHallId || getFallbackHallId(user.assignedLocationId)
  user.assignedHallId = hallId
  await updateDoc(doc(db, 'users', user.uid), { assignedHallId: hallId || null })
  ElMessage.success('堂口已更新')
}

async function changeDuty(user) {
  const duty = appStore.activeDuties.find((item) => item.id === user.dutyId)
  const dutyName = duty?.name || ''
  user.dutyName = dutyName
  await updateDoc(doc(db, 'users', user.uid), {
    dutyId: user.dutyId || null,
    dutyName,
  })
  ElMessage.success(dutyName ? `職稱已更新為「${dutyName}」` : '已清除職稱')
}

loading.value = true
onSnapshot(collection(db, 'users'), (snap) => {
  users.value = snap.docs.map((item) => ({ uid: item.id, ...item.data() }))
  loading.value = false
})
</script>
