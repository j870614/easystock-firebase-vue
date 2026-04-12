<template>
  <div class="min-h-dvh transition-colors duration-300" :class="appStore.isReplenishMode ? 'bg-green-50' : 'bg-stock-bg'">
    <!-- 頂部導航 -->
    <header class="top-nav" :class="appStore.isReplenishMode ? 'bg-green-100 shadow-green-200/50' : ''">
      <div class="flex items-center gap-3 flex-1">
        <!-- 左側：返回或漢堡 -->
        <slot name="header-left">
          <button
            v-if="showBack"
            class="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            @click="$router.back()"
          >
            <ChevronLeft class="w-6 h-6 text-gray-600" />
          </button>
        </slot>

        <!-- 標題 -->
        <h1 class="text-lg font-bold text-gray-800 flex-1 truncate">
          {{ title }}
        </h1>

        <!-- 右側：道場選擇器與登出 -->
        <slot name="header-right">
          <div class="flex items-center gap-2">
            <!-- 補貨模式開關 -->
            <div
              v-if="$route.name === 'offering'"
              class="flex items-center gap-1.5 mr-1"
            >
              <span class="text-xs font-bold transition-colors" :class="appStore.isReplenishMode ? 'text-green-600' : 'text-gray-400'">補貨<br>開關</span>
              <el-switch v-model="appStore.isReplenishMode" style="--el-switch-on-color: #22c55e;" />
            </div>

            <button
              v-if="showLocationPicker && appStore.activeLocations.length > 0"
              class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
              :class="authStore.isAdmin ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'bg-gray-100 text-gray-700'"
              @click="authStore.isAdmin && (showLocationDialog = true)"
            >
              <MapPin class="w-4 h-4" />
              <span class="max-w-20 truncate">
                {{ appStore.selectedLocation?.name ?? '選擇道場' }}
              </span>
              <ChevronDown v-if="authStore.isAdmin" class="w-3 h-3" />
            </button>
            <button
              class="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              @click="handleLogout"
            >
              <LogOut class="w-5 h-5" />
            </button>
          </div>
        </slot>
      </div>
    </header>

    <!-- 主內容 -->
    <main class="page-content px-4 py-4">
      <slot />
    </main>

    <!-- 底部導航 -->
    <nav
      class="bottom-nav"
      :style="{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }"
    >
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="bottom-nav-item"
        :class="{ active: $route.path.startsWith(item.to) }"
      >
        <component :is="item.icon" class="w-6 h-6" />
        <span class="text-xs">{{ item.label }}</span>
      </router-link>
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
            <BuildingStorefront class="w-5 h-5 flex-shrink-0" />
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
      <div v-if="authStore.isOwner" class="mt-6 pt-4 border-t border-gray-100">
        <button 
          class="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
          @click="showLocationDialog = false; $router.push('/locations')"
        >
          <Building2 class="w-5 h-5" />
          <span>管理道場設定</span>
        </button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChevronLeft, ChevronDown, MapPin, Check,
  LayoutDashboard, ArrowLeftRight, History,
  Package, Building2, FileBarChart2, Users, LogOut
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

function selectAndClose(id) {
  appStore.selectLocation(id)
  showLocationDialog.value = false
}

async function handleLogout() {
  await authStore.signOut()
  appStore.stop()
  router.push('/login')
}

onMounted(() => {
  appStore.init()
})
onUnmounted(() => {
  // 注意：我們通常希望全域資料監聽在頁面切換時不中斷
  // 但在此 AppLayout 結構下，若要切換使用者登出，可能需要 stop
})

// 根據角色動態生成底部導航項目
const navItems = computed(() => {
  const items = [
    { to: '/', label: '認供結緣',  icon: ArrowLeftRight },
    { to: '/dashboard', label: '總覽',    icon: LayoutDashboard },
    { to: '/transactions', label: '紀錄', icon: History },
  ]
  if (authStore.isOwner) {
    items.push({ to: '/locations', label: '道場',   icon: Building2 })
    items.push({ to: '/reports',  label: '報表',   icon: FileBarChart2 })
    items.push({ to: '/products', label: '品項',   icon: Package })
    items.push({ to: '/users',    label: '成員',   icon: Users })
  } else if (authStore.isAdmin) {
    items.push({ to: '/reports',  label: '報表',   icon: FileBarChart2 })
    items.push({ to: '/products', label: '品項',   icon: Package })
  }
  return items
})
</script>
