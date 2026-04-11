# VibeInventory 開發進度接續指引 (Continuation Plan)

本文件紀錄了截至 2026-04-11 的開發進度，供後續接手開發使用。

## ✅ 目前已完成內容

### 1. 前端開發 (Vue 3 / Vite)
- **基礎設施**: 已配置好 Tailwind CSS v3、Element Plus (繁體中文)、Pinia 以及 Vue Router。
- **全域規劃**: 實作了 `AppLayout.vue`，包含長輩友善的導航（字體 18px+、按鈕 56px+）與道場切換邏輯。
- **權限系統**: 實作了三級 RBAC (Owner > Admin > Staff > Pending)，具備路由守衛防止未授權存取。
- **功能頁面**:
    - `LoginView`: Google & LINE 登入。
    - `DashboardView`: 品項庫存即時預覽。
    - `InventoryView`: 核心入出庫功能（使用 Firestore Transaction 確保正確度）。
    - `TransactionsView`: 歷史流水帳。
    - `ReportsView`: 橫向 ExcelJS 導出與 A4 橫向列印 CSS。
    - `ImportView`: 初期庫存 Excel 批次匯入工具（含預覽與驗證功能）。
    - `UsersView`: 系統總管專用的權限管理頁。

### 2. Firebase 後端配置 (已產出檔案)
- `firestore.rules`: 完整的 RBAC 安全性規則（如：僅 Owner 可改 role）。
- `firestore.indexes.json`: 針對交易紀錄查詢的最佳化索引。
- `functions/index.js`: 支援 LINE Login OAuth 換取自訂 Token 的 Cloud Function v2。

---

## 🛠️ 下一步需要執行的操作 (接續重點)

### 第一步：安裝 Functions 依賴
目前根目錄已安裝完成，但 Firebase Functions 需要獨立安裝：
```bash
cd functions
npm install
```

### 第二步：設定 LINE Login 憑證 (Secret Manager)
系統採用密鑰管理，請執行以下指令將 LINE Channel 資訊寫入 Firebase：
```bash
firebase functions:secrets:set LINE_CHANNEL_ID
# 輸入您的 LINE Channel ID
firebase functions:secrets:set LINE_CHANNEL_SECRET
# 輸入您的 LINE Channel Secret
```

### 第三步：部署到 Firebase
這會一次性上傳安全性規則、索引、Functions 以及 Hosting：
```bash
# 確保已登入 firebase login
firebase deploy
```

### 第四步：實體測試與驗證
1. **認證測試**: 測試 Google 登入後是否被導向 `/pending` 頁。
2. **手動提權**: 到 Firebase Console 的 Firestore `users` 集合中，手動將您自己的 `role` 改為 `owner`。
3. **功能流程**:
    - 建立第一個「道場」與「品項」。
    - 試用 `ImportView` 匯入初期庫存。
    - 執行一筆入庫，檢查 `stocks` 集合是否正確累加。
    - 導出 Excel 檢查格式。

---

## 📝 待辦事項 (未完成功能)
- [ ] 匯出 Excel 中的「公式」動態計算（目前為數值填充）。
- [ ] 歷史紀錄的分頁加載（目前為固定 50 筆）。
- [ ] 離線模式下的 UI 提醒（雖然 Firestore 已開 Persistence）。
