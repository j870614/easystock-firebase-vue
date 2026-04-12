<template>
  <AppLayout title="報表匯出" :show-location-picker="true">
    <div class="space-y-4">
      <div class="card no-print">
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

      <div class="flex gap-2 no-print">
        <button
          class="btn-primary flex-1 text-lg py-4 gap-2"
          :disabled="!selectedYear || !appStore.selectedLocationId || exporting"
          @click="exportExcel"
        >
          <FileDown class="w-5 h-5" />
          <span>{{ exporting ? '匯出中…' : 'Excel 匯出' }}</span>
        </button>

        <button
          class="btn-ghost flex-1 text-lg py-4 gap-2 border-2"
          :disabled="!selectedYear || !appStore.selectedLocationId || previewData.length === 0"
          @click="print"
        >
          <Printer class="w-5 h-5" />
          <span>列印 A4</span>
        </button>
      </div>

      <!-- 網頁預覽 / 列印用表格 -->
      <div class="card overflow-x-auto print-container">
        <div v-if="loadingPreview" class="py-10 text-center text-gray-400">載入報表資料中...</div>
        <div v-else-if="previewData.length === 0" class="py-10 text-center text-gray-400 no-print">無資料可供預覽</div>
        <table v-else class="w-full text-left border-collapse min-w-max text-sm preview-table">
          <thead>
            <tr>
              <th colspan="2" class="text-center font-bold text-lg py-2 border bg-gray-50" :colspan="2 + appStore.activeProducts.length * 3">
                {{ appStore.selectedLocation?.name }} {{ selectedYear }}年 出入庫明細表
              </th>
            </tr>
            <tr class="bg-gray-100">
              <th rowspan="2" class="border p-2 min-w-[100px] text-center align-middle">日期</th>
              <th rowspan="2" class="border p-2 min-w-[150px] text-center align-middle">摘要</th>
              <th v-for="p in groupedProducts" :key="p.id" colspan="3" class="border p-2 text-center">
                {{ p.name }}<span v-if="p.spec">({{p.spec}})</span>
              </th>
            </tr>
            <tr class="bg-gray-50 text-xs">
              <template v-for="p in groupedProducts" :key="'sub_'+p.id">
                <th class="border p-1 text-center">入庫</th>
                <th class="border p-1 text-center">出庫</th>
                <th class="border p-1 text-center">結存</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in previewData" :key="idx" class="hover:bg-gray-50">
              <td class="border p-2 text-center">{{ row.date }}</td>
              <td class="border p-2">{{ row.note }}</td>
              <template v-for="p in groupedProducts" :key="'data_'+p.id">
                <td class="border p-2 text-center text-green-600">{{ row.items[p.id]?.in > 0 ? row.items[p.id].in : '' }}</td>
                <td class="border p-2 text-center text-red-600">{{ row.items[p.id]?.out > 0 ? row.items[p.id].out : '' }}</td>
                <td class="border p-2 text-center font-semibold">{{ row.items[p.id]?.stock }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <router-link to="/import" class="btn-ghost w-full text-lg py-5 gap-3 flex items-center justify-center no-print">
        <Upload class="w-6 h-6" />
        <span>初期庫存 Excel 匯入</span>
      </router-link>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import ExcelJS from 'exceljs'
import { FileDown, Printer, Upload } from 'lucide-vue-next'
import { db } from '@/firebase'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'

const appStore = useAppStore()
const selectedYear = ref(String(new Date().getFullYear()))
const exporting = ref(false)
const loadingPreview = ref(false)
const previewData = ref([])
const groupedProducts = ref([])

async function loadPreview() {
  if (!appStore.selectedLocationId || !selectedYear.value) {
    previewData.value = []
    return
  }
  
  loadingPreview.value = true
  try {
    const data = await buildReportData(appStore.selectedLocationId, selectedYear.value)
    groupedProducts.value = data.products
    previewData.value = data.rows
  } catch (err) {
    console.error('Failed to load preview:', err)
  } finally {
    loadingPreview.value = false
  }
}

watch(() => [appStore.selectedLocationId, selectedYear.value], loadPreview)
onMounted(() => {
  if (appStore.activeProducts.length > 0) {
    loadPreview()
  } else {
    // wait for products
    const unwatch = watch(() => appStore.activeProducts, (newVal) => {
      if (newVal.length > 0) {
        loadPreview()
        unwatch()
      }
    })
  }
})

async function buildReportData(locId, year) {
  // 1. 取得所有產品並在本地排序
  const productQ = query(collection(db, 'products'), where('isActive', '==', true))
  const productSnap = await getDocs(productQ)
  const products = productSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  products.sort((a, b) => (a.order || 0) - (b.order || 0))

  // 2. 取得所有交易紀錄並在本地排序 (為了計算正確的前期庫存)
  const txQ = query(collection(db, 'transactions'), where('locationId', '==', locId))
  const txSnap = await getDocs(txQ)
  const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  transactions.sort((a, b) => {
    // 先按日期排序
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    // 日期相同則按時間戳記排序
    const tA = a.timestamp?.toMillis?.() || 0
    const tB = b.timestamp?.toMillis?.() || 0
    return tA - tB
  })

  const rows = []
  
  // 追蹤累計庫存
  const currentStocks = {}
  products.forEach(p => { currentStocks[p.id] = 0 })

  // 按日期分組所有交易紀錄
  const dateGroups = {}
  transactions.forEach(tx => {
    if (!dateGroups[tx.date]) dateGroups[tx.date] = []
    dateGroups[tx.date].push(tx)
  })

  // 按日期依序計算
  for (const date of Object.keys(dateGroups).sort()) {
    const txList = dateGroups[date]
    const isTargetYear = date.startsWith(year)
    
    // 如果是該年份的資料，準備一列 row
    let row = null
    if (isTargetYear) {
      row = {
        date: date,
        note: [...new Set(txList.map(t => t.note).filter(Boolean))].join('、'),
        items: {}
      }
    }

    products.forEach(p => {
      const inQty = txList.filter(t => t.productId === p.id && t.type === 'in').reduce((s, t) => s + t.qty, 0)
      const outQty = txList.filter(t => t.productId === p.id && t.type === 'out').reduce((s, t) => s + t.qty, 0)
      
      currentStocks[p.id] = currentStocks[p.id] + inQty - outQty

      if (isTargetYear) {
        row.items[p.id] = {
          in: inQty,
          out: outQty,
          stock: currentStocks[p.id] // 計算後的結存
        }
      }
    })

    if (isTargetYear) {
      rows.push(row)
    }
  }

  return { products, rows }
}

async function exportExcel() {
  exporting.value = true
  try {
    const { products, rows } = await buildReportData(appStore.selectedLocationId, selectedYear.value)
    
    if (rows.length === 0) {
      alert('該年份無交易紀錄可導出')
      return
    }

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
      cell.value = `${p.name}${p.spec ? '(' + p.spec + ')' : ''}`
      cell.font  = { bold: true, size: 13 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
    })

    // ── 入/出/存 子標題列（第3列）
    products.forEach((_, i) => {
      const startCol = 3 + i * 3
      const labels = ['入庫', '出庫', '結存']
      labels.forEach((lbl, j) => {
        const cell = ws.getCell(3, startCol + j)
        cell.value = lbl
        cell.font  = { bold: true, size: 12 }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      })
    })
    ws.getRow(3).height = 22

    // ── 資料列
    let rowIdx = 4
    for (const row of rows) {
      ws.getCell(rowIdx, 1).value = row.date
      ws.getCell(rowIdx, 2).value = row.note

      products.forEach((p, i) => {
        const startCol = 3 + i * 3
        const pData = row.items[p.id]
        if (pData) {
          if (pData.in > 0) ws.getCell(rowIdx, startCol).value = pData.in
          if (pData.out > 0) ws.getCell(rowIdx, startCol + 1).value = pData.out
          ws.getCell(rowIdx, startCol + 2).value = pData.stock
        }
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
      ws.getColumn(3 + i * 3 + 2).width = 10
    }

    // ── 外框設置
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: {style:'thin'},
          left: {style:'thin'},
          bottom: {style:'thin'},
          right: {style:'thin'}
        }
        if (rowNumber > 3) {
           cell.alignment = { vertical: 'middle', horizontal: colNumber > 2 ? 'center' : 'left' }
           if (colNumber === 1) cell.alignment.horizontal = 'center'
        }
      })
    })

    // ── 下載
    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href = url
    a.download = `${locName}_${year}年_出入庫明細.xlsx`
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
/* 共用的預覽表格樣式，讓它不只在列印時，在網頁上也好看 */
.preview-table th, .preview-table td {
  border-color: #e5e7eb;
}

@media print {
  @page { size: A4 landscape; margin: 12mm; }
  
  /* 隱藏不想印出的東西 */
  .no-print, .top-nav, .bottom-nav { 
    display: none !important; 
  }
  
  /* 解除限制以便列印 */
  body, html { 
    background: white !important; 
  }
  .page-content { 
    padding: 0 !important; 
    overflow: visible !important;
  }
  .print-container {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
  }
  
  /* 表格列印樣式 */
  .preview-table {
    font-size: 11px;
    width: 100% !important;
  }
  .preview-table th {
    background-color: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* 防止表格被切斷 */
  .preview-table tr {
    page-break-inside: avoid;
  }
}
</style>
