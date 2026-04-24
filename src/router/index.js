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
    path: '/pending',
    name: 'pending',
    component: () => import('@/views/PendingView.vue'),
    meta: { public: false },
  },
  {
    path: '/passkey/setup',
    name: 'passkey-setup',
    component: () => import('@/views/PasskeySetupView.vue'),
    meta: { requiresAuth: true, requiredRole: 'staff' },
  },
  {
    path: '/passkey/verify',
    name: 'passkey-verify',
    component: () => import('@/views/PasskeyVerifyView.vue'),
    meta: { requiresAuth: true, requiredRole: 'staff' },
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
    meta: { requiresAuth: true, requiredRole: 'hallLead' },
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
    meta: { requiresAuth: true, requiredRole: 'staff' },
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
    meta: { requiresAuth: true, requiredRole: 'hallLead' },
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/UsersView.vue'),
    meta: { requiresAuth: true, requiredRole: 'owner' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminHubView.vue'),
    meta: { requiresAuth: true, requiredRole: 'admin' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true, requiredRole: 'staff' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ── 導航守衛 ──────────────────────────────────────────────
const ROLE_WEIGHT = { owner: 4, admin: 3, hallLead: 2, staff: 1, pending: 0 }

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

  if (
    authStore.isAuthenticated &&
    authStore.isPasskeyRecoveryRequired &&
    to.name !== 'passkey-setup'
  ) {
    return { name: 'passkey-setup' }
  }

  if (
    authStore.isAuthenticated &&
    authStore.shouldPromptPasskeySetup &&
    !['passkey-setup', 'passkey-verify', 'pending'].includes(String(to.name ?? ''))
  ) {
    return { name: 'passkey-setup' }
  }

  // 已登入要去登入頁 → 導向首頁
  if (isPublic && authStore.isAuthenticated && to.name === 'login') {
    return { path: authStore.getPostLoginRoute() }
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
