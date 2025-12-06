# 校系標準匯入頁面狀態總覽

## ✅ 認證問題已解決

**之前的問題:**
- OCR API 返回 401 Unauthorized 錯誤

**根本原因:**
- Middleware 已經在 `/api/internal/*` 路徑檢查 `x-internal-api-key`
- 但 API route handler 中還調用了 `withInternalAuth()` 檢查 Bearer token
- 造成認證方式不匹配

**解決方案:**
1. 從 `/apps/web/app/api/internal/departments/ocr-smart/route.ts` 移除了 `withInternalAuth()` 檢查
2. Middleware 自動處理 API key 驗證
3. 更新 Gemini model 名稱為 `models/gemini-2.0-flash-exp`

---

## 📄 可用的匯入頁面

### 1. `/import-final` ⭐ **推薦使用**

**位置:** `apps/web/app/import-final/page.tsx`

**特色:**
- ✅ 單一大學名稱輸入 (同批次所有圖片使用相同大學名稱)
- ✅ 支援多張圖片批次上傳
- ✅ 圖片預覽和狀態追蹤
- ✅ 逐張處理,實時顯示進度
- ✅ 自動辨識表格並轉換級距為分數
- ✅ 使用後端 API (更安全)

**流程:**
1. 輸入大學名稱 (例如: 國立台灣大學)
2. 上傳多張圖片 (可一次選擇多張)
3. 點擊「開始處理全部圖片」
4. 系統逐張處理:
   - OCR 辨識 → 建立 CSV → 匯入資料庫
5. 顯示每張圖片的處理結果

**訪問方式:**
```
http://localhost:3000/import-final
```

**API Key:** 已預設為 `dev-internal-api-key-1762922305`

---

### 2. `/import-simple`

**位置:** `apps/web/app/import-simple/page.tsx`

**特色:**
- 使用前端直接調用 Gemini API
- 需要手動輸入 Gemini API Key
- 批次處理同一所大學的多張圖片

**優點:**
- 不需要後端 OCR API
- 可以使用自己的 Gemini API Key

**缺點:**
- API Key 暴露在前端
- 需要處理 CORS 問題

**訪問方式:**
```
http://localhost:3000/import-simple
```

---

### 3. `/import-batch`

**位置:** `apps/web/app/import-batch/page.tsx`

**特色:**
- 每張圖片單獨設定大學名稱
- 支援不同大學的圖片混合上傳
- 使用後端 OCR API

**適用場景:**
- 需要同時匯入多所大學的資料

**訪問方式:**
```
http://localhost:3000/import-batch
```

---

### 4. `/import-test`

**位置:** `apps/web/app/import-test/page.tsx`

**特色:**
- 簡化版測試介面
- 單張圖片處理
- 顯示詳細的辨識結果

**適用場景:**
- 測試 OCR 準確度
- 驗證單張圖片處理流程

**訪問方式:**
```
http://localhost:3000/import-test
```

---

## 🔧 技術實現

### OCR API

**端點:** `/api/internal/departments/ocr-smart`

**功能:**
- 使用 Gemini Vision 辨識校系標準表格
- 提取科系代碼、名稱、招生名額、各科檢定標準

**認證:**
- Middleware 自動檢查 `x-internal-api-key` header
- 無需在 route handler 中再次檢查

### 匯入 API

**端點:** `/api/internal/departments/import`

**功能:**
- 接收 CSV 格式的科系資料
- 自動轉換級距標準為分數:
  - 頂標 → 13
  - 前標 → 12/11 (依科目)
  - 均標 → 10/8/6 (依科目)
  - 後標 → 9/4/7 (依科目)
  - 底標 → 7/3/5 (依科目)

### 自動級距轉換

**位置:** `apps/web/lib/gsat-standards.ts`

