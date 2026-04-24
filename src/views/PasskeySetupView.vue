<template>
  <div class="min-h-dvh bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex flex-col">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full" />
      <div class="absolute top-1/3 -left-20 w-48 h-48 bg-white/5 rounded-full" />
      <div class="absolute -bottom-20 right-10 w-60 h-60 bg-white/5 rounded-full" />
    </div>

    <div class="relative flex flex-col items-center pt-16 pb-8 px-6 text-center">
      <div class="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6">
        <span class="text-4xl">🔐</span>
      </div>
      <h1 class="text-3xl font-bold text-white tracking-tight">綁定 Passkey</h1>
      <p class="text-white/70 text-base mt-3 leading-relaxed max-w-sm">
        共用電腦登入時，可改用你自己的手機驗證；若你現在就是用自己的手機或平板，通常可直接用 Face ID、指紋或裝置密碼完成。
      </p>
    </div>

    <div class="relative flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-12 flex flex-col gap-4">
      <div class="rounded-2xl border border-gray-200 p-5 space-y-3">
        <h2 class="text-lg font-bold text-gray-800">你之後會怎麼用</h2>
        <div class="text-sm text-gray-600 leading-relaxed space-y-2">
          <p>1. 用自己的手機登入：直接用 Face ID、指紋或裝置密碼。</p>
          <p>2. 用共用電腦登入：畫面可能出現 QR Code，再用你自己的手機確認。</p>
          <p>3. 綁定只需做一次，之後就不必每次重設。</p>
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 p-5 space-y-3">
        <label class="block text-sm font-semibold text-gray-700" for="deviceLabel">裝置名稱</label>
        <input
          id="deviceLabel"
          v-model.trim="deviceLabel"
          type="text"
          class="input"
          placeholder="例如：王小明的 iPhone"
        />
        <p class="text-xs text-gray-400">
          這個名稱只用來辨識你的 Passkey，例如未來要移除舊裝置時比較好分辨。
        </p>
      </div>

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

      <button
        class="btn-primary w-full text-lg"
        :disabled="saving || !supportsPasskey"
        @click="registerPasskey"
      >
        {{ saving ? '綁定中…' : '立即綁定 Passkey' }}
      </button>

      <button
        v-if="canSkip"
        class="btn-ghost w-full border-2 border-gray-200 text-base"
        :disabled="saving"
        @click="remindLater"
      >
        {{ saving ? '設定中…' : '14 天後再提醒我' }}
      </button>

      <button
        v-if="canSkip"
        class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        @click="backHome"
      >
        先回系統
      </button>

      <button class="text-sm text-brand-600 hover:text-brand-700 transition-colors" @click="goVerify">
        已經綁定過 Passkey？改走驗證流程
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  beginPasskeyRegistration,
  browserSupportsPasskey,
  getPasskeyErrorMessage,
} from '@/services/passkey'

const router = useRouter()
const authStore = useAuthStore()
const saving = ref(false)
const errorMsg = ref('')
const supportsPasskey = browserSupportsPasskey()
const deviceLabel = ref(authStore.user?.displayName ? `${authStore.user.displayName} 的裝置` : '')
const canSkip = computed(() => !authStore.isPasskeyEnrollmentRequired)

function goVerify() {
  router.push('/passkey/verify')
}

async function registerPasskey() {
  saving.value = true
  errorMsg.value = ''

  try {
    const result = await beginPasskeyRegistration(deviceLabel.value || '未命名裝置')
    if (!result?.verified) {
      throw new Error('Passkey 綁定失敗')
    }
    authStore.markPasskeyVerified()
    ElMessage.success('Passkey 綁定完成，之後可用手機或本機生物辨識快速驗證。')
    router.push('/')
  } catch (e) {
    errorMsg.value = getPasskeyErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remindLater() {
  saving.value = true
  errorMsg.value = ''
  try {
    await authStore.deferPasskeyEnrollment()
    ElMessage.success('已延後提醒，14 天後再提示你綁定 Passkey。')
    router.push('/')
  } catch (e) {
    ElMessage.error('設定提醒失敗，請稍後再試。')
  } finally {
    saving.value = false
  }
}

function backHome() {
  router.push('/')
}
</script>
