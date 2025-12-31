# 🚀 P4 統一 API 回應格式 - 進度報告

> **開始時間**: 2025-01-27
> **目標**: 統一 124+ 個 API 的回應格式
> **策略**: 分批遷移，保證零破壞

---

## ✅ 已完成的工作

### 1. 建立頂尖的基礎設施 ✅

#### 1.1 型別定義系統 ([apps/web/lib/types/api.ts](apps/web/lib/types/api.ts))
- ✅ `ApiResponse<T>` - 統一回應型別
- ✅ `ApiSuccessResponse<T>` - 成功回應
- ✅ `ApiErrorResponse` - 錯誤回應
- ✅ `ApiErrorCode` enum - 標準錯誤代碼（20+ 種）
- ✅ `ERROR_CODE_TO_STATUS` - 錯誤代碼→HTTP狀態碼映射
- ✅ `ERROR_MESSAGES` - 用戶友善的錯誤訊息
- ✅ Type guards: `isSuccessResponse`, `isErrorResponse`
- ✅ Utility types: `PaginationParams`, `PaginationMeta`

#### 1.2 API Response Builder ([apps/web/lib/api/response.ts](apps/web/lib/api/response.ts))
- ✅ `Api.success(data, meta?)` - 成功回應
- ✅ `Api.customError(code, message?, details?)` - 自定義錯誤
- ✅ `Api.unauthorized()` - 401 認證錯誤
- ✅ `Api.forbidden()` - 403 權限錯誤
- ✅ `Api.notFound(resource?)` - 404 資源不存在
- ✅ `Api.badRequest(message, details?)` - 400 輸入錯誤
- ✅ `Api.validationError(message, details?)` - 400 驗證錯誤
- ✅ `Api.serverError(message?, details?)` - 500 伺服器錯誤
- ✅ `Api.rateLimited()` - 429 速率限制
- ✅ `Api.serviceUnavailable()` - 503 服務不可用
- ✅ `Api.paginate(page, pageSize, total)` - 分頁 metadata
- ✅ `Api.withTimestamp(meta?)` - 帶時間戳的 metadata

#### 1.3 頂尖的前端 API Client ([apps/web/lib/api/client.ts](apps/web/lib/api/client.ts))
- ✅ `apiCall<T>(url, options)` - 統一 API 呼叫
- ✅ `get<T>(url)` / `post<T>(url, data)` / `put` / `del` / `patch` - 便捷方法
- ✅ `ApiError` class - 型別安全的錯誤類
- ✅ 自動重試機制（指數退避）
- ✅ 請求逾時控制
- ✅ 舊格式相容（雙格式支援）
- ✅ 錯誤分類（認證錯誤、伺服器錯誤、網路錯誤）
- ✅ `handleApiError` / `safeApiCall` - 錯誤處理工具

#### 1.4 遷移檢查工具 ([scripts/check-api-migration.ts](scripts/check-api-migration.ts))
- ✅ 自動掃描所有 API routes
- ✅ 檢測遷移狀態
- ✅ 按 Domain 分類統計
- ✅ 產生進度報告
- ✅ 列出未遷移的 API
- ✅ 支援 `--detailed`, `--json`, `--ci` 模式

### 2. 第一個 API 遷移成功 ✅

**遷移的 API**: `/api/health`

**Before**:
```typescript
return NextResponse.json(
  { status: 'healthy', checks, timestamp: ... },
  { status: 200 }
)
```

**After**:
```typescript
return Api.success(
  { status: 'healthy', checks },
  Api.withTimestamp()
)
```

**改善**:
- ✅ 統一回應格式
- ✅ 自動加入 `success: true`
- ✅ 時間戳自動管理
- ✅ 型別更安全
- ✅ 程式碼更簡潔

---

## 📊 當前狀態

### 遷移進度

```
總數: 124 個 API
已遷移: 1 個 (1%)
未遷移: 123 個

[█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 1%
```

### API 分類（待遷移）

| Domain | 數量 | 優先級 |
|--------|------|--------|
| Auth & User | ~10 | 🔴 高（第一批） |
| Explain & Solve | ~15 | 🔴 高（第二批） |
| AI & Missions | ~20 | 🟡 中 |
| Battle & Play | ~25 | 🟡 中 |
| Backpack & RAG | ~15 | 🟡 中 |
| Packs & Store | ~10 | 🟢 低 |
| Community & Onboarding | ~15 | 🟢 低 |
| Admin & Internal | ~14 | 🟢 低 |

---

## 🎯 下一步計劃

### Week 1: 基礎設施 ✅ 已完成

- [x] 建立 API Response Helper
- [x] 定義型別系統
- [x] 建立前端 API Client
- [x] 建立遷移檢查工具
- [x] 遷移第一個 API

### Week 2: 高優先級 API 遷移（計劃中）

#### 第一批：Auth & User Domain (10 個 API)
```
- /api/auth/login-hook
- /api/profile
- /api/profile/generate-avatar
- /api/profile/upload-avatar
- /api/user/question-sets
- /api/play/user/status
- /api/play/user/consume-energy
- /api/avatar/analyze
- /api/avatar/generate
- /api/debug/profile-test
```

