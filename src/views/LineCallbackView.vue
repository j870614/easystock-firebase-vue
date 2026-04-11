<template>
  <!-- LINE OAuth callback 頁：靜默處理，完成後跳轉 -->
  <div class="min-h-dvh flex flex-col items-center justify-center gap-4">
    <div class="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    <p class="text-gray-500 text-lg">正在驗證 LINE 身份，請稍候…</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { httpsCallable } from 'firebase/functions'
import { signInWithCustomToken } from 'firebase/auth'
import { functions, auth } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  const params = new URLSearchParams(location.search)
  const code  = params.get('code')
  const state = params.get('state')
  const savedState = sessionStorage.getItem('line_oauth_state')

  // CSRF 驗證
  if (!code || state !== savedState) {
    ElMessage.error('LINE 登入失敗：無效的請求')
    router.replace('/login')
    return
  }

  sessionStorage.removeItem('line_oauth_state')

  try {
    // 呼叫 Cloud Function 換取 Firebase Custom Token
    const lineLogin = httpsCallable(functions, 'lineLogin')
    const { data } = await lineLogin({
      code,
      redirectUri: `${location.origin}/auth/line/callback`,
    })

    await signInWithCustomToken(auth, data.token)
    router.replace('/')
  } catch (e) {
    console.error(e)
    ElMessage.error('LINE 登入失敗，請重試')
    router.replace('/login')
  }
})
</script>
