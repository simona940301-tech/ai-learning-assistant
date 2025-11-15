# 🛡️ 如何保護架構規則不被破壞

> **目的**: 確保架構規範持續執行，防止代碼退化  
> **狀態**: 強制執行

---

## 🚨 核心保護機制

### 1. 自動檢查（已配置）

#### ESLint 規則

**位置**: `.eslintrc.json`

**保護內容**:
- ❌ 禁止 Route 直接導入 `@/lib/tutor-utils` 的 `supabase`
- ❌ 禁止 Route 直接查詢數據庫（`supabase.from()`）

**觸發時機**:
- 編輯器實時檢查（VS Code）
- `npm run lint` 時檢查
- Git commit 前（如果配置了 pre-commit hook）

**違規示例**:
```typescript
// ❌ 會觸發 ESLint 錯誤
import { supabase } from '@/lib/tutor-utils'

export async function POST(req: Request) {
  const { data } = await supabase.from('keypoints')... // ❌ 也會觸發錯誤
}
```

#### 架構檢查腳本

**位置**: `scripts/check-architecture.ts`

**檢查項**:
- Route 文件不超過 100 行
- Route 不直接導入 supabase
- Route 使用 ApiResponseBuilder

**使用方法**:
```bash
npm run check-architecture
```

**輸出示例**:
```
🔍 檢查架構規範...

📁 找到 34 個 Route 文件

  ✓ 檢查: apps/web/app/api/solve/route.ts
  ✓ 檢查: apps/web/app/api/tutor/answer/route.ts
  ✓ 檢查: apps/web/app/api/warmup/keypoint-mcq/route.ts
  ...

✅ 所有 Route 文件符合架構規範！
```

---

### 2. 代碼審查流程

#### PR 審查檢查清單

**必須檢查**（使用 `CODE_REVIEW_CHECKLIST.md`）:
1. ✅ Route 文件不超過 100 行
2. ✅ 沒有直接導入 `supabase`
3. ✅ 使用 `ApiResponseBuilder` (ok/fail)
4. ✅ 業務邏輯在 Service 層
5. ✅ 數據訪問在 Repo 層

**檢查命令**:
```bash
# 1. 檢查 Route 文件大小
find apps/web/app/api -name "route.ts" -exec wc -l {} \; | awk '$1 > 100'

# 2. 檢查是否直接導入 supabase
grep -r "from '@/lib/tutor-utils'" apps/web/app/api

# 3. 檢查是否使用 ApiResponseBuilder
grep -r "ok\|fail" apps/web/app/api --include="*.ts"
```

---

### 3. CI/CD 集成

#### GitHub Actions 範例

```yaml
# .github/workflows/architecture-check.yml
name: Architecture Check

on:
  pull_request:
    paths:
      - 'apps/web/app/api/**'
      - 'apps/web/lib/services/**'
      - 'apps/web/lib/dal/**'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm --filter web lint
      - run: pnpm --filter web type-check
      - run: pnpm --filter web check-architecture
      - run: pnpm --filter web test:contract
```

**違規會阻止 PR 合併**

---

## 📋 日常開發流程

### 修改 Route 時

**步驟**:
1. 閱讀 `ARCHITECTURE.md` 了解規範
2. 參考樣板代碼（`app/api/solve/route.ts`）
3. 修改代碼
4. 運行檢查：
   ```bash
   npm run lint
   npm run check-architecture
   ```

### 提交代碼前

**必須執行**:
```bash
npm run pre-commit
```

**包含**:
- `npm run lint` - ESLint 檢查
- `npm run type-check` - TypeScript 類型檢查
- `npm run check-architecture` - 架構規範檢查

### PR 提交時

**CI 會自動檢查**:
- ✅ ESLint 規則
- ✅ 架構規範
- ✅ TypeScript 類型
- ✅ 契約測試（如果配置）

**違規會阻止合併**

---

## 🚫 常見違規與修正

### 違規 1: Route 文件過大

**問題**:
```
❌ Route 文件超過 100 行（實際：250 行）
```

**修正步驟**:
1. 識別業務邏輯部分
2. 創建對應的 Service 類
3. 將業務邏輯移到 Service
4. Route 只保留請求處理