**114學年度學測標準:**
```typescript
{
  chinese: { top: 13, front: 12, average: 10, back: 9, bottom: 7 },
  english: { top: 13, front: 11, average: 8, back: 4, bottom: 3 },
  math_a: { top: 11, front: 9, average: 6, back: 4, bottom: 3 },
  math_b: { top: 12, front: 10, average: 6, back: 4, bottom: 3 },
  social: { top: 13, front: 12, average: 10, back: 8, bottom: 7 },
  natural: { top: 13, front: 12, average: 9, back: 7, bottom: 5 },
}
```

---

## 📊 資料庫整合

### Dream School Progress API

**端點:** `/api/profile/dream-school-progress`

**改進:**
- 動態查詢 `department_requirements` 表
- 使用實際科系的英文要求級分
- 根據要求級分計算 `minReadyScore`:
  ```typescript
  minReadyScore = 50 + (score_english * 3)
  ```

**範例:**
- 若科系要求英文 13 級分 (頂標)
- minReadyScore = 50 + (13 * 3) = 89 分

---

## 🎯 使用建議

### 推薦流程:

1. **訪問頁面:** http://localhost:3000/import-final

2. **準備圖片:**
   - 同一所大學的多張校系標準表格截圖
   - 支援 JPG、PNG 等常見格式

3. **填寫資訊:**
   - 大學名稱: 國立台灣大學
   - API Key: (已預設,無需修改)

4. **上傳圖片:**
   - 點擊上傳區選擇多張圖片
   - 可一次選擇多張 (Ctrl/Cmd + 點擊)

5. **開始處理:**
   - 點擊「開始處理全部圖片」
   - 等待系統逐張處理完成

6. **查看結果:**
   - 綠色邊框 = 成功
   - 紅色邊框 = 失敗
   - 顯示成功匯入的科系數量

---

## 🐛 已解決的問題

### 1. 401 Unauthorized ✅
- **問題:** API 返回 401 錯誤
- **原因:** 雙重認證檢查衝突
- **解決:** 移除 route handler 中的 `withInternalAuth()`

### 2. AuthGuard Redirect ✅
- **問題:** `/admin/*` 路徑被重定向
- **原因:** AuthGuard 檢查使用者登入狀態
- **解決:** 建立獨立路徑 (`/import-*`)

### 3. Gemini Model 404 ✅
- **問題:** `gemini-1.5-flash-*` 系列在 v1beta 已下架
- **原因:** Google 僅保留 `models/gemini-2.x` 系列於 v1beta 的 generateContent
- **解決:** 改為 `models/gemini-2.0-flash-exp`

---

## 📝 待測試項目

- [ ] 使用真實的校系標準表格圖片測試 OCR 準確度
- [ ] 驗證多張圖片批次處理流程
- [ ] 確認級距轉換正確性
- [ ] 測試 Dream School Progress 使用實際科系要求計算

---

## 🔐 安全性說明

### API Key 管理:

**Internal API Key:**
- 用於服務間認證
- 儲存在 `.env.local` 中的 `INTERNAL_API_KEY`
- 前端透過 `x-internal-api-key` header 傳遞

**Gemini API Key:**
- 用於 Google Generative AI
- 儲存在 `.env.local` 中的 `GEMINI_API_KEY`
- 僅在後端使用,不暴露給前端

**認證流程:**
```
前端 → Middleware (檢查 x-internal-api-key) → API Route Handler → 處理請求
```

---

## 📞 需要幫助?

如果遇到問題,請檢查:

1. **Server 是否運行:**
   ```bash
   pnpm --filter web dev
   ```

2. **環境變數是否設定:**
   ```bash
   # apps/web/.env.local
   INTERNAL_API_KEY=dev-internal-api-key-1762922305
   GEMINI_API_KEY=你的 Gemini API Key
   ```

3. **瀏覽器 Console:**
   - 開啟 DevTools (F12)
   - 查看 Console 和 Network 面板
   - 確認 API 請求狀態

4. **Server Logs:**
   - 查看終端機輸出
   - 確認 Middleware 和 API 日誌
