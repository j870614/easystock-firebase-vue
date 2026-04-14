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
import { ref, onMounted } from 'vue'
import { doc, getDocs, collection, writeBatch, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { Settings, TestTube, CheckCircle, Check, Users, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const appStore = useAppStore()

onMounted(() => appStore.init())

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
    ElMessage.error(`儲存失敗：${e.code || e.message} (目前角色: ${authStore.role})`)
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
    const confirmText = prompt('【警告】即將切換至「正式上線模式」\n\n系統將會清除「所有出入庫紀錄」並將「所有庫存歸零」！道場與品相設定將會保留。\n\n確認執行請輸入 "PROD"：')
    if (confirmText !== 'PROD') return

    try {
      await clearAllData()
      await setDoc(doc(db, 'settings', 'system'), { mode: 'production' }, { merge: true })
      alert('已成功切換至正式上線模式，並清理所有測試數據。')
    } catch (e) {
      alert('切換失敗：' + e.message)
    }
  } else {
    const confirmText = prompt('【警告】切換回「開發測試模式」不會還原被刪除的資料。\n\n確認切換請輸入 "DEV"：')
    if (confirmText !== 'DEV') return

    try {
      await setDoc(doc(db, 'settings', 'system'), { mode: 'development' }, { merge: true })
      alert('已切換回開發測試模式。')
    } catch (e) {
      alert('切換失敗：' + e.message)
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
