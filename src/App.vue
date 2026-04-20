<template>
  <!-- 全域 Auth Loading 遮罩 -->
  <transition name="fade">
    <div
      v-if="authStore.loading"
      class="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500"
    >
      <!-- 背景裝飾圓形 -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full" />
        <div class="absolute top-1/3 -left-20 w-48 h-48 bg-white/5 rounded-full" />
        <div class="absolute -bottom-20 right-10 w-60 h-60 bg-white/5 rounded-full" />
      </div>

      <div class="relative flex flex-col items-center gap-6">
        <!-- Logo -->
        <div class="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl shadow-2xl flex items-center justify-center ring-2 ring-white/30">
          <span class="text-4xl">📦</span>
        </div>

        <!-- 品牌名稱 -->
        <div class="text-center">
          <p class="text-white font-bold text-xl tracking-wide">彌陀之家東林寺</p>
          <p class="text-white/60 text-sm mt-1">庫存管理系統</p>
        </div>

        <!-- Spinner -->
        <div class="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p class="text-white/70 text-sm animate-pulse">驗證身份中…</p>
      </div>
    </div>
  </transition>

  <!-- 頁面路由 -->
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>
