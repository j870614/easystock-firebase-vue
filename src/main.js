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

  // 初始化 Auth 狀態 (不要 await，讓 App 先 mount，進而顯示 App.vue 裡的 loading 畫面)
  const authStore = useAuthStore()
  authStore.init()

  app.mount('#app')
}

bootstrap()
