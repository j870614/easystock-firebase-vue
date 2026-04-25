<template>
  <div class="min-h-dvh bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex flex-col">
    <!-- 背景裝飾圓形 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full" />
      <div class="absolute top-1/3 -left-20 w-48 h-48 bg-white/5 rounded-full" />
      <div class="absolute -bottom-20 right-10 w-60 h-60 bg-white/5 rounded-full" />
    </div>

    <!-- Logo & 標題區 -->
    <div class="relative flex flex-col items-center pt-20 pb-10 px-6">
      <div class="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6">
        <span class="text-5xl">📦</span>
      </div>
      <h1 class="text-4xl font-bold text-white tracking-tight">彌陀之家東林寺</h1>
      <p class="text-white/70 text-lg mt-1">庫存管理系統</p>
    </div>

    <!-- 登入卡片 -->
    <div class="relative flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-12 flex flex-col gap-4">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">歡迎登入</h2>
      <p class="text-gray-500 mb-4 leading-relaxed">
        使用以下帳號登入系統，初次登入需等候管理員開通權限。
        後續將逐步導入 Passkey 驗證，提升共用裝置使用安全。
      </p>

      <!-- Google 登入 -->
      <button
        class="btn-ghost w-full text-lg gap-3 border-2"
        :disabled="loading"
        @click="handleGoogle"
      >
        <img
          src="https://www.svgrepo.com/show/475656/google-color.svg"
          class="w-6 h-6"
          alt="Google"
        />
        <span>使用 Google 帳號登入</span>
      </button>

      <!-- 錯誤訊息 -->
      <transition name="slide-up">
        <div
          v-if="errorMsg"
          class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
        >
          <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p class="text-red-700 text-sm leading-relaxed">{{ errorMsg }}</p>
        </div>
      </transition>

      <!-- 說明文字 -->
      <p class="text-center text-gray-400 text-sm mt-4 leading-relaxed">
        本系統僅限內部人員使用<br />
        如需開通帳號請聯絡系統管理員
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)
const errorMsg = ref('')

async function handleGoogle() {
  errorMsg.value = ''
  loading.value = true
  try {
    await authStore.loginWithGoogle()
    router.push(getNextRoute() ?? authStore.getPostLoginRoute())
  } catch (e) {
    errorMsg.value = '登入失敗，請稍後再試。'
  } finally {
    loading.value = false
  }
}

function getNextRoute() {
  const next = route.query.next
  if (typeof next !== 'string') return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  return next
}
</script>