**參考**: `app/api/solve/route.ts` (92 行)

### 違規 2: 直接導入 supabase

**問題**:
```typescript
// ❌ 違規
import { supabase } from '@/lib/tutor-utils'
```

**修正步驟**:
1. 創建對應的 Repo 類
2. 在 Route 中創建 Repo 實例
3. 通過 Repo 訪問數據

**參考**: `app/api/tutor/answer/route.ts`

### 違規 3: 手動構建響應

**問題**:
```typescript
// ❌ 違規
return NextResponse.json({
  success: true,
  data: result
})
```

**修正步驟**:
```typescript
// ✅ 正確
import { ok } from '@/lib/utils/api-response-builder'
return NextResponse.json(ok(result))
```

---

## 🔒 強制執行機制

### 1. ESLint 錯誤級別

**已配置**: `error`（會阻止構建）

**未重構的 Route**: 降級為 `warn`（暫時允許，但標記為 TODO）

### 2. 架構檢查腳本

**狀態**: 必須通過才能合併 PR

**檢查項**:
- Route 文件大小
- 直接導入 supabase
- 使用 ApiResponseBuilder

### 3. 代碼審查

**必須通過**: `CODE_REVIEW_CHECKLIST.md` 中的所有檢查項

---

## 📚 參考文檔

### 必讀文檔

1. **ARCHITECTURE.md** - 架構規範（必讀）
2. **CODE_REVIEW_CHECKLIST.md** - 審查清單（PR 時使用）
3. **ARCHITECTURE_GUARD.md** - 保護機制（詳細說明）
4. **TESTING_GUIDE.md** - 測試指南

### 樣板代碼

1. **app/api/solve/route.ts** - Route 樣板（92 行）
2. **app/api/tutor/answer/route.ts** - Route 樣板（70 行）
3. **app/api/warmup/keypoint-mcq/route.ts** - Route 樣板（95 行）
4. **lib/services/solve-service.ts** - Service 樣板
5. **lib/dal/keypoint-repo.ts** - Repo 樣板

---

## ✅ 檢查清單（每次 PR 前）

- [ ] 運行 `npm run lint` 通過
- [ ] 運行 `npm run type-check` 通過
- [ ] 運行 `npm run check-architecture` 通過
- [ ] Route 文件不超過 100 行
- [ ] 沒有直接導入 `supabase`
- [ ] 使用 `ApiResponseBuilder` (ok/fail)
- [ ] 業務邏輯在 Service 層
- [ ] 數據訪問在 Repo 層
- [ ] 通過代碼審查檢查清單

---

## 🎯 關鍵原則

### 1. Route 層職責

**只做**:
- ✅ 請求解析和驗證
- ✅ 調用 Service
- ✅ 構建響應

**不做**:
- ❌ 直接查詢數據庫
- ❌ 複雜業務邏輯
- ❌ 數據轉換

### 2. Service 層職責

**只做**:
- ✅ 業務流程編排
- ✅ 業務規則封裝
- ✅ 調用 Repo 獲取數據

**不做**:
- ❌ 直接查詢數據庫
- ❌ HTTP 相關邏輯

### 3. Repo 層職責

**只做**:
- ✅ 純數據庫操作
- ✅ 數據格式轉換（僅數據庫格式）

**不做**:
- ❌ 業務邏輯
- ❌ 業務規則判斷

---

## 🚨 緊急情況處理

### 如果必須違規

**流程**:
1. 在 PR 中說明原因
2. 添加 `// eslint-disable-next-line` 註釋
3. 附上 TODO 註釋說明何時修正
4. 獲得架構負責人批准

**範例**:
```typescript
// TODO: 緊急修復，需在 1 週內重構
// eslint-disable-next-line no-restricted-imports
import { supabase } from '@/lib/tutor-utils'
```

---

## 📞 問題反饋

**遇到問題時**:
1. 查閱本文檔
2. 參考樣板代碼
3. 聯繫架構負責人

**緊急情況**:
- 創建 Issue 標記 `[architecture]`
- 在 PR 中 @ 架構負責人

---

**重要提醒**: 所有檢查必須通過才能合併 PR。違規代碼將被拒絕。

**保護機制狀態**: ✅ 已全部配置並運行正常

