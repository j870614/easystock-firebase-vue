<template>
  <div class="min-h-dvh transition-colors duration-300" :class="appStore.isReplenishMode ? 'bg-green-50' : 'bg-stock-bg'" :data-fs="appStore.fontScale">
    <!-- 頂部導航 -->
    <header class="top-nav" :class="appStore.isReplenishMode ? 'bg-green-100 shadow-green-200/50' : ''">
      <div class="flex items-center gap-3 flex-1 w-full max-w-[960px] mx-auto">
        <!-- 左側：返回或漢堡 -->
        <div class="flex-shrink-0 w-10">
        <slot name="header-left">
          <button
            v-if="showBack"
            class="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            @click="$router.back()"
          >
            <ChevronLeft class="w-6 h-6 text-gray-600" />
          </button>
        </slot>
      </div>

      <!-- 標題 -->
      <h1 class="text-lg font-bold text-gray-800 flex-1 min-w-0 truncate text-center">
        {{ title }}
      </h1>

      <!-- 右側：道場選擇器與登出 -->
      <div class="flex-none flex items-center gap-2 justify-end">
        <slot name="header-right">
          <button
            v-if="showLocationPicker && appStore.activeLocations.length > 0"
            class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors bg-gray-100 text-gray-700 flex-shrink-0"
            :class="{ 'bg-brand-50 text-brand-700': authStore.isOwner }"
            @click="authStore.isOwner && (showLocationDialog = true)"
          >
            <MapPin class="w-4 h-4 flex-shrink-0" />
            <span class="max-w-[80px] truncate">
              {{ appStore.selectedLocation?.name ?? '選擇道場' }}
            </span>
            <ChevronDown v-if="authStore.isOwner" class="w-3 h-3 flex-shrink-0" />
          </button>
          
          <router-link
            to="/profile"
            class="flex flex-shrink-0 w-9 h-9 items-center justify-center rounded-full hover:ring-2 hover:ring-brand-300 transition-all bg-gray-200 overflow-hidden"
          >
            <img
              v-if="authStore.user?.photoURL"
              :src="authStore.user.photoURL"
              class="block w-full h-full object-cover"
              :alt="authStore.user.displayName"
            />
            <User v-else class="w-5 h-5 flex-shrink-0 text-gray-500" />
          </router-link>
        </slot>
      </div>
      </div>
    </header>

    <!-- 主內容 -->
    <main class="page-content px-4 py-4">
      <div class="max-w-[960px] mx-auto">
        <slot />
      </div>
    </main>

    <!-- 底部導航 -->
    <nav class="bottom-nav">
      <div
        class="w-full max-w-[960px] mx-auto grid h-full"
        :style="{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }"
      >
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="bottom-nav-item"
          :class="{ active: isNavActive(item.to) }"
        >
          <component :is="item.icon" class="w-6 h-6" />
          <span class="text-xs">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>

    <!-- 道場選擇 Dialog -->
    <el-dialog
      v-model="showLocationDialog"
      title="選擇道場"
      :fullscreen="false"
      width="90%"
      align-center
    >
      <div class="flex flex-col gap-2">
        <button
          v-for="loc in appStore.activeLocations"
          :key="loc.id"
          class="w-full text-left px-4 py-4 rounded-xl border-2 transition-all font-medium"
          :class="
            appStore.selectedLocationId === loc.id
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          "
          @click="selectAndClose(loc.id)"
        >
          <div class="flex items-center gap-3">
            <Store class="w-5 h-5 flex-shrink-0" />
            <div>
              <div class="font-semibold">{{ loc.name }}</div>
              <div v-if="loc.address" class="text-sm text-gray-500">{{ loc.address }}</div>
            </div>
            <Check
              v-if="appStore.selectedLocationId === loc.id"
              class="w-5 h-5 ml-auto text-brand-600"
            />
          </div>
        </button>
      </div>
      
      <!-- 新增：管理入口 -->
      <div v-if="authStore.isOwner" class="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2">
        <button 
          class="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
          @click="showLocationDialog = false; $router.push('/locations')"
        >
          <Building2 class="w-5 h-5" />
          <span>管理道場設定</span>
        </button>
        <button 
          class="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
          @click="showLocationDialog = false; $router.push('/settings')"
        >
          <Settings class="w-5 h-5" />
          <span>系統環境管理</span>
        </button>
      </div>
    </el-dialog>

    <!-- 地理鎖定遮罩 -->
    <div v-if="isLocationLocked" class="fixed inset-0 bg-white/95 z-[9999] flex flex-col items-center justify-center p-6 text-center">
      <MapPin class="w-20 h-20 text-red-500 mb-6 animate-bounce" />
      <h2 class="text-2xl font-bold text-gray-800 mb-3">不在道場範圍內</h2>
      <p class="text-gray-500 mb-8 leading-relaxed">
        系統偵測到您目前的位置不在「{{ appStore.selectedLocation?.name }}」的設定範圍內 (距離約超過 200 公尺)。<br><br>
        請確認：<br>
        1. 您的電話已開啟「定位服務」<br>
        2. 瀏覽器有允許存取定位權限<br>
        3. 您確實位於道場範圍內
      </p>
      <div class="flex flex-col w-full max-w-[250px] gap-3">
        <button class="btn-primary w-full py-4 text-lg" @click="checkGeofence">
          重新定位驗證
        </button>
        <button class="btn-ghost w-full py-3 text-red-500 border-red-100" @click="handleLogout">
          切換帳號退出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChevronLeft, ChevronDown, MapPin, Check,
  LayoutDashboard, ArrowLeftRight, History,
  Package, Building2, FileBarChart2, Users, LogOut, Settings, MapPinOff, Store, LayoutGrid, User
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const props = defineProps({
  title: { type: String, default: '彌陀之家東林寺庫存管理系統' },
  showBack: { type: Boolean, default: false },
  showLocationPicker: { type: Boolean, default: true },
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const showLocationDialog = ref(false)
const isLocationLocked = ref(false)
let geofenceInterval = null

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const deltaP = p2 - p1;
  const deltaLon = lon2 - lon1;
  const deltaLambda = (deltaLon * Math.PI) / 180;
  const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function checkGeofence() {
  if (authStore.isAdmin) {
    isLocationLocked.value = false
    return
  }
  
  const loc = appStore.selectedLocation
  if (!loc || !loc.lat || !loc.lng) {
    isLocationLocked.value = false
    return
  }

  if (!navigator.geolocation) {
    alert('您的裝置不支援地理位置功能，無法驗證。')
    isLocationLocked.value = true
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude
      const userLng = position.coords.longitude
      const distance = getDistanceFromLatLonInM(loc.lat, loc.lng, userLat, userLng)
      
      if (distance > 200) {
        isLocationLocked.value = true
      } else {
        isLocationLocked.value = false
      }
    },
    (err) => {
      isLocationLocked.value = true
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

watch(() => appStore.selectedLocationId, checkGeofence)

function selectAndClose(id) {
  appStore.selectLocation(id)
  showLocationDialog.value = false
}

async function handleLogout() {
  await authStore.signOut()
  appStore.stop()
  router.push('/login')
}

// ── 閒置自動登出 ──────────────────────────────────────
let idleTimer = null
const IDLE_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click']
let lastActivityTime = Date.now()

function resetIdleTimer() {
  lastActivityTime = Date.now()
  if (!appStore.idleTimeout || appStore.idleTimeout <= 0) return
  
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(async () => {
    // 檢查最後一次活動時間
    const now = Date.now()
    const diff = now - lastActivityTime
    const limit = appStore.idleTimeout * 60 * 1000
    
    // 確保真的超過時間且使用者已登入
    if (diff >= limit && authStore.isAuthenticated) {
      console.log('[IdleTimeout] User idle, signing out...')
      await authStore.signOut()
      appStore.stop()
      router.push('/login')
    } else if (authStore.isAuthenticated) {
      // 若因某些原因未達時間，重新設定剩餘時間的 Timer
      resetIdleTimer()
    }
  }, appStore.idleTimeout * 60 * 1000)
}

function startIdleTimer() {
  if (!authStore.isAuthenticated || appStore.idleTimeout <= 0) return
  IDLE_EVENTS.forEach(evt => window.addEventListener(evt, resetIdleTimer, { passive: true }))
  resetIdleTimer()
}

function stopIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  IDLE_EVENTS.forEach(evt => window.removeEventListener(evt, resetIdleTimer))
}

// 當設定值或登入狀態變化時，重新啟動偵測器
watch(() => appStore.idleTimeout, () => {
  stopIdleTimer()
  startIdleTimer()
})

watch(() => authStore.isAuthenticated, (val) => {
  if (val) {
    startIdleTimer()
  } else {
    stopIdleTimer()
    // 跨分頁同步：若另一分頁登出，此分頁也應跳轉
    if (route.path !== '/login' && route.path !== '/pending') {
      router.push('/login')
    }
  }
}, { immediate: true })

onMounted(() => {
  appStore.init()
  appStore.applyFontScale()
  setTimeout(checkGeofence, 1500)
  geofenceInterval = setInterval(checkGeofence, 3 * 60 * 1000)
  startIdleTimer()
})
onUnmounted(() => {
  if (geofenceInterval) clearInterval(geofenceInterval)
  stopIdleTimer()
})

// 管理中心涵蓋的子頁面（這些頁面也應讓「管理」tab active）
const ADMIN_SUB_PATHS = ['/locations', '/products', '/users', '/settings', '/import', '/admin']

function isNavActive(to) {
  const path = route.path
  if (to === '/admin') return ADMIN_SUB_PATHS.some(p => path.startsWith(p))
  if (to === '/') return path === '/'
  return path.startsWith(to)
}

// 根據角色動態生成底部導航項目
const navItems = computed(() => {
  const items = [
    { to: '/', label: '認供結緣',  icon: ArrowLeftRight },
    { to: '/dashboard', label: '總覽',    icon: LayoutDashboard },
    { to: '/transactions', label: '出入庫', icon: History },
  ]
  if (authStore.isOwner) {
    items.push({ to: '/reports', label: '報表',   icon: FileBarChart2 })
    items.push({ to: '/admin',   label: '管理',   icon: LayoutGrid })
  } else if (authStore.isAdmin) {
    items.push({ to: '/reports',  label: '報表',   icon: FileBarChart2 })
    items.push({ to: '/products', label: '品項',   icon: Package })
  }
  return items
})
</script>
