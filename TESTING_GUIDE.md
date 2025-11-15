# 🧪 測試指南

> **用途**: 冒煙測試、契約測試、架構檢查的完整指南

---

## 📋 快速測試（3 分鐘冒煙測試）

### A. Solve API 測試

```bash
# 成功響應測試
curl -s -X POST http://localhost:4001/api/solve \
  -H "Content-Type: application/json" \
  -d '{"subject":"math","prompt":"解方程 x+1=2","mode":"step"}' | jq '.success, .data.subject, .data.detected_keypoint, .data.phase'

# 預期輸出：
# true
# "math"
# "math_equation_solving"
# "solve"
```

**判讀口訣**:
- ✅ `success` 應為 `true`
- ✅ 舊欄位仍在 `data` 裡（`subject`, `detected_keypoint`, `phase`）
- ❌ 不該出現 `fail/SOLVE_ERROR`

### B. Explain API 測試

```bash
curl -s -X POST http://localhost:4001/api/explain \
  -H "Content-Type: application/json" \
  -d '{"input":{"text":"What is the answer?"},"mode":"fast"}' | jq '.markdown, .status'

# 預期輸出：
# "## 📝 題目\n..."
# "success"
```

**判讀口訣**:
- ✅ API 正常運行（未重構的路由）
- ✅ 響應包含 `markdown` 字段

### C. Warmup API 測試

```bash
curl -s -X POST http://localhost:4001/api/warmup/keypoint-mcq \
  -H "Content-Type: application/json" \
  -d '{"prompt":"數學題目","subject":"math"}' | jq '.phase, .subject'

# 預期輸出：
# "warmup"
# "math"
```

**判讀口訣**:
- ✅ API 正常運行（未重構的路由）
- ⚠️ ESLint 警告：直接導入 `supabase`（已標記為 TODO）

---

## 🔍 架構檢查

### 1. ESLint 檢查

```bash
npm run lint
```

**預期結果**:
- ✅ `/api/solve` - 通過（符合架構規範）
- ⚠️ `/api/tutor/answer` - 警告（直接導入 supabase，待重構）
- ⚠️ `/api/warmup/keypoint-mcq` - 警告（直接導入 supabase，待重構）

### 2. TypeScript 檢查

```bash
npm run type-check
```

**預期結果**:
- ✅ `/api/solve` 相關代碼無類型錯誤
- ⚠️ 可能有一些現有的類型錯誤（與重構無關）

### 3. 架構檢查腳本

```bash
npm run check-architecture
```

**需要先安裝依賴**:
```bash
npm install -D tsx
```

**檢查項**:
- Route 文件不超過 100 行
- Route 不直接導入 supabase
- Route 使用 ApiResponseBuilder

---

## 📝 契約測試

### 運行契約測試

```bash
# 安裝依賴
npm install -D vitest

# 運行測試
npm run test:contract
```

### 測試文件

**位置**: `apps/web/tests/contract/solve.contract.spec.ts`

**測試項目**:
1. ✅ 成功響應格式檢查
2. ✅ 錯誤響應格式檢查
3. ✅ 向後兼容性檢查（舊字段仍存在）

### 契約測試目的

**確保**:
- 響應格式不變（`{ success: true, data: {...} }`）
- 舊字段仍在 `data` 中
- 錯誤格式正確（`{ success: false, error: "..." }`）

**觸發時機**:
- CI/CD 自動運行
- PR 提交前檢查
- 手動運行：`npm run test:contract`

---

## 🚨 問題排查

### 問題 1: API 返回錯誤

**症狀**: `{"success":false,"error":"SUBJECT_NOT_FOUND"}`

**原因**: 數據庫中沒有對應的科目

**解決**:
1. 檢查數據庫是否有 `math` 或 `english` 科目
2. 使用實際存在的科目名稱
3. 或先創建測試數據

### 問題 2: ESLint 錯誤

**症狀**: `Route 禁止直接使用 supabase`

**原因**: 未重構的 Route 直接導入 supabase

**解決**:
1. 參考 `/api/solve` 的樣板進行重構
2. 或暫時忽略（已降級為警告）

### 問題 3: 架構檢查失敗

**症狀**: `Route 文件超過 100 行`

**原因**: Route 包含過多業務邏輯

**解決**:
1. 將業務邏輯移到 Service 層
2. 將數據訪問移到 Repo 層
3. Route 只保留請求處理

---

## 🔄 回滾流程

### 如果功能出現問題

**最小回滾單位**: 只還原 `app/api/solve/route.ts` 到重構前版本

**步驟**:
1. 從 Git 歷史恢復舊版本
2. Service/DAL 層保留（不影響）
3. 前端無需修改（API 接口不變）

**回滾後**:
1. 開新分支修復問題
2. 重跑測試驗證
3. 再次部署

---

## ✅ 檢查清單

### 每次修改 Route 後

- [ ] 運行 `npm run lint` 通過
- [ ] 運行 `npm run type-check` 通過
- [ ] 運行 `npm run check-architecture` 通過
- [ ] 手動測試 API 端點
- [ ] 運行契約測試

### 每次 PR 提交前

- [ ] 所有測試通過
- [ ] 架構檢查通過
- [ ] 代碼審查通過
- [ ] 文檔更新（如有需要）

---

## 📚 參考文檔

1. **ARCHITECTURE.md** - 架構規範
2. **CODE_REVIEW_CHECKLIST.md** - 審查清單
3. **ARCHITECTURE_GUARD.md** - 保護機制
4. **SMOKE_TEST_RESULTS.md** - 測試結果
5. **app/api/solve/route.ts** - 樣板 Route

---

**重要提醒**: 所有測試必須通過才能合併 PR。違規代碼將被拒絕。

