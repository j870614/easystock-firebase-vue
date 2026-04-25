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
        第一組 Passkey 可直接綁定；新增第二組以上裝置，需先送系統總管核准。
      </p>
    </div>

    <div class="relative flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-12 flex flex-col gap-4">
      <div class="rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 class="text-lg font-bold text-gray-800">這台裝置</h2>
        <div class="grid gap-3">
          <button
            v-for="option in deviceOptions"
            :key="option.value"
            class="w-full rounded-2xl border-2 px-4 py-4 text-left transition-all"
            :class="deviceType === option.value
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
            @click="selectDeviceType(option.value)"
          >
            <div class="font-semibold">{{ option.title }}</div>
            <div class="mt-1 text-sm leading-relaxed text-gray-500">{{ option.description }}</div>
          </button>
        </div>
      </div>

      <div
        v-if="deviceType === 'sharedComputer'"
        class="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3"
      >
        <h2 class="text-lg font-bold text-red-800">請不要把 Passkey 儲存在共用電腦</h2>
        <p class="text-sm leading-relaxed text-red-700">
          共用電腦請改用「已綁定 Passkey 驗證」。請先用自己的手機或裝置完成綁定，再回共用電腦驗證登入。
        </p>
      </div>

      <div class="rounded-2xl border border-gray-200 p-5 space-y-3">
        <label class="block text-sm font-semibold text-gray-700" for="deviceLabel">裝置名稱</label>
        <input
          id="deviceLabel"
          v-model.trim="deviceLabel"
          type="text"
          class="input"
          placeholder="例如：普中的 iPhone"
        />
        <p class="text-xs text-gray-400">
          預設用法名 / 俗名加裝置類型。系統總管會用這個名稱判斷是否核准。
        </p>
      </div>

      <div
        v-if="authStore.hasPasskey"
        class="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3"
      >
        <h2 class="text-lg font-bold text-amber-900">新增裝置需核准</h2>
        <p class="text-sm leading-relaxed text-amber-800">
          你的帳號已經有 Passkey。這台新裝置送出申請後，系統總管核准才會開放綁定。
        </p>
        <div v-if="latestRequest" class="rounded-xl bg-white/80 border border-amber-100 p-3 text-sm">
          <div class="font-semibold text-gray-800">{{ latestRequest.deviceLabel }}</div>
          <div class="mt-1 text-gray-500">狀態：{{ requestStatusLabel(latestRequest.status) }}</div>
        </div>
        <button
          v-if="pendingRequest"
          class="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          :disabled="saving || checkingRequests"
          @click="refreshOwnRequests"
        >
          {{ checkingRequests ? '檢查中…' : '重新檢查審核狀態' }}
        </button>
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
        v-if="canRegisterNow"
        class="btn-primary w-full text-lg"
        :disabled="saving || !supportsPasskey"
        @click="registerPasskey"
      >
        {{ saving ? '綁定中…' : approvedRequest ? '已核准，開始綁定 Passkey' : '立即綁定 Passkey' }}
      </button>

      <button
        v-else
        class="btn-primary w-full text-lg"
        :disabled="saving || !deviceLabel"
        @click="requestDeviceApproval"
      >
        {{ saving ? '送出中…' : pendingRequest ? '重新送出申請' : '申請加入此裝置' }}
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
        class="btn-ghost w-full border-2 border-gray-200 text-base"
        @click="goVerify"
      >
        用已綁定 Passkey 驗證
      </button>

      <button
        v-if="canSkip"
        class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        @click="backHome"
      >
        先回系統
      </button>
    </div>

    <el-dialog
      v-model="sharedDeviceDialog"
      title="請改用自己的手機綁定 Passkey"
      width="92%"
      align-center
    >
      <div class="space-y-4 text-center">
        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
          <h2 class="font-bold text-amber-900">共用電腦不建議儲存 Passkey</h2>
          <p class="mt-2 text-sm leading-relaxed text-amber-800">
            請用自己的手機或個人裝置掃描 QR code 登入，進入 Passkey 設定並完成綁定。完成後再回到共用電腦，按「用已綁定 Passkey 驗證」。
          </p>
        </div>

        <div class="mx-auto flex w-fit rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="手機登入 QR code" class="h-56 w-56" />
          <div v-else class="flex h-56 w-56 items-center justify-center text-sm text-gray-400">
            QR code 產生中...
          </div>
        </div>

        <div class="break-all rounded-2xl bg-gray-50 p-3 text-left text-xs text-gray-500">
          {{ qrTargetUrl }}
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <button class="btn-ghost border-2 border-gray-200" @click="copyQrTarget">
            複製連結
          </button>
          <button class="btn-primary" @click="goVerify">
            用已綁定 Passkey 驗證
          </button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs, onSnapshot } from 'firebase/firestore'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import {
  beginPasskeyRegistration,
  browserSupportsPasskey,
  createPasskeyDeviceRequest,
  getPasskeyErrorMessage,
} from '@/services/passkey'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const saving = ref(false)
const checkingRequests = ref(false)
const errorMsg = ref('')
const ownRequests = ref([])
const sharedDeviceDialog = ref(false)
const qrCodeUrl = ref('')
const qrTargetUrl = ref('')
const supportsPasskey = browserSupportsPasskey()
const canSkip = computed(() => !authStore.isPasskeyEnrollmentRequired)
const initialDeviceType = ['ownMobile', 'ownComputer', 'sharedComputer'].includes(String(route.query.device ?? ''))
  ? String(route.query.device)
  : detectDeviceType()
