<template>
  <div
    class="min-h-dvh transition-colors duration-300"
    :class="appStore.isReplenishMode ? 'bg-green-50' : 'bg-stock-bg'"
    :data-fs="appStore.fontScale"
  >
    <header class="top-nav" :class="appStore.isReplenishMode ? 'bg-green-100 shadow-green-200/50' : ''">
      <div class="flex items-center gap-3 flex-1 w-full max-w-[960px] mx-auto">
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

        <h1 class="text-lg font-bold text-gray-800 flex-1 min-w-0 truncate text-center">
          {{ title }}
        </h1>

        <div class="flex-none flex items-center gap-2 justify-end">
          <slot name="header-right">
            <button
              v-if="showLocationPicker && authStore.canSwitchScope && appStore.activeLocations.length > 0"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors bg-gray-100 text-gray-700 flex-shrink-0"
              @click="openScopeDialog"
            >
              <MapPin class="w-4 h-4 flex-shrink-0" />
              <span class="max-w-[110px] truncate">
                {{ appStore.selectedLocation?.name ?? '選擇道場' }}
              </span>
              <span
                v-if="appStore.selectedHall"
                class="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] bg-white border border-gray-200 text-gray-500"
              >
                {{ appStore.selectedHall.name }}
              </span>
              <ChevronDown class="w-3 h-3 flex-shrink-0" />
            </button>

            <div
              v-else-if="showLocationPicker && appStore.selectedLocation && appStore.selectedHall"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700"
            >
              <MapPin class="w-4 h-4 flex-shrink-0" />
              <span class="max-w-[80px] truncate">{{ appStore.selectedLocation.name }}</span>
              <span class="px-2 py-0.5 rounded-full text-[11px] bg-white border border-gray-200 text-emerald-600">
                {{ appStore.selectedHall.name }}
              </span>
            </div>

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

    <main class="page-content px-4 py-4">
      <div class="max-w-[960px] mx-auto">
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
      <div class="space-y-5">
        <div>
          <div class="text-xs font-bold text-gray-400 mb-2">道場</div>
          <div class="grid gap-2">
            <button
              v-for="loc in appStore.activeLocations"
              :key="loc.id"
              class="w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-medium"
              :class="scopeLocationId === loc.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
              @click="chooseDialogLocation(loc.id)"
            >
              <div class="flex items-center gap-3">
                <Store class="w-5 h-5 flex-shrink-0" />
                <div class="min-w-0">
                  <div class="font-semibold truncate">{{ loc.name }}</div>
                  <div v-if="loc.address" class="text-sm text-gray-500 truncate">{{ loc.address }}</div>
                </div>
                <Check v-if="scopeLocationId === loc.id" class="w-5 h-5 ml-auto text-brand-600" />
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
              class="w-full text-left px-4 py-3 rounded-xl border transition-all"
              :class="appStore.selectedHallId === hall.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
              @click="selectHallAndClose(hall.id)"
            >
              <div class="flex items-center gap-3">
                <Building2 class="w-5 h-5 flex-shrink-0" />
                <div class="min-w-0">
                  <div class="font-semibold truncate">{{ hall.name }}</div>
                  <div class="text-xs text-gray-500">
                    {{ hall.isSystem ? '系統預設堂口' : '一般堂口' }}
                  </div>
                </div>
                <Check v-if="appStore.selectedHallId === hall.id" class="w-5 h-5 ml-auto text-emerald-600" />
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
  if (authStore.canSwitchScope) {
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
  await authStore.signOut()
  appStore.stop()
  router.push('/login')
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
    items.push({
      to: authStore.canSwitchScope ? '/admin' : '/products',
      label: authStore.canSwitchScope ? '管理' : '品項',
      icon: authStore.canSwitchScope ? LayoutGrid : Package,
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
    if (route.path !== '/login' && route.path !== '/pending') {
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