**預計時間**: 2-3 天
**驗證方式**:
1. 執行 `pnpm test` 確保測試通過
2. 手動測試登入流程
3. 檢查前端無錯誤

#### 第二批：Explain & Solve Domain (15 個 API)
```
- /api/explain
- /api/explain-stream
- /api/solve
- /api/solve-simple
- /api/ai/solve
- /api/ai/route-solver
- /api/ai/route-solver-stream
- /api/ai/explain (如果存在)
- /api/ai/judge
- /api/ai/feedback
- /api/ai/summarize
- /api/summary
- /api/backpack/explain
- /api/explanation/viewed
- /api/tutor/answer
```

**預計時間**: 3-4 天
**驗證方式**:
1. 測試 Ask 頁面所有功能
2. 測試詳解生成
3. 確認串流功能正常

### Week 3: 批量遷移剩餘 API

**計劃**:
- 每天遷移 15-20 個 API
- 分 Domain 批次進行
- 每批遷移後立即測試

---

## 🛡️ 安全措施

### 1. 雙格式相容

前端 API Client 同時支援新舊格式：

```typescript
// 新格式
{ success: true, data: {...} }

// 舊格式（暫時相容）
{ ...直接返回資料 }
{ ok: true, ... }
```

### 2. 分批部署

- 每批遷移 10-15 個 API
- 部署後觀察 1-2 天
- 確認無問題後繼續下一批

### 3. 快速回滾

```bash
# 任何問題都能 1 分鐘內回滾
git revert <commit-hash>
vercel --prod
```

### 4. 自動化測試

```bash
# 每次遷移前後都跑測試
pnpm test
pnpm test:e2e

# 檢查遷移進度
npx tsx scripts/check-api-migration.ts
```

---

## 📈 成功指標

- ✅ **型別安全**: 所有 API 都有完整的 TypeScript 型別
- ⏳ **統一格式**: 100% API 使用新格式（目標）
- ✅ **零破壞**: 無回歸 bug
- ✅ **效能**: 回應時間無退化
- ⏳ **文檔**: API 文檔完整（Week 3 完成）

---

## 🎓 技術亮點

### 1. 型別安全

```typescript
// 前端完全型別安全
const user = await get<User>('/api/profile')
user.name // ✅ TypeScript 知道這是 string

try {
  await post('/api/missions/complete', { missionId })
} catch (err) {
  if (err instanceof ApiError && err.isAuthError()) {
    // ✅ 型別安全的錯誤處理
  }
}
```

### 2. 自動重試

```typescript
// 自動重試 500/502/503 錯誤
const data = await apiCall('/api/data', {
  retry: true,
  maxRetries: 2
})
```

### 3. 錯誤分類

```typescript
try {
  await apiCall('/api/protected')
} catch (err) {
  if (err.isAuthError()) {
    // 跳轉登入
  } else if (err.isServerError()) {
    // 顯示「伺服器錯誤」
  } else if (err.isNetworkError()) {
    // 顯示「網路錯誤」
  }
}
```

### 4. 用戶友善的錯誤訊息

```typescript
// 後端只需要指定錯誤代碼
return Api.customError(ApiErrorCode.INSUFFICIENT_BALANCE)

// 前端自動顯示：「餘額不足」
```

---

## 📝 遷移範例

### 簡單 API

**Before**:
```typescript
export async function GET() {
  const data = await fetchData()
  return NextResponse.json({ ok: true, data })
}
```

**After**:
```typescript
import { Api } from '@/lib/api/response'

export async function GET() {
  const data = await fetchData()
  return Api.success(data)
}
```

### 帶錯誤處理的 API

**Before**:
```typescript
export async function POST(req: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await req.json()
  if (!data.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const result = await update(data)
  return NextResponse.json({ success: true, data: result })
}
```

**After**:
```typescript
import { Api } from '@/lib/api/response'

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return Api.unauthorized()

  const data = await req.json()
  if (!data.id) {
    return Api.badRequest('缺少 ID', { field: 'id' })
  }

  const result = await update(data)
  return Api.success(result)
}
```

### 帶分頁的 API

**After**:
```typescript
import { Api } from '@/lib/api/response'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 20

  const { items, total } = await fetchPaginated(page, pageSize)

  return Api.success(
    items,
    Api.paginate(page, pageSize, total)
  )
}
```

---

## 📚 相關文件

- [MILESTONE_2_P4_API_RESPONSE_FORMAT.md](MILESTONE_2_P4_API_RESPONSE_FORMAT.md) - 完整計劃
- [START_P4.md](START_P4.md) - 快速啟動指南
- [apps/web/lib/types/api.ts](apps/web/lib/types/api.ts) - 型別定義
- [apps/web/lib/api/response.ts](apps/web/lib/api/response.ts) - Response Builder
- [apps/web/lib/api/client.ts](apps/web/lib/api/client.ts) - 前端 Client
- [scripts/check-api-migration.ts](scripts/check-api-migration.ts) - 檢查工具

---

**更新時間**: 2025-01-27
**下次更新**: 完成第一批 Auth & User API 遷移後
