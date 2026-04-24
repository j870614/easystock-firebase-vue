<template>
  <div
    class="min-h-dvh transition-colors duration-300"
    :class="appStore.isReplenishMode ? 'bg-green-50' : 'bg-stock-bg'"
    :data-fs="appStore.fontScale"
  >
    <header class="top-nav" :class="appStore.isReplenishMode ? 'bg-green-100 shadow-green-200/50' : ''">
      <div class="grid flex-1 grid-cols-[auto,minmax(0,1fr),auto] items-center gap-2 sm:gap-3 w-full max-w-[960px] mx-auto">
        <div class="flex items-center justify-start" :class="showBack ? 'w-9 sm:w-10' : 'w-0'">
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

        <h1 class="min-w-0 truncate whitespace-nowrap text-left text-base font-bold text-gray-800 sm:text-center sm:text-lg">
          {{ title }}
        </h1>

        <div class="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          <slot name="header-right">
            <button
              v-if="showLocationPicker && authStore.canSwitchScope && appStore.activeLocations.length > 0"
              class="flex max-w-[7.5rem] items-center gap-1 rounded-xl bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors flex-shrink sm:max-w-none sm:gap-2 sm:px-3 sm:text-sm"
              @click="openScopeDialog"
            >
              <MapPin class="w-4 h-4 flex-shrink-0" />
              <span class="max-w-[3.75rem] truncate sm:max-w-[110px]">
                {{ appStore.selectedLocation?.name ?? '選擇道場' }}
              </span>
              <span
                v-if="appStore.selectedHall"
                class="hidden md:inline-flex px-2 py-0.5 rounded-full text-[11px] bg-white border border-gray-200 text-gray-500"
              >
                {{ appStore.selectedHall.name }}
              </span>
              <ChevronDown class="w-3 h-3 flex-shrink-0" />
            </button>

            <div
              v-else-if="showLocationPicker && appStore.selectedLocation && appStore.selectedHall"
              class="flex max-w-[7.5rem] items-center gap-1 rounded-xl bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 sm:max-w-none sm:gap-2 sm:px-3 sm:text-sm"
            >
              <MapPin class="w-4 h-4 flex-shrink-0" />
              <span class="max-w-[3.75rem] truncate sm:max-w-[80px]">{{ appStore.selectedLocation.name }}</span>
              <span class="hidden md:inline-flex px-2 py-0.5 rounded-full text-[11px] bg-white border border-gray-200 text-emerald-600">
                {{ appStore.selectedHall.name }}
              </span>
            </div>

            <div class="relative flex-shrink-0">
              <button
                class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-200 transition-all hover:ring-2 hover:ring-brand-300"
                @click="accountMenuOpen = !accountMenuOpen"
              >
                <img
                  v-if="authStore.user?.photoURL"
                  :src="authStore.user.photoURL"
                  class="block w-full h-full object-cover"
                  :alt="authStore.user.displayName"
                />
                <User v-else class="w-5 h-5 flex-shrink-0 text-gray-500" />
              </button>

              <div
                v-if="accountMenuOpen"
                class="absolute right-0 top-11 z-[60] w-36 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg shadow-gray-200/70"
              >
                <button
                  class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  @click="goProfile"
                >
                  <User class="h-4 w-4" />
                  我的帳號
                </button>
                <button
                  class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-50"
                  @click="handleLogout"
                >
                  <LogOut class="h-4 w-4" />
                  登出
                </button>
              </div>
            </div>
          </slot>
        </div>
      </div>
    </header>

    <main class="page-content px-4 py-4">
      <div class="max-w-[960px] mx-auto">
        <div
          v-if="authStore.shouldShowPasskeyReminder && route.path !== '/passkey/setup' && route.path !== '/passkey/verify'"
          class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm"
        >
          <div class="flex items-start gap-3">
            <Shield class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">建議先綁定 Passkey</p>
              <p class="mt-1 text-sm leading-relaxed text-amber-800/90">
                共用電腦登入時可改用你自己的手機驗證；若你現在就是用自己的手機或平板，通常可直接用 Face ID、指紋或裝置密碼完成。
              </p>
            </div>
            <button
              class="rounded-xl bg-white px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
              @click="router.push('/passkey/setup')"
            >
              立即綁定
            </button>
          </div>
        </div>
        <slot />
      </div>
    </main>

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

    <el-dialog
      v-model="showScopeDialog"
      title="切換道場與堂口"
      width="92%"
      align-center
    >
      <div class="space-y-5 max-h-[min(58dvh,32rem)] overflow-y-auto pr-1">
        <div>
          <div class="text-xs font-bold text-gray-400 mb-2">道場</div>
          <div class="grid gap-2">
            <button
              v-for="loc in appStore.activeLocations"
              :key="loc.id"
              class="w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition-all"
              :class="scopeLocationId === loc.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
              @click="chooseDialogLocation(loc.id)"
            >
              <div class="flex items-start gap-3">
                <Store class="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold break-words">{{ loc.name }}</div>
                  <div v-if="loc.address" class="mt-0.5 break-words text-sm text-gray-500 line-clamp-2">{{ loc.address }}</div>
                </div>
                <Check v-if="scopeLocationId === loc.id" class="ml-auto mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />
              </div>
            </button>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-gray-400">堂口</div>
            <div class="text-xs text-gray-400">
              {{ scopedHallOptions.length > 0 ? '請選擇堂口' : '此道場尚無堂口' }}
            </div>
          </div>
          <div class="grid gap-2">
            <button
              v-for="hall in scopedHallOptions"
              :key="hall.id"
              class="w-full rounded-xl border px-4 py-3 text-left transition-all"
              :class="appStore.selectedHallId === hall.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
              @click="selectHallAndClose(hall.id)"
            >
              <div class="flex items-start gap-3">
                <Building2 class="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold break-words">{{ hall.name }}</div>
                  <div class="mt-0.5 text-xs text-gray-500">
                    {{ hall.isSystem ? '系統預設堂口' : '一般堂口' }}
                  </div>
                </div>
                <Check v-if="appStore.selectedHallId === hall.id" class="ml-auto mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="authStore.canManageLocations"
        class="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2"
      >
        <button
          class="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
          @click="showScopeDialog = false; $router.push('/locations')"
        >
          <Building2 class="w-5 h-5" />
          <span>管理道場與堂口</span>
        </button>
        <button
          v-if="authStore.isOwner"
          class="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
          @click="showScopeDialog = false; $router.push('/settings')"
        >
          <Settings class="w-5 h-5" />
          <span>系統環境管理</span>
        </button>
      </div>
    </el-dialog>

    <div
      v-if="isLocationLocked"
      class="fixed inset-0 bg-white/95 z-[9999] flex flex-col items-center justify-center p-6 text-center"
    >
      <MapPin class="w-20 h-20 text-red-500 mb-6 animate-bounce" />
      <h2 class="text-2xl font-bold text-gray-800 mb-3">不在道場範圍內</h2>
      <p class="text-gray-500 mb-8 leading-relaxed">
        系統偵測到您目前的位置不在「{{ appStore.selectedLocation?.name }}」的設定範圍內 (距離約超過 200 公尺)。<br><br>
        請確認：<br>
        1. 您的電話已開啟定位服務<br>
        2. 瀏覽器已允許定位權限<br>
        3. 您確實位於該道場範圍內
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftRight,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  FileBarChart2,
  History,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  Settings,
  Store,
  User,
} from 'lucide-vue-next'
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

