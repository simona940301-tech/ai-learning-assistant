# 🚀 開始 P4: 統一 API 回應格式 - 快速啟動指南

> **前置條件**: Milestone 1 已完成 ✅
> **預計時程**: 2-3 週
> **影響範圍**: 124+ 個 API routes

---

## Step 1: 建立基礎設施（Day 1-2）

### 1.1 建立 Response Helper

建立檔案 `apps/web/lib/api/response.ts`：

```typescript
import { NextResponse } from 'next/server'

export class ApiResponseBuilder {
  static success<T>(data: T, meta?: Record<string, any>): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      meta
    })
  }

  static error(
    code: string,
    message: string,
    status: number = 400,
    details?: any
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: { code, message, details }
      },
      { status }
    )
  }

  // 常用錯誤快捷方法
  static unauthorized(message = 'Authentication required'): NextResponse {
    return this.error('AUTH_REQUIRED', message, 401)
  }

  static forbidden(message = 'Permission denied'): NextResponse {
    return this.error('FORBIDDEN', message, 403)
  }

  static notFound(resource = 'Resource'): NextResponse {
    return this.error('NOT_FOUND', `${resource} not found`, 404)
  }

  static badRequest(message: string, details?: any): NextResponse {
    return this.error('INVALID_INPUT', message, 400, details)
  }

  static serverError(message = 'Internal server error'): NextResponse {
    return this.error('INTERNAL_ERROR', message, 500)
  }
}

// 簡化的 alias
export const Api = ApiResponseBuilder
```

### 1.2 定義 API 型別

建立檔案 `apps/web/lib/types/api.ts`：

```typescript
export type ApiSuccessResponse<T = any> = {
  success: true
  data: T
  meta?: {
    page?: number
    pageSize?: number
    total?: number
    timestamp?: string
  }
}

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// 常用錯誤代碼
export enum ApiErrorCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

---

## Step 2: 遷移第一個 API 作為範例（Day 2）

### 選擇簡單的 API 開始

推薦從 `/api/health/route.ts` 開始：

**Before**:
```typescript
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
```

**After**:
```typescript
import { Api } from '@/lib/api/response'

export async function GET() {
  return Api.success({ status: 'ok' })
}
```

### 測試驗證

```bash
# 測試 API
curl http://localhost:3000/api/health

# 預期回應
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

---

## Step 3: 建立遷移檢查工具（Day 3）

建立檔案 `scripts/check-api-migration.ts`：

```typescript
import { glob } from 'glob'
import { readFileSync } from 'fs'

async function checkMigration() {
  const apiFiles = await glob('apps/web/app/api/**/route.ts')
  const migrated: string[] = []
  const notMigrated: string[] = []

  for (const file of apiFiles) {
    const content = readFileSync(file, 'utf-8')
    if (content.includes('ApiResponseBuilder') || content.includes('from \'@/lib/api/response\'')) {
      migrated.push(file)
    } else {
      notMigrated.push(file)
    }
  }

  console.log(`\n📊 API 遷移進度報告\n`)
  console.log(`總數: ${apiFiles.length}`)
  console.log(`已遷移: ${migrated.length} (${Math.round(migrated.length / apiFiles.length * 100)}%)`)
  console.log(`未遷移: ${notMigrated.length}\n`)

  if (notMigrated.length > 0) {
    console.log(`待遷移的 API:`)
    notMigrated.forEach(f => {
      const route = f.replace('apps/web/app/api/', '/api/').replace('/route.ts', '')
      console.log(`  - ${route}`)
    })
  }
}

checkMigration()
```

執行檢查：
```bash
npx tsx scripts/check-api-migration.ts
```

---

## Step 4: 批量遷移策略（Day 4-10）

### 優先級分組

#### 第一批: Auth & User (10 個 routes)
```
/api/auth/*
/api/user/status
/api/profile/*
```

#### 第二批: Core Features (15 個 routes)
```
/api/ai/solve
/api/ai/explain
/api/ai/route-solver
/api/explain/*
```

