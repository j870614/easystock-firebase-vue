<template>
  <div class="min-h-dvh bg-stock-bg">
    <!-- 頂部導航 -->
    <header class="top-nav">
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

        <!-- 右側：道場選擇器 -->
        <slot name="header-right">
          <button
            v-if="showLocationPicker && appStore.activeLocations.length > 0"
            class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-700 text-sm font-medium"
            @click="showLocationDialog = true"
          >
            <MapPin class="w-4 h-4" />
            <span class="max-w-20 truncate">
              {{ appStore.selectedLocation?.name ?? '選擇道場' }}
            </span>
            <ChevronDown class="w-3 h-3" />
          </button>
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
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChevronLeft, ChevronDown, MapPin, Check,
  LayoutDashboard, ArrowLeftRight, History,
  Package, Building2, FileBarChart2, Users,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const props = defineProps({
  title: { type: String, default: '易存庫存系統' },
  showBack: { type: Boolean, default: false },
  showLocationPicker: { type: Boolean, default: true },
})

const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()
const showLocationDialog = ref(false)

function selectAndClose(id) {
  appStore.selectLocation(id)
  showLocationDialog.value = false
}

// 根據角色動態生成底部導航項目
const navItems = computed(() => {
  const items = [
    { to: '/dashboard', label: '總覽',    icon: LayoutDashboard },
    { to: '/inventory', label: '入出庫',  icon: ArrowLeftRight },
    { to: '/transactions', label: '紀錄', icon: History },
  ]
  if (authStore.isAdmin) {
    items.push({ to: '/reports',  label: '報表',   icon: FileBarChart2 })
    items.push({ to: '/products', label: '品項',   icon: Package })
  }
  if (authStore.isOwner) {
    items.push({ to: '/users',    label: '成員',   icon: Users })
  }
  return items
})
</script>