const showScopeDialog = ref(false)
const accountMenuOpen = ref(false)
const scopeLocationId = ref(null)
const isLocationLocked = ref(false)
let geofenceInterval = null
let idleTimer = null
let lastActivityTime = Date.now()

const scopedHallOptions = computed(() =>
  scopeLocationId.value ? appStore.getHallsForLocation(scopeLocationId.value) : []
)

function openScopeDialog() {
  scopeLocationId.value = appStore.selectedLocationId
  showScopeDialog.value = true
}

function chooseDialogLocation(locationId) {
  scopeLocationId.value = locationId
  appStore.selectLocation(locationId)
}

function selectHallAndClose(hallId) {
  appStore.selectHall(hallId)
  showScopeDialog.value = false
}

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const deltaP = p2 - p1
  const deltaLon = lon2 - lon1
  const deltaLambda = (deltaLon * Math.PI) / 180
  const a =
    Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
    Math.cos(p1) *
      Math.cos(p2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function checkGeofence() {
  if (!authStore.shouldEnforceGeofence) {
    isLocationLocked.value = false
    return
  }

  const loc = appStore.selectedLocation
  if (!loc || !loc.lat || !loc.lng) {
    isLocationLocked.value = false
    return
  }

  if (!navigator.geolocation) {
    isLocationLocked.value = true
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const distance = getDistanceFromLatLonInM(
        loc.lat,
        loc.lng,
        position.coords.latitude,
        position.coords.longitude
      )
      isLocationLocked.value = distance > 200
    },
    () => {
      isLocationLocked.value = true
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

async function handleLogout() {
  accountMenuOpen.value = false
  await authStore.signOut()
  appStore.stop()
  router.push('/login')
}

function goProfile() {
  accountMenuOpen.value = false
  router.push('/profile')
}

const IDLE_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click']

function resetIdleTimer() {
  lastActivityTime = Date.now()
  if (!appStore.idleTimeout || appStore.idleTimeout <= 0) return

  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(async () => {
    const diff = Date.now() - lastActivityTime
    const limit = appStore.idleTimeout * 60 * 1000
    if (diff >= limit && authStore.isAuthenticated) {
      await authStore.signOut()
      appStore.stop()
      router.push('/login')
    } else if (authStore.isAuthenticated) {
      resetIdleTimer()
    }
  }, appStore.idleTimeout * 60 * 1000)
}

function startIdleTimer() {
  if (!authStore.isAuthenticated || appStore.idleTimeout <= 0) return
  IDLE_EVENTS.forEach((evt) =>
    window.addEventListener(evt, resetIdleTimer, { passive: true })
  )
  resetIdleTimer()
}

function stopIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, resetIdleTimer))
}

