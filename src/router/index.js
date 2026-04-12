// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/auth/line/callback',
    name: 'line-callback',
    component: () => import('@/views/LineCallbackView.vue'),
    meta: { public: true },
  },
  {
    path: '/pending',
    name: 'pending',
    component: () => import('@/views/PendingView.vue'),
    meta: { public: false },
  },
  {
    path: '/',
    name: 'offering',
    component: () => import('@/views/InventoryView.vue'),
    meta: { requiresAuth: true, requiredRole: 'staff' },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, requiredRole: 'staff' },
  },
  {
    path: '/transactions',
    name: 'transactions',
    component: () => import('@/views/TransactionsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'staff' },
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('@/views/ProductsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
  {
    path: '/locations',
    name: 'locations',
    component: () => import('@/views/LocationsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'owner' },
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('@/views/ReportsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true, requiredRole: 'owner' },
  },
  {
    path: '/import',
    name: 'import',
    component: () => import('@/views/ImportView.vue'),
    meta: { requiresAuth: true, requiredRole: 'owner' },
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/UsersView.vue'),
    meta: { requiresAuth: true, requiredRole: 'owner' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ── 導航守衛 ──────────────────────────────────────────────
const ROLE_WEIGHT = { owner: 3, admin: 2, staff: 1, pending: 0 }

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // 等待 Auth 初始化完成（防止重新整理時閃跳）
  if (authStore.loading) {
    await authStore.init()
  }

  const isPublic = to.meta.public

  // 未登入 → 強制導向登入頁
  if (!isPublic && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  // 已登入但帳號待審核 → 導向 pending 頁
  if (authStore.isAuthenticated && authStore.isPending && to.name !== 'pending') {
    return { name: 'pending' }
  }

  // 已登入要去登入頁 → 導向首頁
  if (isPublic && authStore.isAuthenticated && to.name === 'login') {
    return { path: '/' }
  }

  // 角色不足 → 導向首頁
  const requiredRole = to.meta.requiredRole
  if (requiredRole) {
    const userWeight = ROLE_WEIGHT[authStore.role] ?? 0
    const required   = ROLE_WEIGHT[requiredRole] ?? 0
    if (userWeight < required) {
      return { path: '/' }
    }
  }
})

export default router
