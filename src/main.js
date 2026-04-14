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
  // 處理 LINE OAuth 在 Hash 模式下的中轉邏輯
  // LINE 導向首頁帶來的 ?code=xxx 會被轉給 #/auth/line/callback
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has('code') && urlParams.has('state')) {
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '')
    // 轉向到 Hash 路由，並移除原本的 search params 避免重複觸發
    window.location.replace(`${window.location.origin}${baseUrl}/#/auth/line/callback?code=${code}&state=${state}`)
    return // 停止執行後續，等待重新導向
  }

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhTw, size: 'large' })

  // 註冊所有 Element Plus 圖示
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  // 等待 Auth 狀態初始化完成，再掛載 App
  // 這樣 router guard 就不會在 loading 狀態下做錯誤的跳轉
  const authStore = useAuthStore()
  await authStore.init()

  app.mount('#app')
}

bootstrap()
