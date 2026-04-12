<template>
  <AppLayout title="系統設定" :show-location-picker="false">
    <div v-if="!authStore.isOwner" class="text-center py-20 text-gray-400">
      <p>無權限訪問</p>
    </div>
    <div v-else class="space-y-4">
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
  </AppLayout>
</template>

<script setup>
import { doc, getDocs, collection, writeBatch, setDoc } from 'firebase/firestore'
import { Settings, TestTube, CheckCircle, Check } from 'lucide-vue-next'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const appStore = useAppStore()

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
  // 分批刪除避免超過 500 筆限制
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
