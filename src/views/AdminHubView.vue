<template>
  <AppLayout title="管理中心" :show-location-picker="false">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button
        v-for="item in adminItems"
        :key="item.to"
        class="card flex flex-col items-center justify-center gap-3 py-8 transition-all active:scale-95 hover:border-brand-300 border-2 border-transparent"
        @click="$router.push(item.to)"
      >
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center" :class="item.bg">
          <component :is="item.icon" class="w-7 h-7" :class="item.color" />
        </div>
        <span class="font-semibold text-gray-700 text-sm">{{ item.label }}</span>
      </button>
    </div>
  </AppLayout>
</template>

<script setup>
import { Building2, Package, Users, Settings } from 'lucide-vue-next'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()

const adminItems = computed(() => {
  const items = [
    { to: '/products', label: '品項管理', icon: Package, bg: 'bg-green-50', color: 'text-green-500' },
  ]

  if (authStore.isOwner) {
    items.unshift({ to: '/locations', label: '道場管理', icon: Building2, bg: 'bg-blue-50', color: 'text-blue-500' })
    items.push({ to: '/users', label: '成員管理', icon: Users, bg: 'bg-purple-50', color: 'text-purple-500' })
    items.push({ to: '/settings', label: '系統設定', icon: Settings, bg: 'bg-amber-50', color: 'text-amber-500' })
  }

  return items
})
</script>
