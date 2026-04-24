<template>
  <div class="min-h-dvh bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex flex-col">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full" />
      <div class="absolute top-1/3 -left-20 w-48 h-48 bg-white/5 rounded-full" />
      <div class="absolute -bottom-20 right-10 w-60 h-60 bg-white/5 rounded-full" />
    </div>

    <div class="relative flex flex-col items-center pt-16 pb-8 px-6 text-center">
      <div class="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6">
        <span class="text-4xl">📱</span>
      </div>
      <h1 class="text-3xl font-bold text-white tracking-tight">驗證流程說明</h1>
      <p class="text-white/70 text-base mt-3 leading-relaxed max-w-sm">
        先把使用情境講清楚，避免上線後大家一頭霧水。
      </p>
    </div>

    <div class="relative flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-12 flex flex-col gap-4">
      <div class="rounded-2xl border border-gray-200 p-5 space-y-3">
        <h2 class="text-lg font-bold text-gray-800">自己的手機或平板</h2>
        <p class="text-sm text-gray-600 leading-relaxed">
          若你本來就是用自己的手機或平板登入，通常會直接叫起 Face ID、指紋或裝置密碼，不需要再掃 QR Code。
        </p>
      </div>

      <div class="rounded-2xl border border-gray-200 p-5 space-y-3">
        <h2 class="text-lg font-bold text-gray-800">共用電腦</h2>
        <p class="text-sm text-gray-600 leading-relaxed">
          若你是在共用電腦登入，系統可改用跨裝置 Passkey，必要時畫面會出現 QR Code，讓你拿自己的手機確認。
        </p>
      </div>

      <div class="bg-sky-50 border border-sky-200 rounded-2xl p-4">
        <p class="text-sm text-sky-800 leading-relaxed">
          下一步會把這個頁面接成真正的 WebAuthn 綁定與驗證入口，現在先完成登入後導流與資料欄位準備。
        </p>
      </div>

      <button class="btn-primary w-full text-lg" @click="backToSetup">
        返回綁定說明
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function backToSetup() {
  router.push('/passkey/setup')
}
</script>
