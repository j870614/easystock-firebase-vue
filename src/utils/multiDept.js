export const DEFAULT_HALL_NAME = '知客'

export const ROLE_MAP = {
  owner: '系統總管',
  admin: '管理員',
  hallLead: '執事負責人',
  staff: '一般人員',
  pending: '待審核',
}

export const FINANCE_MODE_MAP = {
  none: '不顯示',
  purchase: '顯示入庫單價',
  sale: '顯示收款金額',
  both: '完整顯示',
}

export const FINANCE_MODE_OPTIONS = [
  { value: 'none', label: FINANCE_MODE_MAP.none },
  { value: 'purchase', label: FINANCE_MODE_MAP.purchase },
  { value: 'sale', label: FINANCE_MODE_MAP.sale },
  { value: 'both', label: FINANCE_MODE_MAP.both },
]

export function buildPlacementDocId(productId, hallId) {
  return `${productId}_${hallId}`
}

export function buildSystemHallId(locationId) {
  return `${locationId}__system_zhike`
}

export function buildStockDocId(locationId, hallId, productId) {
  return `${locationId}_${hallId}_${productId}`
}

export function sortByOrder(a, b) {
  const orderDiff = Number(a?.order ?? 0) - Number(b?.order ?? 0)
  if (orderDiff !== 0) return orderDiff
  return String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'zh-Hant')
}

export function isGlobalRole(role) {
  return ['owner', 'admin'].includes(role)
}

export function isScopedRole(role) {
  return ['hallLead', 'staff'].includes(role)
}

export function isOperationalRole(role) {
  return ['owner', 'admin', 'hallLead', 'staff'].includes(role)
}

export function normalizeFinanceMode(value) {
  return ['none', 'purchase', 'sale', 'both'].includes(value) ? value : 'none'
}

export function getLegacyLocationVisibility(product, locationId) {
  const productActive = product?.isActive !== false
  const overrideVisible = product?.overrides?.[locationId]?.isActive
  if (overrideVisible === false) return false
  return productActive
}

export function isSaleEnabled(mode) {
  return ['sale', 'both'].includes(normalizeFinanceMode(mode))
}

export function isPurchaseEnabled(mode) {
  return ['purchase', 'both'].includes(normalizeFinanceMode(mode))
}
