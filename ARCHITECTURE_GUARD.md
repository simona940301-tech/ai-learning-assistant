# 🛡️ 架構保護機制使用指南

> **目的**: 確保架構規範不被破壞，保護代碼質量  
> **狀態**: 強制執行

---

## 🚨 如何保護架構規則不被破壞

### 一、自動檢查機制

#### 1. ESLint 規則（已配置）

**位置**: `.eslintrc.json`

**保護內容**:
- ❌ 禁止 Route 直接導入 `@/lib/tutor-utils` 的 `supabase`
- ❌ 禁止 Route 直接查詢數據庫（`supabase.from()`）

**觸發時機**: 
- 編輯器實時檢查
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

#### 2. 架構檢查腳本（已配置）

**位置**: `scripts/check-architecture.ts`

**檢查內容**:
- Route 文件不超過 100 行
- Route 不直接導入 supabase
- Route 使用 ApiResponseBuilder

**使用方法**:
```bash
# 手動檢查
npm run check-architecture

# 或在 CI 中自動檢查
npm run pre-commit
```

**輸出示例**:
```
🔍 檢查架構規範...

📁 找到 15 個 Route 文件

  ✓ 檢查: apps/web/app/api/solve/route.ts
  ✓ 檢查: apps/web/app/api/explain/route.ts
  ...

✅ 所有 Route 文件符合架構規範！
```

**違規輸出**:
```
❌ 發現架構違規：

1. [ROUTE_FILE_SIZE] apps/web/app/api/solve/route.ts
    Route 文件超過 100 行（實際：250 行），必須重構

2. [DIRECT_SUPABASE_IMPORT] apps/web/app/api/explain/route.ts
   Route 禁止直接導入 supabase，請使用 Service/Repo 層
```

---

### 二、代碼審查流程

#### PR 審查檢查清單

**必須檢查**:
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

### 三、CI/CD 集成

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
      - run: pnpm --filter web check-architecture
      - run: pnpm --filter web lint
      - run: pnpm --filter web type-check
```

---

### 四、開發流程保護

#### 1. 本地開發時

**每次修改 Route 後**:
```bash
# 自動檢查（如果配置了 watch）
npm run check-architecture

# 或手動檢查
npm run lint
```

#### 2. 提交代碼前

**必須執行**:
```bash
npm run pre-commit
```

**包含**:
- `npm run lint` - ESLint 檢查
- `npm run type-check` - TypeScript 類型檢查
- `npm run check-architecture` - 架構規範檢查

#### 3. PR 提交時

**CI 會自動檢查**:
- ✅ ESLint 規則
- ✅ 架構規範
- ✅ TypeScript 類型

**違規會阻止合併**

---

### 五、常見違規與修正

#### 違規 1: Route 文件過大

**問題**:
```
❌ Route 文件超過 100 行（實際：250 行）
```

**修正步驟**:
1. 識別業務邏輯部分
2. 創建對應的 Service 類
3. 將業務邏輯移到 Service
4. Route 只保留請求處理

#### 違規 2: 直接導入 supabase

**問題**:
```typescript
// ❌ 違規
import { supabase } from '@/lib/tutor-utils'
```

**修正步驟**:
1. 創建對應的 Repo 類
2. 在 Route 中創建 Repo 實例
3. 通過 Repo 訪問數據

```typescript
// ✅ 正確
import { createClient } from '@/lib/supabase/server'
import { KeypointRepo } from '@/lib/dal/keypoint-repo'

const db = createClient()
const repo = new KeypointRepo(db)
const data = await repo.getBySubjectId(id)
```

#### 違規 3: 手動構建響應

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

### 六、緊急情況處理

#### 如果必須違規

**流程**:
1. 在 PR 中說明原因
2. 添加 `// @ts-ignore` 或 `// eslint-disable-next-line` 註釋
3. 附上 TODO 註釋說明何時修正
4. 獲得架構負責人批准

**範例**:
```typescript
// TODO: 緊急修復，需在 1 週內重構
// eslint-disable-next-line no-restricted-imports
import { supabase } from '@/lib/tutor-utils'
```

---

### 七、監控與報告

#### 定期架構審計

**頻率**: 每週一次

**檢查項目**:
- Route 文件大小統計
- 違規模式分析
- 架構退化趨勢

**報告格式**:
```markdown
## 架構健康報告 (2025-01-XX)

### Route 文件大小
- ✅ 符合規範: 12 個
- ⚠️ 接近限制 (80-100 行): 2 個
- ❌ 違規 (>100 行): 1 個

### 違規統計
- 直接導入 supabase: 0 次
- 手動構建響應: 0 次
- 文件過大: 1 次
```

---

### 八、培訓與文檔

#### 新成員入職

**必須閱讀**:
1. `ARCHITECTURE.md` - 架構規範
2. `CODE_REVIEW_CHECKLIST.md` - 審查清單
3. `ARCHITECTURE_GUARD.md` - 本文檔

**必須完成**:
1. 理解三層分工原則
2. 通過架構檢查測試
3. 完成一個樣板 Route 重構

---

### 九、工具與資源

#### 開發工具

**VS Code 擴展**:
- ESLint - 實時檢查
- TypeScript - 類型檢查

**命令行工具**:
```bash
# 檢查架構
npm run check-architecture

# 檢查類型
npm run type-check

# 檢查代碼風格
npm run lint
```

#### 參考文檔

- `ARCHITECTURE.md` - 架構規範
- `CODE_REVIEW_CHECKLIST.md` - 審查清單
- `app/api/solve/route.ts` - 樣板 Route
- `lib/services/solve-service.ts` - 樣板 Service
- `lib/dal/keypoint-repo.ts` - 樣板 Repo

---

### 十、問題反饋

**遇到問題時**:
1. 查閱本文檔
2. 參考樣板代碼
3. 聯繫架構負責人

**緊急情況**:
- 創建 Issue 標記 `[architecture]`
- 在 PR 中 @ 架構負責人

---

## ✅ 檢查清單（每次 PR 前）

- [ ] 運行 `npm run check-architecture` 通過
- [ ] 運行 `npm run lint` 通過
- [ ] 運行 `npm run type-check` 通過
- [ ] Route 文件不超過 100 行
- [ ] 沒有直接導入 `supabase`
- [ ] 使用 `ApiResponseBuilder` (ok/fail)
- [ ] 業務邏輯在 Service 層
- [ ] 數據訪問在 Repo 層
- [ ] 通過代碼審查檢查清單

---

**重要提醒**: 所有檢查必須通過才能合併 PR。違規代碼將被拒絕。

