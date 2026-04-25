import { ROLE_MAP } from '@/utils/multiDept'

export const PERMISSION_ROLES = ['admin', 'hallLead', 'staff']

export const PERMISSION_ROLE_OPTIONS = PERMISSION_ROLES.map((role) => ({
  value: role,
  label: ROLE_MAP[role],
}))

export const BUSINESS_PERMISSIONS = [
  {
    key: 'inventory.write',
    label: '認供結緣出入庫',
    description: '新增出入庫紀錄並更新庫存。',
    defaultRoles: ['admin', 'hallLead', 'staff'],
  },
  {
    key: 'dashboard.view',
    label: '總覽',
    description: '查看今日交易與庫存總覽。',
    defaultRoles: ['admin', 'hallLead', 'staff'],
  },
  {
    key: 'transactions.view',
    label: '出入庫紀錄',
    description: '查看出入庫紀錄頁。',
    defaultRoles: ['admin', 'hallLead', 'staff'],
  },
  {
    key: 'transactions.write',
    label: '編輯/刪除交易',
    description: '修改或刪除既有交易紀錄。',
    defaultRoles: ['admin', 'hallLead', 'staff'],
  },
  {
    key: 'reports.view',
    label: '報表匯出',
    description: '查看與匯出報表。',
    defaultRoles: ['admin', 'hallLead', 'staff'],
  },
  {
    key: 'products.write',
    label: '品項管理',
    description: '新增、編輯品項與上架設定。',
    defaultRoles: ['admin', 'hallLead'],
  },
  {
    key: 'products.delete',
    label: '刪除品項',
    description: '刪除品項資料。',
    defaultRoles: [],
  },
  {
    key: 'import.data',
    label: 'Excel 匯入',
    description: '匯入初期庫存或批次資料。',
    defaultRoles: ['admin', 'hallLead'],
  },
  {
    key: 'locations.write',
    label: '道場/堂口管理',
    description: '新增與編輯道場、堂口。',
    defaultRoles: ['admin'],
  },
]

export const DEFAULT_PERMISSION_ROLES = Object.fromEntries(
  BUSINESS_PERMISSIONS.map((permission) => [permission.key, permission.defaultRoles])
)

export function normalizePermissionRoles(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return Object.fromEntries(
    BUSINESS_PERMISSIONS.map((permission) => {
      const roles = Array.isArray(source[permission.key])
        ? source[permission.key]
        : permission.defaultRoles
      return [
        permission.key,
        roles.filter((role) => PERMISSION_ROLES.includes(role)),
      ]
    })
  )
}

export function roleHasPermission(role, permissionKey, permissionRoles = DEFAULT_PERMISSION_ROLES) {
  if (role === 'owner') return true
  if (!PERMISSION_ROLES.includes(role)) return false
  return permissionRoles[permissionKey]?.includes(role) ?? false
}
