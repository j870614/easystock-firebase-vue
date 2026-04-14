<template>
  <!-- LINE OAuth callback 頁：靜默處理，完成後跳轉 -->
  <div class="min-h-dvh flex flex-col items-center justify-center gap-4">
    <div class="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    <p class="text-gray-500 text-lg">正在驗證 LINE 身份，請稍候…</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { httpsCallable } from 'firebase/functions'
import { signInWithCustomToken } from 'firebase/auth'
import { functions, auth } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  let code  = route.query.code
  let state = route.query.state
  
  if (!code || !state) {
    // Fallback: 如果 vue-router 尚未準備好，直接從 URL 讀取
    const hashStr = window.location.hash
    const queryStr = hashStr.split('?')[1] || ''
    const fallbackParams = new URLSearchParams(queryStr)
    code = code || fallbackParams.get('code')
    state = state || fallbackParams.get('state')
  }

  const savedState = localStorage.getItem('line_oauth_state')
  let action = localStorage.getItem('line_oauth_action')
  
  // 智慧判定：如果 action 遺失 (Safari 狀況)，但目前明明是登入狀態，那高機率是要「連結」
  if (!action && authStore.isAuthenticated) {
    action = 'link'
  } else if (!action) {
    action = 'login'
  }

  // 優先從目前登入狀態拿 uid，這在 Safari 私密瀏覽下最準確
  const linkUid = authStore.user?.uid || localStorage.getItem('line_link_uid')

  // CSRF 驗證
  if (!code || state !== savedState) {
    ElMessage.error('LINE 驗證失敗：無效的請求，請重新嘗試')
    router.replace('/login')
    return
  }

  localStorage.removeItem('line_oauth_state')
  localStorage.removeItem('line_oauth_action')
  localStorage.removeItem('line_link_uid')

  try {
    if (action === 'link') {
      // 帳號連結模式：呼叫 linkLine CF，將 LINE 綁定至現有帳號
      const linkLineFn = httpsCallable(functions, 'linkLine')
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '')
      const redirectUri = `${window.location.origin}${baseUrl}/`

      const { data } = await linkLineFn({
        code,
        redirectUri,
        currentUid: linkUid,
      })

      if (data?.success) {
        ElMessage.success('LINE 帳號已成功連結！')
        // 等待 Firebase Realtime 更新（通常 500-1000ms）
        await new Promise(resolve => setTimeout(resolve, 800))
        router.replace('/profile')
      } else {
        throw new Error(data?.message || '後端回傳連結失敗')
      }
    } else {
      // 一般登入模式
      const lineLoginFn = httpsCallable(functions, 'lineLogin')
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '')
      const redirectUri = `${window.location.origin}${baseUrl}/`

      const { data } = await lineLoginFn({
        code,
        redirectUri,
      })
      await signInWithCustomToken(auth, data.token)
      router.replace('/')
    }
  } catch (e) {
    console.error(e)
    if (action === 'link') {
      ElMessage.error('LINE 連結失敗，請重試')
      router.replace('/profile')
    } else {
      ElMessage.error('LINE 登入失敗：' + (e.message || '請確認 LINE 帳號是否正確'))
      router.replace('/login')
    }
  }
})
</script>
