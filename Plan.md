# VibeInventory (易存) 開發計畫書

本專案旨在為「香港念佛會」開發一套長輩友善的行動版出入庫系統，解決現行人工對帳困難、報表產出耗時的問題。

## 1. 資料庫架構 (Firestore)

### `locations` (Collection)
- `{locationId}` (Document)
  - `name`: 道場名稱
  - `address`: 地址 (選填)
  - `isActive`: 是否啟用

### `products` (Collection)
- `{productId}` (Document)
  - `name`: 品項名稱
  - `spec`: 規格
  - `price`: 單價
  - `order`: 排序序號
  - `isActive`: 是否啟用

### `stocks` (Collection)
- `{locationId}_{productId}` (Document ID: 複合索引)
  - `locationId`: 關聯道場 ID
  - `productId`: 關聯產品 ID
  - `currentStock`: 該道場目前的結餘庫存

### `transactions` (Collection)
- `{txId}` (Document)
  - `locationId`: 所屬道場 ID
  - `date`: 交易日期 (YYYY-MM-DD)
  - `timestamp`: 伺服器時間
  - `type`: 'in' | 'out' | 'adjust' (校正/匯入)
  - `productId`: 關聯產品 ID
  - `productSnapshot`: { name, spec, price }
  - `qty`: 數量
  - `note`: 摘要/備註
  - `operator`: { uid, name }

---

## 2. 權限邏輯 (RBAC & Security)

### 權限層級
1. **Owner (系統總管)**:
   - 全權限。
   - 唯一可存取 `users` 集合變更 `role` 欄位的人。
2. **Admin (管理員)**:
   - 產品 CRUD。
   - 編輯/刪除 `transactions` (補帳/正帳)。
   - 導出 Excel/列印。
3. **Staff (一般人員)**:
   - 僅可新增 `transactions` (入庫/出庫登記)。
   - 僅可讀取 `products` (查看餘額)。

---

## 3. 分階段實作目標

### 第一階段：環境與認證 (Day 1-2)
- [ ] Vite + Vue 3 + Tailwind CSS 初始化專案。
- [ ] Firebase 專案設定與 Web SDK 整合。
- [ ] **LINE Login 教學與引導：撰寫文件指引使用者建立 LINE Developers Channel。**
- [ ] LINE Login (Cloud Function v2) 與 Google Auth 整合。
- [ ] 基本 RBAC 基礎設施 (Pinia Store)。

### 第二階段：核心功能 - 多道場庫存管理 (Day 3-5)
- [ ] 道場管理 (Locations CRUD)。
- [ ] 產品管理介面 (Products CRUD)。
- [ ] **初期庫存 Excel 匯入工具：支援 Admin 批次初始化各道場庫存。**
- [ ] 行動端「選擇道場」與「入出庫登記」。
- [ ] 自動計算 `stocks` 結餘 (透過 Firestore Transaction)。

### 第三階段：報表與優化 (Day 5-7)
- [ ] ExcelJS 導出：複刻「日期 + 摘要 + (入/出/存) * N」橫向格式。
- [ ] A4 橫向列印 CSS 優化。
- [ ] 長輩友善介面打磨 (字體、色塊、過渡動畫)。

---

## 4. 技術細節與報表方案

### 長輩友善設計
- **字體**: Base 18px，標題 24px+。
- **互動**: 所有 Button 高度 56px (高於標準 48px)，增加觸控感。
- **色彩**: 
  - 入庫: `#2ecc71` (綠)
  - 出庫: `#e74c3c` (紅)
  - 背景: 低對比護眼灰。

### Excel 導出邏輯
- 動態計算所有 `isActive: true` 的產品作為 Column Header。
- 第一列帶入「期初庫存」。
- 每一行代表一個 `date` 的合併摘要（若同日有多筆紀錄）。
- 使用 `worksheet.mergeCells` 處理「產品名稱」跨三格 (入/出/存) 的標題。

### LINE Login 設定教學規劃
我將會引導您完成以下步驟：
1. 造訪 [LINE Developers Console](https://developers.line.biz/)。
2. 建立 Provider 並新增 **LINE Login Channel**。
3. 取得 `Channel ID` 與 `Channel Secret`。
4. 設定 Callback URL (由 Firebase Function 提供)。
5. 開啟 OpenID Connect 以獲取使用者資料。

---

## 5. 開發環境與指令錄 (Firebase)
1. `firebase init` (Hosting, Functions, Firestore, Auth)
2. `npm install firebase element-plus @element-plus/icons-vue tailwindcss pinia axios exceljs lucide-vue-next`
