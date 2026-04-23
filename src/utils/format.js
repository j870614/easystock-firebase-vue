export function formatMoney(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0'
  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: 0,
  }).format(num)
}
