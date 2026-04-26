<template>
  <AppLayout title="初期庫存匯入" :show-back="true" :show-location-picker="false">
    <div class="space-y-4">
      <!-- 說明卡片 -->
      <div class="card bg-amber-50 border-amber-200">
        <div class="flex gap-3">
          <AlertTriangle class="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div class="text-sm text-amber-800 leading-relaxed">
            <p class="font-semibold mb-1">注意事項</p>
            <ul class="list-disc list-inside space-y-1">
              <li>目前匯入目標範圍：<strong class="text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded">{{ appStore.selectedLocation?.name }} / {{ appStore.selectedHall?.name }}</strong></li>
              <li>匯入將會<strong>覆蓋</strong>該堂口現有庫存</li>
              <li>Excel 格式：第一欄「品項名稱」、第二欄「規格」、第三欄「庫存數量」</li>
              <li>您下載的範本已為您自動填入系統設定的品項</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 下載範本 -->
      <button class="btn-ghost w-full gap-3" @click="downloadTemplate">
        <Download class="w-5 h-5" />
        <span>下載 Excel 範本</span>
      </button>

      <!-- 上傳區 -->
      <div
        class="border-2 border-dashed border-brand-300 rounded-2xl p-8 text-center transition-colors"
        :class="dragging ? 'bg-brand-50 border-brand-500' : 'bg-white'"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
      >
        <Upload class="w-12 h-12 text-brand-300 mx-auto mb-3" />
        <p class="text-gray-600 font-medium">拖曳 Excel 檔案至此</p>
        <p class="text-gray-400 text-sm mt-1">或</p>
        <label class="btn-primary mt-3 inline-flex cursor-pointer">
          <input type="file" accept=".xlsx,.xls" class="hidden" @change="handleFileInput" />
          選擇檔案
        </label>
      </div>

      <!-- 預覽表格 -->
      <div v-if="preview.length > 0" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-gray-700">預覽（共 {{ preview.length }} 筆）</h3>
          <button
            class="btn-in px-6 py-3 text-base"
            :disabled="importing"
            @click="doImport"
          >
            <span v-if="importing">
              <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              匯入中…
            </span>
            <span v-else>確認匯入</span>
          </button>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="errors.length > 0" class="card bg-red-50 border-red-200 space-y-1">
          <p class="font-semibold text-red-700 text-sm">發現以下錯誤，請修正後重新上傳：</p>
          <p v-for="e in errors" :key="e" class="text-red-600 text-sm">・ {{ e }}</p>
        </div>

        <div class="overflow-x-auto rounded-xl border border-gray-200">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left text-gray-500 font-medium">品項</th>
                <th class="px-3 py-2 text-left text-gray-500 font-medium">規格</th>
                <th class="px-3 py-2 text-right text-gray-500 font-medium">數量</th>
                <th class="px-3 py-2 text-center text-gray-500 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(row, i) in preview" :key="i" class="hover:bg-gray-50">
                <td class="px-3 py-2 text-gray-800">{{ row.productName }}</td>
                <td class="px-3 py-2 text-gray-500">{{ row.spec }}</td>
                <td class="px-3 py-2 text-right font-semibold">{{ row.qty }}</td>
                <td class="px-3 py-2 text-center">
                  <span v-if="row.error" class="text-red-500 text-xs">❌ {{ row.error }}</span>
                  <span v-else-if="row.matched" class="text-green-500 text-xs">✓ 符合</span>
                  <span v-else class="text-amber-500 text-xs">⚠ 找不到</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 匯入結果 -->
      <transition name="slide-up">
        <div
          v-if="importResult"
          class="card bg-green-50 border-green-200 text-center py-6"
        >
          <CheckCircle2 class="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p class="font-bold text-green-700 text-xl">匯入成功！</p>
          <p class="text-green-600">已更新 {{ importResult.count }} 筆庫存</p>
        </div>
      </transition>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import ExcelJS from 'exceljs'
