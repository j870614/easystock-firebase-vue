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
        <Link class="w-5 h-5 text-gray-400" /> 登入方式
      </h2>

      <!-- Google -->
      <div class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 mb-2">
        <div class="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
          <img src="https://www.google.com/favicon.ico" class="w-5 h-5" alt="Google" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-gray-800">Google</div>
          <div class="text-xs text-gray-400 truncate">{{ authStore.user?.email }}</div>
        </div>
        <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">已連結</span>
      </div>
    </div>

    <!-- 登出 -->
    <button class="btn-ghost w-full text-red-500 border-red-100" @click="handleLogout">
      <LogOut class="w-5 h-5" /> 登出
    </button>
  </AppLayout>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Link, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const ROLE_MAP = { owner: '系統總管', admin: '管理員', staff: '一般人員', pending: '待審核' }
const roleLabel = computed(() => ROLE_MAP[authStore.role] ?? authStore.role)

async function handleLogout() {
  await authStore.signOut()
  appStore.stop()
  router.push('/login')
}
</script>
