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

    <!-- 字體大小 -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-3 flex items-center gap-2" :style="{ fontSize: 'var(--fs-main)' }">
        <ALargeSmall class="w-5 h-5 text-gray-400" /> 字體大小
      </h2>
      <div class="flex items-center gap-3">
        <button
          class="flex-1 py-3 rounded-xl border-2 font-bold transition-all select-none"
          :class="appStore.fontScale === 0
            ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'
            : 'border-gray-200 bg-white text-gray-700 hover:border-brand-400 active:scale-95'"
          :disabled="appStore.fontScale === 0"
          @click="appStore.updateFontScale(appStore.fontScale - 1)"
        >
          <span :style="{ fontSize: 'var(--fs-main)' }">A<sup>-</sup></span>
        </button>
        <div class="flex gap-1.5">
          <span
            v-for="i in [0, 1, 2]"
            :key="i"
            class="block w-2 h-2 rounded-full transition-all duration-300"
            :class="appStore.fontScale === i ? 'bg-brand-600 scale-125' : 'bg-gray-200'"
          />
        </div>
        <button
          class="flex-1 py-3 rounded-xl border-2 font-bold transition-all select-none"
          :class="appStore.fontScale === 2
            ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'
            : 'border-gray-200 bg-white text-gray-700 hover:border-brand-400 active:scale-95'"
          :disabled="appStore.fontScale === 2"
          @click="appStore.updateFontScale(appStore.fontScale + 1)"
        >
          <span :style="{ fontSize: 'var(--fs-main)' }">A<sup>+</sup></span>
        </button>
      </div>
      <p class="text-center text-gray-400 mt-2" :style="{ fontSize: 'var(--fs-main)' }">{{ ['小', '預設', '大'][appStore.fontScale] }}</p>
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

    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Shield class="w-5 h-5 text-gray-400" /> Passkey 驗證
      </h2>

      <div
        class="rounded-2xl border p-4"
        :class="authStore.hasPasskey ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold" :class="authStore.hasPasskey ? 'text-emerald-800' : 'text-amber-800'">
              {{ authStore.hasPasskey ? '已綁定 Passkey' : '尚未綁定 Passkey' }}
            </p>
            <p class="mt-1 text-sm leading-relaxed" :class="authStore.hasPasskey ? 'text-emerald-700/90' : 'text-amber-800/90'">
              {{ authStore.hasPasskey
                ? '之後可直接用自己的手機、平板或本機生物辨識完成驗證。'
                : '建議先綁定，尤其在共用電腦登入時可改用自己的手機驗證。' }}
            </p>
          </div>
          <span
            class="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
            :class="authStore.hasPasskey ? 'bg-white text-emerald-700 border border-emerald-200' : 'bg-white text-amber-700 border border-amber-200'"
          >
            {{ authStore.hasPasskey ? '已啟用' : '待設定' }}
          </span>
        </div>

        <div class="mt-4 flex gap-2">
          <button class="btn-primary flex-1" @click="router.push('/passkey/setup')">
            {{ authStore.hasPasskey ? '新增或重綁 Passkey' : '立即綁定' }}
          </button>
          <button
            v-if="authStore.hasPasskey"
            class="btn-ghost flex-1 border border-gray-200"
            @click="router.push('/passkey/verify')"
          >
            立即驗證
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Link, ALargeSmall, Shield } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'
import { ROLE_MAP } from '@/utils/multiDept'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const roleLabel = computed(() => ROLE_MAP[authStore.role] ?? authStore.role)
</script>
