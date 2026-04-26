<template>
  <AppLayout title="系統設定" :show-location-picker="false">
    <div v-if="!authStore.isOwner" class="text-center py-20 text-gray-400">
      <p>無權限訪問</p>
    </div>
    <div v-else class="space-y-4">
      <!-- 執事管理 -->
      <div class="card">
        <h2 class="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <Users class="w-5 h-5 text-gray-500" /> 執事管理
        </h2>

        <div class="space-y-2 mb-3">
          <div
            v-for="duty in appStore.duties"
            :key="duty.id"
            class="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white"
          >
            <span class="flex-1 text-gray-800 font-medium text-sm">{{ duty.name }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full"
              :class="duty.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'"
            >{{ duty.isActive ? '啟用' : '停用' }}</span>
            <button
              class="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              @click="openEditDuty(duty)"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              @click="deleteDuty(duty)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <div v-if="appStore.duties.length === 0" class="text-gray-400 text-sm text-center py-4">
            尚無執事選項
          </div>
        </div>

        <button
          class="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center justify-center gap-2 text-sm font-medium"
          @click="openAddDuty"
        >
          <Plus class="w-4 h-4" /> 新增執事
        </button>
      </div>

      <!-- 安全性設定 -->
      <div class="card">
        <h2 class="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <ShieldCheck class="w-5 h-5 text-gray-500" /> 安全性設定
        </h2>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">
              閒置自動登出時間（分鐘）
            </label>
            <p class="text-xs text-gray-400 mb-2">設定為 0 表示停用此功能，最少 5 分鐘，最多 480 分鐘（8 小時）。</p>
            <div class="flex items-center gap-3">
              <input
                v-model.number="idleTimeoutInput"
                type="number"
                min="0"
                max="480"
                step="5"
                class="input w-32 text-center text-lg font-bold"
                placeholder="30"
              />
              <span class="text-gray-500 text-sm">分鐘</span>
              <span v-if="idleTimeoutInput === 0" class="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">️ 功能已停用</span>
              <span v-else class="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg">✓ {{ idleTimeoutInput }} 分鐘無操作會自動登出</span>
            </div>
          </div>
          <button
            class="btn-primary w-full"
            :disabled="savingIdleTimeout"
            @click="saveIdleTimeout"
          >
            {{ savingIdleTimeout ? '儲存中…' : '儲存安全設定' }}
          </button>
        </div>
      </div>

      <!-- 權限設定 -->
      <div class="card">
        <h2 class="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <ShieldCheck class="w-5 h-5 text-gray-500" /> 權限設定
        </h2>
        <div class="overflow-x-auto rounded-xl border border-gray-200">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-gray-500">
              <tr>
                <th class="px-3 py-3 text-left font-semibold">功能</th>
                <th
                  v-for="role in PERMISSION_ROLE_OPTIONS"
                  :key="role.value"
                  class="px-3 py-3 text-center font-semibold whitespace-nowrap"
                >
                  {{ role.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="permission in BUSINESS_PERMISSIONS" :key="permission.key">
                <td class="px-3 py-3 align-top">
                  <div class="font-semibold text-gray-800">{{ permission.label }}</div>
                  <div class="mt-1 text-xs leading-relaxed text-gray-400">{{ permission.description }}</div>
                </td>
                <td
                  v-for="role in PERMISSION_ROLE_OPTIONS"
                  :key="`${permission.key}-${role.value}`"
                  class="px-3 py-3 text-center align-middle"
                >
                  <input
                    type="checkbox"
                    class="h-5 w-5 rounded border-gray-300 text-brand-600"
                    :checked="permissionForm[permission.key]?.includes(role.value)"
                    @change="togglePermissionRole(permission.key, role.value)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-3 text-xs leading-relaxed text-gray-400">
          系統總管永遠保留所有權限；成員管理、系統設定、Passkey 審核不開放動態調整。
        </p>
        <button
          class="btn-primary mt-4 w-full"
          :disabled="savingPermissions"
          @click="savePermissions"
        >
          {{ savingPermissions ? '儲存中…' : '儲存權限設定' }}
        </button>
      </div>

      <!-- 系統執行環境 -->
      <div class="card">
        <h2 class="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <Settings class="w-5 h-5 text-gray-500" /> 系統執行環境
        </h2>

        <div class="p-4 rounded-xl border-2 transition-all cursor-pointer"
             :class="appStore.systemMode === 'development' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'"
             @click="toggleMode('development')">
          <div class="flex items-start gap-3">
            <TestTube class="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div class="flex-1">
              <div class="font-bold text-gray-800">開發測試模式 (Development)</div>
              <div class="text-sm text-gray-500 mt-1">供系統建置初期測試使用，可隨意新增測試數據。</div>
            </div>
            <Check v-if="appStore.systemMode === 'development'" class="w-6 h-6 text-amber-600 flex-shrink-0" />
          </div>
        </div>

        <div class="p-4 rounded-xl border-2 transition-all cursor-pointer mt-3"
             :class="appStore.systemMode === 'production' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'"
             @click="toggleMode('production')">
          <div class="flex items-start gap-3">
            <CheckCircle class="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
            <div class="flex-1">
              <div class="font-bold text-gray-800">正式上線模式 (Production)</div>
              <div class="text-sm text-gray-500 mt-1">切換至此模式時，系統將會清除所有開發階段的測試出入庫紀錄與庫存資料。</div>
            </div>
            <Check v-if="appStore.systemMode === 'production'" class="w-6 h-6 text-green-600 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>

    <!-- 執事 新增/編輯 Dialog -->
    <el-dialog
      v-model="dutyDialog"
      :title="editingDuty ? '編輯執事' : '新增執事'"
      width="90%"
      align-center
      destroy-on-close
    >
      <div class="space-y-4 py-2">
        <div>
          <label class="label">執事名稱 <span class="text-red-500">*</span></label>
          <input v-model="dutyForm.name" type="text" class="input" placeholder="例如：知客" />
        </div>
        <div class="flex items-center gap-3">
          <span class="label mb-0">啟用</span>
          <el-switch v-model="dutyForm.isActive" />
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <button class="btn-ghost flex-1" @click="dutyDialog = false">取消</button>
          <button
            class="btn-primary flex-1"
            :disabled="!dutyForm.name.trim() || savingDuty"
            @click="saveDuty"
          >
            {{ savingDuty ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { doc, getDocs, collection, writeBatch, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { Settings, TestTube, CheckCircle, Check, Users, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'
import {
  BUSINESS_PERMISSIONS,
  PERMISSION_ROLE_OPTIONS,
  normalizePermissionRoles,
} from '@/utils/permissions'
import { ROLE_MAP } from '@/utils/multiDept'

const authStore = useAuthStore()
const appStore = useAppStore()

onMounted(() => appStore.init())

// ── 閒置自動登出設定 ────────────────────────────────────
const idleTimeoutInput = ref(appStore.idleTimeout)
const savingIdleTimeout = ref(false)

// 當 Firestore 更新後，同步到輸入框
watch(() => appStore.idleTimeout, (val) => {
  idleTimeoutInput.value = val
}, { immediate: true })

// ── 權限設定 ────────────────────────────────────────────
const permissionForm = ref(normalizePermissionRoles())
const savingPermissions = ref(false)

watch(() => authStore.permissionRoles, (val) => {
  permissionForm.value = normalizePermissionRoles(val)
}, { immediate: true, deep: true })

function togglePermissionRole(permissionKey, role) {
  const roles = new Set(permissionForm.value[permissionKey] ?? [])
  if (roles.has(role)) roles.delete(role)
  else roles.add(role)
  permissionForm.value = {
    ...permissionForm.value,
    [permissionKey]: [...roles],
  }
}

async function savePermissions() {
  savingPermissions.value = true
  try {
    await setDoc(doc(db, 'settings', 'permissions'), {
      roles: normalizePermissionRoles(permissionForm.value),
      updatedAt: serverTimestamp(),
      updatedBy: authStore.user?.uid ?? null,
    }, { merge: true })
    ElMessage.success('權限設定已更新')
  } catch (e) {
    ElMessage.error('儲存失敗：' + (e.code || e.message))
  } finally {
    savingPermissions.value = false
  }
}

async function saveIdleTimeout() {
  const val = idleTimeoutInput.value
  if (val !== 0 && (val < 5 || val > 480)) {
    ElMessage.warning('請設定 0（停用）或 5~480 之間的分鐘數')
    return
  }
  savingIdleTimeout.value = true
  try {
    await setDoc(doc(db, 'settings', 'system'), { idleTimeout: val }, { merge: true })
    ElMessage.success(val === 0 ? '已停用閒置自動登出' : `已設定閒置 ${val} 分鐘後自動登出`)
  } catch (e) {
    ElMessage.error('儲存失敗：' + e.message)
  } finally {
    savingIdleTimeout.value = false
  }
}

// ── 執事 CRUD ──────────────────────────────────────────
const dutyDialog = ref(false)
const savingDuty = ref(false)
const editingDuty = ref(null)
const dutyForm = ref({ name: '', isActive: true })

function openAddDuty() {
  editingDuty.value = null
  dutyForm.value = { name: '', isActive: true }
  dutyDialog.value = true
}

function openEditDuty(duty) {
  editingDuty.value = duty
  dutyForm.value = { name: duty.name, isActive: duty.isActive }
  dutyDialog.value = true
}

async function saveDuty() {
  if (!dutyForm.value.name.trim()) return
  savingDuty.value = true
  try {
    if (editingDuty.value) {
      await updateDoc(doc(db, 'duties', editingDuty.value.id), {
        name: dutyForm.value.name.trim(),
        isActive: dutyForm.value.isActive
      })
      ElMessage.success('執事已更新')
    } else {
      const maxOrder = appStore.duties.reduce((m, d) => Math.max(m, d.order || 0), 0)
      await addDoc(collection(db, 'duties'), {
        name: dutyForm.value.name.trim(),
        isActive: dutyForm.value.isActive,
        order: maxOrder + 1,
        createdAt: serverTimestamp()
      })
      ElMessage.success('執事已新增')
    }
    dutyDialog.value = false
  } catch (e) {
    console.error('[SettingsView] saveDuty error:', e)
    ElMessage.error(`儲存失敗：${e.code || e.message} (目前角色: ${ROLE_MAP[authStore.role] ?? '未知角色'})`)
  } finally {
    savingDuty.value = false
  }
}

async function deleteDuty(duty) {
  try {
    await ElMessageBox.confirm(`確定要刪除「${duty.name}」嗎？`, '刪除執事', {
      confirmButtonText: '刪除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteDoc(doc(db, 'duties', duty.id))
    ElMessage.success('執事已刪除')
  } catch (e) {
    if (e !== 'cancel') {
      console.error('[SettingsView] deleteDuty error:', e)
      ElMessage.error('刪除失敗：' + (e.code || e.message))
    }
  }
}

// ── 系統模式 ───────────────────────────────────────────
async function toggleMode(mode) {
  if (appStore.systemMode === mode) return

  if (mode === 'production') {
    let confirmText = ''
    try {
      const result = await ElMessageBox.prompt(
        '即將清除所有出入庫紀錄並將所有庫存歸零。道場與品相設定將會保留。確認執行請輸入 PROD。',
        '切換正式上線模式',
        {
          confirmButtonText: '確認切換',
          cancelButtonText: '取消',
          inputPattern: /^PROD$/,
          inputErrorMessage: '請輸入 PROD',
          type: 'warning',
        }
      )
      confirmText = result.value
    } catch (e) {
      return
    }
    if (confirmText !== 'PROD') return

    try {
      await clearAllData()
      await setDoc(doc(db, 'settings', 'system'), { mode: 'production' }, { merge: true })
      ElMessage.success('已成功切換至正式上線模式，並清理所有測試數據。')
    } catch (e) {
      ElMessage.error('切換失敗：' + e.message)
    }
  } else {
    let confirmText = ''
    try {
      const result = await ElMessageBox.prompt(
        '切換回開發測試模式不會還原被刪除的資料。確認切換請輸入 DEV。',
        '切換開發測試模式',
        {
          confirmButtonText: '確認切換',
          cancelButtonText: '取消',
          inputPattern: /^DEV$/,
          inputErrorMessage: '請輸入 DEV',
          type: 'warning',
        }
      )
      confirmText = result.value
    } catch (e) {
      return
    }
    if (confirmText !== 'DEV') return

    try {
      await setDoc(doc(db, 'settings', 'system'), { mode: 'development' }, { merge: true })
      ElMessage.success('已切換回開發測試模式。')
    } catch (e) {
      ElMessage.error('切換失敗：' + e.message)
    }
  }
}

async function clearAllData() {
  const collections = ['transactions', 'stocks']
  for (const collName of collections) {
    const snap = await getDocs(collection(db, collName))
    let batch = writeBatch(db)
    let count = 0

    for (const d of snap.docs) {
      batch.delete(d.ref)
      count++
      if (count === 500) {
        await batch.commit()
        batch = writeBatch(db)
        count = 0
      }
    }
    if (count > 0) await batch.commit()
  }
}
</script>