#### 第三批: 其他功能 (99+ routes)
按 Domain 分組，每天遷移 10-15 個

### 遷移範本

**典型錯誤處理改寫**:

Before:
```typescript
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

After:
```typescript
import { Api } from '@/lib/api/response'

if (!user) {
  return Api.unauthorized()
}
```

**典型成功回應改寫**:

Before:
```typescript
return NextResponse.json({ success: true, data: result })
```

After:
```typescript
return Api.success(result)
```

---

## Step 5: 更新前端 API Client（Day 11-12）

更新 `apps/web/lib/api-client.ts`：

```typescript
import type { ApiResponse } from '@/lib/types/api'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options)

  if (!res.ok && res.status >= 500) {
    throw new ApiError('INTERNAL_ERROR', 'Server error occurred')
  }

  const json: ApiResponse<T> = await res.json()

  if (!json.success) {
    throw new ApiError(
      json.error.code,
      json.error.message,
      json.error.details
    )
  }

  return json.data
}

// 使用範例
async function getProfile() {
  try {
    const profile = await apiCall<Profile>('/api/profile')
    console.log(profile)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === 'AUTH_REQUIRED') {
        // 跳轉到登入頁
      } else {
        // 顯示錯誤訊息
        toast.error(err.message)
      }
    }
  }
}
```

---

## Step 6: 驗證與測試（Day 13-14）

### 自動化測試腳本

建立 `scripts/test-api-responses.ts`：

```typescript
async function testApiFormat(url: string) {
  const res = await fetch(`http://localhost:3000${url}`)
  const json = await res.json()

  // 檢查格式
  if (!('success' in json)) {
    console.error(`❌ ${url} - 缺少 success 欄位`)
    return false
  }

  if (json.success && !('data' in json)) {
    console.error(`❌ ${url} - 成功回應缺少 data 欄位`)
    return false
  }

  if (!json.success && !('error' in json)) {
    console.error(`❌ ${url} - 錯誤回應缺少 error 欄位`)
    return false
  }

  console.log(`✅ ${url} - 格式正確`)
  return true
}

// 測試所有公開 API
const publicApis = [
  '/api/health',
  '/api/packs',
  // ... 更多 API
]

for (const api of publicApis) {
  await testApiFormat(api)
}
```

### 手動測試清單

- [ ] Ask 頁面功能正常
- [ ] 登入/登出功能正常
- [ ] 對戰功能正常
- [ ] 錯誤訊息正確顯示
- [ ] Loading 狀態正常

---

## 常見問題

### Q1: 如何處理 SSE (Server-Sent Events) API？

A: SSE 不需要遷移，它們使用 `ReadableStream` 而不是 JSON。

### Q2: 如何處理檔案上傳 API？

A: 檔案上傳通常返回 multipart/form-data，可以選擇性遷移。

### Q3: 如何處理第三方 webhook？

A: webhook 端點不需要遷移，因為它們不是給前端使用的。

---

## 進度追蹤

使用以下指令查看進度：

```bash
# 查看遷移進度
npx tsx scripts/check-api-migration.ts

# 測試 API 格式
npx tsx scripts/test-api-responses.ts

# 運行 E2E 測試
pnpm test
```

---

## 完成檢查清單

- [ ] `ApiResponseBuilder` 已建立並測試
- [ ] API 型別已定義
- [ ] 遷移檢查工具已建立
- [ ] 第一批 API (Auth & User) 已遷移
- [ ] 第二批 API (Core Features) 已遷移
- [ ] 第三批 API (其他) 已遷移
- [ ] 前端 API Client 已更新
- [ ] 所有頁面功能正常
- [ ] 錯誤處理邏輯統一
- [ ] E2E 測試通過
- [ ] API 文檔已更新

---

**預計完成日期**: 2-3 週後
**下一步**: M2-P1 統一資料模型

**詳細計劃**: 見 `MILESTONE_2_P4_API_RESPONSE_FORMAT.md`
