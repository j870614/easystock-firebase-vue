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
      <h1 class="text-3xl font-bold text-white tracking-tight">Passkey 驗證</h1>
      <p class="text-white/70 text-base mt-3 leading-relaxed max-w-sm">
        已綁定裝置走驗證；新裝置先申請加入，核准後才能綁定。
      </p>
    </div>

    <div class="relative flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-12 flex flex-col gap-4">
      <section class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
        <div>
          <h2 class="text-lg font-bold text-emerald-900">用已綁定 Passkey 驗證</h2>
          <p class="mt-1 text-sm text-emerald-800 leading-relaxed">
            適用已綁定的手機、電腦，或在共用電腦用已綁定手機跨裝置驗證。
          </p>
        </div>
        <button
          class="btn-primary w-full text-lg"
          :disabled="verifying || !supportsPasskey"
          @click="verifyPasskey"
        >
          {{ verifying ? '驗證中…' : '用已綁定 Passkey 驗證' }}
        </button>
      </section>

      <section class="rounded-2xl border border-sky-200 bg-sky-50 p-5 space-y-4">
        <div>
          <h2 class="text-lg font-bold text-sky-900">申請加入此裝置</h2>
          <p class="mt-1 text-sm text-sky-800 leading-relaxed">
            這台裝置尚未綁定時，先送 owner 核准；核准後再回來完成 Passkey 綁定。
          </p>
        </div>
        <button class="btn-ghost w-full border-2 border-sky-200 text-sky-700 text-base" @click="bindThisDevice">
          申請加入此裝置
        </button>
      </section>

      <div
        v-if="!supportsPasskey"
        class="bg-red-50 border border-red-200 rounded-2xl p-4"
      >
        <p class="text-sm text-red-700 leading-relaxed">
          目前裝置或瀏覽器不支援 Passkey。請改用較新的 Safari、Chrome 或 Edge。
        </p>
      </div>

      <div
        v-if="errorMsg"
        class="bg-red-50 border border-red-200 rounded-2xl p-4"
      >
        <p class="text-sm text-red-700 leading-relaxed">{{ errorMsg }}</p>
      </div>

      <button class="btn-ghost w-full border-2 border-gray-200 text-base" @click="backToSetup">
        返回 Passkey 設定
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  beginPasskeyAuthentication,
  browserSupportsPasskey,
  getPasskeyErrorMessage,
} from '@/services/passkey'

const router = useRouter()
const authStore = useAuthStore()
const verifying = ref(false)
const errorMsg = ref('')
const supportsPasskey = browserSupportsPasskey()

async function verifyPasskey() {
  verifying.value = true
  errorMsg.value = ''

  try {
    const result = await beginPasskeyAuthentication()
    if (!result?.verified) {
      throw new Error('Passkey 驗證失敗')
    }
    authStore.markPasskeyVerified()
    ElMessage.success('Passkey 驗證完成。')
    router.push('/')
  } catch (e) {
    errorMsg.value = getPasskeyErrorMessage(e)
  } finally {
    verifying.value = false
  }
}

function backToSetup() {
  router.push('/passkey/setup')
}

function bindThisDevice() {
  router.push({
    path: '/passkey/setup',
    query: { device: 'ownMobile' },
  })
}
</script>