import {
  Upload, Download, AlertTriangle, CheckCircle2
} from 'lucide-vue-next'
import {
  collection, getDocs, query, where, orderBy,
  doc, setDoc, addDoc, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { buildStockDocId } from '@/utils/multiDept'

const authStore = useAuthStore()
const appStore = useAppStore()

const dragging     = ref(false)
const preview      = ref([])
const errors       = ref([])
const importing    = ref(false)
const importResult = ref(null)

// ── 下載範本 ──────────────────────────────────────────────────
async function downloadTemplate() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('初期庫存')

  ws.columns = [
    { header: '品項名稱', key: 'name',     width: 16 },
    { header: '規格',     key: 'spec',     width: 10 },
    { header: '庫存數量', key: 'qty',      width: 10 },
  ]

  // 標頭樣式
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }

  // 範例資料與自動帶入
  const activeProducts = appStore.activeProducts
  if (activeProducts.length > 0) {
    const rows = activeProducts.map(p => ({
      name: p.name,
      spec: p.spec || '',
      qty: 0 // 預設為0
    }))
    ws.addRows(rows)
  } else {
    ws.addRows([
      { name: '背心', spec: 'M',  qty: 10 },
      { name: '背心', spec: 'L',  qty: 5  },
      { name: '圍巾', spec: '薄', qty: 27 },
    ])
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href = url
  a.download = '初期庫存匯入範本.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

// ── 讀取 Excel 並進行驗證 ─────────────────────────────────────
async function parseExcel(file) {
  const wb = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await wb.xlsx.load(buffer)
  const ws = wb.worksheets[0]
  const rows = []
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return // 跳過標頭
    const [, productName, spec, qty] = row.values
    if (!productName) return
    rows.push({
      productName:  String(productName   ?? '').trim(),
      spec:         String(spec          ?? '').trim(),
      qty:          Number(qty           ?? 0),
      matched:      false,
      productId:    null,
      error:        null,
    })
  })
  return rows
}

async function validate(rows) {
  const prodSnap = await getDocs(collection(db, 'products'))
  const prodMap = {} // { "背心_M": productId }
  prodSnap.docs.forEach(d => {
    const data = d.data()
    const key  = `${data.name}_${data.spec ?? ''}`
    prodMap[key] = d.id
  })

  const errs = []
  rows.forEach((row, i) => {
    const prodId = prodMap[`${row.productName}_${row.spec}`]

    if (!prodId) {
      row.error = `品項「${row.productName} ${row.spec}」不存在`
      errs.push(`第 ${i + 2} 列：${row.error}`)
    } else if (isNaN(row.qty) || row.qty < 0) {
      row.error = '庫存數量不合法'
      errs.push(`第 ${i + 2} 列：${row.error}`)
    } else {
      row.productId  = prodId
      row.matched    = true
    }
  })
  return errs
}

async function processFile(file) {
  importResult.value = null
  const rows = await parseExcel(file)
  const errs = await validate(rows)
  preview.value = rows
  errors.value  = errs
}

function handleFileInput(e) {
  const file = e.target.files[0]
  if (file) processFile(file)
}

function handleDrop(e) {
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) processFile(file)
}

// ── 執行匯入（批次寫入 stocks + 一筆 adjust 交易紀錄）────────
async function doImport() {
  const validRows = preview.value.filter(r => r.matched)
  if (validRows.length === 0) return

  const targetLoc = appStore.selectedLocation
  if (!targetLoc || !appStore.selectedHallId) {
    ElMessage.warning('未選取堂口')
    return
  }

  try {
    await ElMessageBox.confirm(
      `確定要匯入並覆蓋「${targetLoc.name} / ${appStore.selectedHall?.name}」的庫存嗎？此操作將無法還原。`,
      '確認匯入覆蓋',
      { confirmButtonText: '確定覆蓋', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return // user cancelled
  }

  importing.value = true
  let count = 0
  const locId = targetLoc.id
  const hallId = appStore.selectedHallId

  try {
    const batch = writeBatch(db)

    // 取得現有庫存
    const stocksSnap = await getDocs(
      query(
        collection(db, 'stocks'),
        where('locationId', '==', locId),
        where('hallId', '==', hallId)
      )
    )
    const existingStocks = {}
    stocksSnap.forEach(d => {
      existingStocks[d.data().productId] = d.data().currentStock || 0
    })

    for (const row of validRows) {
      const stockDocId = buildStockDocId(locId, hallId, row.productId)
      const stockRef   = doc(db, 'stocks', stockDocId)
      batch.set(stockRef, {
        locationId:   locId,
        hallId,
        productId:    row.productId,
        currentStock: row.qty,
      }, { merge: false }) // 強制覆蓋

      const oldStock = existingStocks[row.productId] || 0
      const diff = row.qty - oldStock

      if (diff !== 0) {
        // 新增一筆 adjust 類型的交易紀錄作為稽核軌跡
        const txRef = doc(collection(db, 'transactions'))
        batch.set(txRef, {
          locationId: locId,
          hallId,
          date:       new Date().toISOString().slice(0, 10),
          timestamp:  serverTimestamp(),
          type:       diff > 0 ? 'in' : 'out',
          productId:  row.productId,
          productSnapshot: {
            name:  row.productName,
            spec:  row.spec,
            price: 0,
          },
          qty:      Math.abs(diff),
          note:     '期初庫存匯入 (差異調整)',
          operator: {
            uid:  authStore.user.uid,
            name: authStore.user.displayName,
            dharmaName: authStore.profile?.dharmaName || '',
          },
        })
      }
      count++
    }

    await batch.commit()
    importResult.value = { count }
    preview.value = []
    errors.value  = []
  } catch (e) {
    ElMessage.error('匯入失敗：' + e.message)
  } finally {
    importing.value = false
  }
}
</script>
