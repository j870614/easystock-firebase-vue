<template>
  <AppLayout title="我的帳號" :show-location-picker="false">
    <!-- 帳號資訊卡 -->
    <div class="card mb-4">
      <div class="flex items-center gap-4 mb-4">
        <img
          :src="authStore.user?.photoURL || ''"
          class="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0"
          :alt="authStore.user?.displayName"
        />
        <div class="flex-1 min-w-0">
          <div class="font-bold text-gray-800 text-lg truncate">
            <span v-if="authStore.profile?.dharmaName">{{ authStore.profile.dharmaName }}</span>
            <span v-else-if="authStore.profile?.secularName">{{ authStore.profile.secularName }}</span>
            <span v-else>{{ authStore.user?.displayName }}</span>
          </div>
          <div v-if="authStore.profile?.dharmaName && authStore.profile?.secularName" class="text-sm text-gray-500">
            {{ authStore.profile.secularName }}
          </div>
          <div v-if="authStore.profile?.dutyName" class="text-sm text-purple-600 mt-0.5">{{ authStore.profile.dutyName }}</div>
          <div class="text-sm text-gray-400 truncate mt-0.5">{{ authStore.user?.email }}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span :class="`badge-role-${authStore.role}`">{{ roleLabel }}</span>
      </div>
    </div>

    <!-- 登入方式 -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Link class="w-5 h-5 text-gray-400" /> 登入方式連結
      </h2>

      <!-- Google -->
      <div class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 mb-2">
        <div class="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
          <img src="https://www.google.com/favicon.ico" class="w-5 h-5" alt="Google" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-gray-800">Google</div>
          <div class="text-xs text-gray-400 truncate">{{ googleEmail || '未連結' }}</div>
        </div>
        <span v-if="isGoogleLinked" class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">已連結</span>
        <button
          v-else
          class="text-xs bg-brand-50 text-brand-600 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0"
          :disabled="linking"
          @click="handleLinkGoogle"
        >
          {{ linking === 'google' ? '連結中...' : '連結' }}
        </button>
      </div>

      <!-- LINE -->
      <div class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
        <div class="w-9 h-9 rounded-full bg-[#06C755] flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.03 2 11c0 4.52 3.23 8.3 7.67 9.38.56.1.76-.24.76-.54 0-.27-.01-1.16-.01-2.1-3.12.68-3.78-1.5-3.78-1.5-.51-1.29-1.24-1.63-1.24-1.63-1.02-.7.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 1.71 2.62 1.22 3.26.93.1-.72.39-1.22.71-1.5-2.49-.28-5.11-1.24-5.11-5.53 0-1.22.44-2.22 1.15-3-.11-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15A10.7 10.7 0 0 1 12 7.43c.95 0 1.91.13 2.8.38 2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.22 2.68.11 2.96.71.78 1.15 1.78 1.15 3 0 4.3-2.63 5.25-5.13 5.52.4.35.76 1.04.76 2.09 0 1.51-.01 2.72-.01 3.09 0 .3.2.65.77.54C18.77 19.3 22 15.52 22 11c0-4.97-4.48-9-10-9z"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-gray-800">LINE</div>
          <div class="text-xs text-gray-400">{{ isLineLinked ? '已連結' : '未連結' }}</div>
        </div>
        <span v-if="isLineLinked" class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">已連結</span>
        <button
          v-else
          class="text-xs bg-[#06C755]/10 text-[#06C755] hover:bg-[#06C755]/20 px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0"
          :disabled="linking"
          @click="handleLinkLine"
        >
          {{ linking === 'line' ? '跳轉中...' : '連結' }}
        </button>
      </div>

      <p class="text-xs text-gray-400 mt-3 leading-relaxed">連結後，兩種登入方式都可以存取同一個帳號，不需重新審核。</p>
    </div>

    <!-- 登出 -->
    <button class="btn-ghost w-full text-red-500 border-red-100" @click="handleLogout">
      <LogOut class="w-5 h-5" /> 登出
    </button>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Link, LogOut } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const linking = ref(null) // 'google' | 'line' | null

const ROLE_MAP = { owner: '系統總管', admin: '管理員', staff: '一般人員', pending: '待審核' }
const roleLabel = computed(() => ROLE_MAP[authStore.role] ?? authStore.role)

// 判斷 Google 連結狀態
const isGoogleLinked = computed(() => {
  // 如果 uid 不是 line: 開頭，表示是 Google 帳號
  const uid = authStore.user?.uid || ''
  return !uid.startsWith('line:') || !!authStore.profile?.googleUid
})
const googleEmail = computed(() => {
  if (!authStore.user?.uid?.startsWith('line:')) return authStore.user?.email
  return authStore.profile?.googleEmail || null
})

// 判斷 LINE 連結狀態
const isLineLinked = computed(() => {
  return !!authStore.profile?.lineUid
})

async function handleLinkGoogle() {
  linking.value = 'google'
  try {
    await authStore.linkGoogle()
    ElMessage.success('Google 帳號已成功連結！')
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      ElMessage.error('連結失敗：' + (e.message || '請稍後再試'))
    }
  } finally {
    linking.value = null
  }
}

function handleLinkLine() {
  linking.value = 'line'
  authStore.loginWithLine('link')
}

async function handleLogout() {
  await authStore.signOut()
  appStore.stop()
  router.push('/login')
}
</script>
