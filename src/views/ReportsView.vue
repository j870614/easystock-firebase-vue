<template>
  <AppLayout title="報表匯出" :show-location-picker="true">
    <div class="space-y-4">
      <div class="card">
        <h2 class="font-semibold text-gray-700 mb-3">選擇年份與道場</h2>
        <div class="space-y-3">
          <div>
            <label class="label">年份</label>
            <el-date-picker
              v-model="selectedYear"
              type="year"
              placeholder="選擇年份"
              value-format="YYYY"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <button
        class="btn-primary w-full text-lg py-5 gap-3"
        :disabled="!selectedYear || !appStore.selectedLocationId || exporting"
        @click="exportExcel"
      >
        <FileDown class="w-6 h-6" />
        <span>{{ exporting ? '匯出中…' : 'Excel 匯出' }}</span>
      </button>

      <button
        class="btn-ghost w-full text-lg py-5 gap-3"
        :disabled="!selectedYear || !appStore.selectedLocationId"
        @click="print"
      >
        <Printer class="w-6 h-6" />
        <span>列印 A4 報表</span>
      </button>

      <router-link to="/import" class="btn-ghost w-full text-lg py-5 gap-3 flex items-center justify-center">
        <Upload class="w-6 h-6" />
        <span>初期庫存 Excel 匯入</span>
      </router-link>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import ExcelJS from 'exceljs'
import { FileDown, Printer } from 'lucide-vue-next'
import { db } from '@/firebase'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const appStore = useAppStore()
const selectedYear = ref(String(new Date().getFullYear()))
const exporting = ref(false)

async function fetchData() {
  const locId = appStore.selectedLocationId
  const year  = selectedYear.value

  // 產品清單
  const productQ = query(
    collection(db, 'products'),
    where('isActive', '==', true),
    orderBy('order')
  )
  const productSnap = await getDocs(productQ)
  const products = productSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // 交易紀錄（該年份）
  const txQ = query(
    collection(db, 'transactions'),
    where('locationId', '==', locId),
    where('date', '>=', `${year}-01-01`),
    where('date', '<=', `${year}-12-31`),
    orderBy('date'),
    orderBy('timestamp')
  )
  const txSnap = await getDocs(txQ)
  const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  return { products, transactions }
}

async function exportExcel() {
  exporting.value = true
  try {
    const { products, transactions } = await fetchData()
    const locName = appStore.selectedLocation?.name ?? '道場'
    const year = selectedYear.value

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('出入庫明細', { views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }] })

    // ── 標題列
    const totalCols = 2 + products.length * 3
    ws.mergeCells(1, 1, 1, totalCols)
    const titleCell = ws.getCell('A1')
    titleCell.value = `${locName} ${year}年 出入庫明細表`
    titleCell.font  = { bold: true, size: 16, name: 'Microsoft JhengHei' }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 30

    // ── 產品名稱列（第2列，每產品佔3欄：入/出/存）
    ws.getCell(2, 1).value = '日期'
    ws.getCell(2, 2).value = '摘要'
    ;[ws.getCell(2, 1), ws.getCell(2, 2)].forEach(c => {
      c.font = { bold: true, size: 13 }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
    })
    ws.mergeCells(2, 1, 3, 1)
    ws.mergeCells(2, 2, 3, 2)

    products.forEach((p, i) => {
      const startCol = 3 + i * 3
      ws.mergeCells(2, startCol, 2, startCol + 2)
      const cell = ws.getCell(2, startCol)
      cell.value = `${p.name}${p.spec ? '(' + p.spec + ')' : ''}${p.price ? ' $' + p.price : ''}`
      cell.font  = { bold: true, size: 13 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
    })

    // ── 入/出/存 子標題列（第3列）
    products.forEach((_, i) => {
      const startCol = 3 + i * 3
      const labels = ['入庫', '出庫', '庫存']
      labels.forEach((lbl, j) => {
        const cell = ws.getCell(3, startCol + j)
        cell.value = lbl
        cell.font  = { bold: true, size: 12 }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      })
    })
    ws.getRow(3).height = 22

    // ── 資料列：按日期分組
    const dateGroups = {}
    transactions.forEach(tx => {
      if (!dateGroups[tx.date]) dateGroups[tx.date] = []
      dateGroups[tx.date].push(tx)
    })

    let rowIdx = 4
    for (const [date, txList] of Object.entries(dateGroups).sort()) {
      const noteSet = [...new Set(txList.map(t => t.note).filter(Boolean))].join('、')
      ws.getCell(rowIdx, 1).value = date
      ws.getCell(rowIdx, 2).value = noteSet

      products.forEach((p, i) => {
        const startCol = 3 + i * 3
        const inQty  = txList.filter(t => t.productId === p.id && t.type === 'in').reduce((s, t) => s + t.qty, 0)
        const outQty = txList.filter(t => t.productId === p.id && t.type === 'out').reduce((s, t) => s + t.qty, 0)
        if (inQty  > 0) ws.getCell(rowIdx, startCol).value     = inQty
        if (outQty > 0) ws.getCell(rowIdx, startCol + 1).value = outQty
        // 庫存公式：上一行庫存 + 本行入庫 - 本行出庫
        const stockCol  = ExcelJS.utils?.encode_col?.(startCol + 2) ?? String.fromCharCode(64 + startCol + 2)
        ws.getCell(rowIdx, startCol + 2).value = 0 // placeholder (實務上導出時填實際庫存)
      })

      ws.getRow(rowIdx).height = 22
      rowIdx++
    }

    // ── 欄寬
    ws.getColumn(1).width = 14
    ws.getColumn(2).width = 20
    for (let i = 0; i < products.length; i++) {
      ws.getColumn(3 + i * 3).width     = 8
      ws.getColumn(3 + i * 3 + 1).width = 8
      ws.getColumn(3 + i * 3 + 2).width = 8
    }

    // ── 下載
    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href = url
    a.download = `${locName}_${year}出入庫明細.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error(e)
    alert('匯出失敗：' + e.message)
  } finally {
    exporting.value = false
  }
}

function print() {
  window.print()
}
</script>

<style>
@media print {
  @page { size: A4 landscape; margin: 12mm; }
  .top-nav, .bottom-nav { display: none !important; }
  .page-content { padding: 0 !important; }
  body { font-size: 11px; }
}
</style>
