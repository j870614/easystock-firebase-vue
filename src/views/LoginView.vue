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
      <h1 class="text-4xl font-bold text-white tracking-tight">易存</h1>
      <p class="text-white/70 text-lg mt-1">VibeInventory 庫存管理</p>
    </div>

    <!-- 登入卡片 -->
    <div class="relative flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-12 flex flex-col gap-4">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">歡迎登入</h2>
      <p class="text-gray-500 mb-4 leading-relaxed">
        使用以下帳號登入系統，初次登入需等候管理員開通權限。
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

      <!-- LINE 登入 -->
      <button
        class="btn w-full text-lg text-white gap-3"
        style="background:#06C755; box-shadow: 0 8px 20px rgba(6,199,85,0.35);"
        :disabled="loading"
        @click="handleLine"
      >
        <svg class="w-6 h-6" viewBox="0 0 48 48" fill="none">
          <path d="M24 4C13 4 4 12.1 4 22.2c0 8.6 7.2 15.9 17 17.7.7.1 1.6.5 1.8 1.1.2.5.1 1.3 0 1.8l-.3 1.7c-.1.5-.4 2 1.8 1.1 2.2-.9 11.7-6.9 16-11.8C43.5 30 44 26.3 44 22.2 44 12.1 35 4 24 4z" fill="white"/>
          <path d="M36 26.5h-6.5c-.3 0-.5-.2-.5-.5v-9.5c0-.3.2-.5.5-.5s.5.2.5.5V25.5H36c.3 0 .5.2.5.5s-.2.5-.5.5z" fill="#06C755"/>
          <path d="M19.5 26.5c-.3 0-.5-.2-.5-.5V16.5c0-.3.2-.5.5-.5s.5.2.5.5V26c0 .3-.2.5-.5.5z" fill="#06C755"/>
          <path d="M27 26.5h-5c-.3 0-.5-.2-.5-.5V16.5c0-.3.2-.5.5-.5H27c.3 0 .5.2.5.5s-.2.5-.5.5h-4.5V21H27c.3 0 .5.2.5.5s-.2.5-.5.5h-4.5v3.5H27c.3 0 .5.2.5.5s-.2.5-.5.5z" fill="#06C755"/>
          <path d="M16.5 26.5c-.2 0-.4-.1-.4-.3l-5-9c-.1-.2 0-.5.2-.6.2-.1.5 0 .6.2v.1L17 26c.1.2 0 .5-.2.6-.1 0-.2.0-.3 0z" fill="#06C755"/>
          <path d="M11.5 26.5c-.3 0-.5-.2-.5-.5V16.5c0-.3.2-.5.5-.5s.5.2.5.5V26c0 .3-.2.5-.5.5z" fill="#06C755"/>
        </svg>
        <span>使用 LINE 帳號登入</span>
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
import { useRouter } from 'vue-router'
import { AlertCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const errorMsg = ref('')

async function handleGoogle() {
  errorMsg.value = ''
  loading.value = true
  try {
    await authStore.loginWithGoogle()
    router.push('/dashboard')
  } catch (e) {
    errorMsg.value = '登入失敗，請稍後再試。'
  } finally {
    loading.value = false
  }
}

function handleLine() {
  errorMsg.value = ''
  if (!import.meta.env.VITE_LINE_CHANNEL_ID) {
    errorMsg.value = 'LINE Login 尚未設定，請聯絡管理員。'
    return
  }
  authStore.loginWithLine()
}
</script>