const deviceType = ref(initialDeviceType)
const deviceLabel = ref(buildDefaultDeviceLabel(deviceType.value))
const deviceOptions = [
  {
    value: 'ownMobile',
    title: '自己的手機 / 平板',
    description: '建議路徑。用 Face ID、指紋或裝置密碼完成。',
  },
  {
    value: 'ownComputer',
    title: '自己的電腦',
    description: '可綁定，但請確認不是多人共用設備。',
  },
  {
    value: 'sharedComputer',
    title: '共用電腦',
    description: '不建議儲存 Passkey；請改用自己的手機或裝置綁定。',
  },
]

const latestRequest = computed(() => ownRequests.value[0] ?? null)
const pendingRequest = computed(() => ownRequests.value.find((item) => item.status === 'pending'))
const approvedRequest = computed(() => {
  const queryRequestId = String(route.query.requestId ?? '')
  return ownRequests.value.find((item) => item.status === 'approved' && item.id === queryRequestId) ||
    ownRequests.value.find((item) => item.status === 'approved')
})
const canRegisterNow = computed(() => !authStore.hasPasskey || !!approvedRequest.value)

let unsubscribeRequests = null
let requestPollTimer = null
watch(
  () => authStore.user?.uid,
  (uid) => {
    if (unsubscribeRequests) unsubscribeRequests()
    ownRequests.value = []
    if (!uid) return

    unsubscribeRequests = onSnapshot(
      collection(db, 'users', uid, 'passkeyDeviceRequests'),
      (snap) => {
        applyOwnRequestDocs(snap.docs)
      }
    )
  },
  { immediate: true }
)

watch(
  () => pendingRequest.value?.id,
  (requestId) => {
    stopRequestPolling()
    if (!requestId) return

    requestPollTimer = window.setInterval(refreshOwnRequests, 5000)
  },
  { immediate: true }
)

watch(
  () => approvedRequest.value?.id,
  (requestId) => {
    if (!requestId) return
    stopRequestPolling()
    ElMessage.success('裝置申請已核准，請點「開始綁定 Passkey」。')
  }
)

watch(
  deviceType,
  (value) => {
    if (value === 'sharedComputer') {
      openSharedDeviceGuide()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (unsubscribeRequests) unsubscribeRequests()
  stopRequestPolling()
})

function detectDeviceType() {
  if (typeof navigator === 'undefined') return 'ownMobile'
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ownMobile' : 'ownComputer'
}

function getDeviceTypeLabel(value) {
  if (value === 'ownComputer') return detectDesktopName()
  if (value === 'sharedComputer') return '共用電腦'
  return detectMobileName()
}

function detectMobileName() {
  if (typeof navigator === 'undefined') return '手機'
  const ua = navigator.userAgent
  if (/iPad/i.test(ua)) return 'iPad'
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/Android/i.test(ua)) return 'Android 手機'
  return '手機'
}

