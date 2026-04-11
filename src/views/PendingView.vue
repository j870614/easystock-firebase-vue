<template>
  <div class="min-h-dvh bg-stock-bg flex flex-col items-center justify-center px-6 text-center">
    <div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
      <Clock class="w-10 h-10 text-amber-500" />
    </div>
    <h1 class="text-2xl font-bold text-gray-800 mb-3">帳號審核中</h1>
    <p class="text-gray-500 leading-relaxed mb-8">
      您的帳號已建立，<br />
      請等候系統管理員開通使用權限。<br />
      <span class="text-sm mt-2 inline-block">開通後請重新整理或重新登入。</span>
    </p>

    <div class="card w-full max-w-sm text-left mb-6">
      <div class="flex items-center gap-3">
        <img
          :src="authStore.user?.photoURL || ''"
          class="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"
          :alt="authStore.user?.displayName || '使用者'"
        />
        <div>
          <div class="font-semibold text-gray-800">{{ authStore.user?.displayName }}</div>
          <div class="text-sm text-gray-500">{{ authStore.user?.email }}</div>
          <span class="badge-role-pending mt-1">待審核</span>
        </div>
      </div>
    </div>

    <button class="btn-ghost" @click="authStore.signOut()">
      <LogOut class="w-5 h-5" /> 登出
    </button>
  </div>
</template>

<script setup>
import { Clock, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
</script>