const ADMIN_SUB_PATHS = ['/locations', '/products', '/users', '/settings', '/import', '/admin']

function isNavActive(to) {
  const path = route.path
  if (to === '/admin') return ADMIN_SUB_PATHS.some((item) => path.startsWith(item))
  if (to === '/') return path === '/'
  return path.startsWith(to)
}

const navItems = computed(() => {
  const items = [
    { to: '/', label: '認供結緣', icon: ArrowLeftRight },
    { to: '/dashboard', label: '總覽', icon: LayoutDashboard },
    { to: '/transactions', label: '出入庫', icon: History },
  ]

  if (authStore.isStaff) {
    items.push({ to: '/reports', label: '報表', icon: FileBarChart2 })
  }

  if (authStore.canManageProducts) {
    const ownerManagementNav = authStore.isOwner
    items.push({
      to: ownerManagementNav ? '/admin' : '/products',
      label: ownerManagementNav ? '管理' : '品項',
      icon: ownerManagementNav ? LayoutGrid : Package,
    })
  }

  return items
})

watch(() => appStore.selectedLocationId, checkGeofence)

watch(
  () => appStore.idleTimeout,
  () => {
    stopIdleTimer()
    startIdleTimer()
  }
)

watch(
  () => authStore.isAuthenticated,
  (val) => {
    if (val) {
      startIdleTimer()
      return
    }
    stopIdleTimer()
    if (!['/login', '/pending', '/passkey/setup', '/passkey/verify'].includes(route.path)) {
      router.push('/login')
    }
  },
  { immediate: true }
)

onMounted(() => {
  appStore.init()
  appStore.applyFontScale()
  scopeLocationId.value = appStore.selectedLocationId
  setTimeout(checkGeofence, 1500)
  geofenceInterval = setInterval(checkGeofence, 3 * 60 * 1000)
  startIdleTimer()
})

onUnmounted(() => {
  if (geofenceInterval) clearInterval(geofenceInterval)
  stopIdleTimer()
})
</script>