function detectDesktopName() {
  if (typeof navigator === 'undefined') return '電腦'
  const ua = navigator.userAgent
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac'
  if (/Windows/i.test(ua)) return 'Windows 電腦'
  return '電腦'
}

function getPersonName() {
  const profile = authStore.profile ?? {}
  return profile.dharmaName || profile.secularName || authStore.user?.displayName || '我'
}

function buildDefaultDeviceLabel(type) {
  return `${getPersonName()}的 ${getDeviceTypeLabel(type)}`
}

function selectDeviceType(value) {
  deviceType.value = value
  deviceLabel.value = buildDefaultDeviceLabel(value)
  errorMsg.value = ''
}

function buildOwnDeviceSetupUrl() {
  const current = new URL(window.location.href)
  const baseOrigin = ['localhost', '127.0.0.1'].includes(current.hostname)
    ? 'https://stock.donglinsys.org'
    : current.origin
  const url = new URL('/login', baseOrigin)
  url.searchParams.set('next', '/passkey/setup?device=ownMobile')
  return url.toString()
}

async function openSharedDeviceGuide() {
  if (qrTargetUrl.value) {
    sharedDeviceDialog.value = true
    return
  }

  qrTargetUrl.value = buildOwnDeviceSetupUrl()
  sharedDeviceDialog.value = true
  try {
    qrCodeUrl.value = await QRCode.toDataURL(qrTargetUrl.value, {
      width: 256,
      margin: 1,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
  } catch {
    errorMsg.value = 'QR code 產生失敗，請直接複製連結到自己的手機開啟。'
  }
}

async function copyQrTarget() {
  try {
    await navigator.clipboard.writeText(qrTargetUrl.value)
    ElMessage.success('已複製連結。')
  } catch {
    ElMessage.error('複製失敗，請手動選取連結。')
  }
}

function requestStatusLabel(status) {
  return {
    pending: '待系統總管核准',
    approved: '已核准，可綁定',
    rejected: '已拒絕',
    used: '已完成綁定',
  }[status] ?? status
}

function toMillis(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  return new Date(value).getTime()
}

function applyOwnRequestDocs(docs) {
  ownRequests.value = docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
}

function stopRequestPolling() {
  if (!requestPollTimer) return
  window.clearInterval(requestPollTimer)
  requestPollTimer = null
}

async function refreshOwnRequests() {
  if (!authStore.user?.uid || checkingRequests.value) return

  checkingRequests.value = true
  try {
    const snap = await getDocs(collection(db, 'users', authStore.user.uid, 'passkeyDeviceRequests'))
    applyOwnRequestDocs(snap.docs)
  } catch (e) {
    errorMsg.value = getPasskeyErrorMessage(e)
  } finally {
    checkingRequests.value = false
  }
}

function goVerify() {
  router.push('/passkey/verify')
}

async function requestDeviceApproval() {
  saving.value = true
  errorMsg.value = ''

  try {
    const result = await createPasskeyDeviceRequest(deviceLabel.value, deviceType.value)
    if (result?.directEligible) {
      await registerPasskey()
      return
    }
    if (result?.requestId) {
      router.replace({
        query: {
          ...route.query,
          requestId: result.requestId,
        },
      })
      await refreshOwnRequests()
    }
    ElMessage.success('已送出裝置申請，請等待系統總管核准。')
  } catch (e) {
    errorMsg.value = getPasskeyErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function registerPasskey() {
  saving.value = true
  errorMsg.value = ''

  try {
    const result = await beginPasskeyRegistration(deviceLabel.value, approvedRequest.value?.id ?? null)
    if (!result?.verified) {
      throw new Error('Passkey 綁定失敗')
    }
    authStore.markPasskeyVerified()
    ElMessage.success('Passkey 綁定完成。')
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
