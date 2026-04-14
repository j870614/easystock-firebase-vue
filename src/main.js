// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './style.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhTw, size: 'large' })

  // 註冊所有 Element Plus 圖示
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  // 等待 Auth 狀態初始化完成
  const authStore = useAuthStore()
  await authStore.init()

  // 處理 LINE OAuth 在 Hash 模式下的中轉邏輯
  // 檢查真正的 URL Search Params (?code=...)
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has('code') && urlParams.has('state')) {
    const query = Object.fromEntries(urlParams.entries())
    // 清理 URL 的 Search 部分，防止重新整理重複觸發
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    // 透過 Router 轉向到驗證頁面
    router.replace({ name: 'line-callback', query })
  }

  app.mount('#app')
}

bootstrap()
