# M2-P4: 統一 API 回應格式

> **目標**: 建立標準化的 API 回應結構，消除 124+ 個 API routes 的格式不一致問題
> **預計工時**: 2-3 週
> **依賴**: 無（可獨立進行）
> **優先級**: 高（為所有後續重構打基礎）

---

## 1. 問題現狀

### 當前混亂的回應格式

```typescript
// 格式 1: { success: true }
POST /api/missions/complete
→ { success: true, data: { ... } }

// 格式 2: { ok: true }
GET /api/packs
→ { ok: true, packs: [...] }

// 格式 3: 直接返回資料
GET /api/user/status
→ { xp: 100, level: 5, ... }

// 格式 4: { error: '...' }
POST /api/explain
→ { error: 'Authentication required' }

// 格式 5: NextResponse.json 混用
→ NextResponse.json({ message: '...' }, { status: 401 })
```

### 影響範圍

- **124+ 個 API routes**（`apps/web/app/api/**/route.ts`）
- 前端需處理多種格式，錯誤處理邏輯複雜
- TypeScript 型別定義困難
- 新開發者入職成本高

---

## 2. 目標設計

### 統一的 API 回應格式

```typescript
// 成功回應
{
  success: true,
  data: T,              // 實際資料
  meta?: {              // 可選的 metadata
    page?: number,
    total?: number,
    timestamp?: string
  }
}

// 錯誤回應
{
  success: false,
  error: {
    code: string,       // 錯誤代碼 (e.g., 'AUTH_REQUIRED', 'INVALID_INPUT')
    message: string,    // 用戶友善的錯誤訊息
    details?: any       // 開發用的詳細資訊
  }
}
```

### 型別定義

```typescript
// apps/web/lib/types/api.ts
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
```

---

## 3. 實作策略

### 3.1 建立統一的 Response Helper

```typescript
// apps/web/lib/api/response.ts

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
        error: {
          code,
          message,
          details
        }
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
```

### 3.2 遷移範例

#### Before (舊格式)

```typescript
// apps/web/app/api/missions/complete/route.ts
export async function POST(req: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const mission = await completeMission(user.id)
  if (!mission) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: mission
  })
}
```

#### After (新格式)

```typescript
// apps/web/app/api/missions/complete/route.ts
import { ApiResponseBuilder as Api } from '@/lib/api/response'

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) {
    return Api.unauthorized()
  }

  const mission = await completeMission(user.id)
  if (!mission) {
    return Api.notFound('Mission')
  }

  return Api.success(mission)
}
```

---

## 4. 任務拆解

### ✅ T4.1 - 建立統一的 Response Helper

**目標**: 建立可重用的 API 回應建構工具

**工作內容**:
- 建立 `apps/web/lib/api/response.ts`
- 實作 `ApiResponseBuilder` class
- 加入常用錯誤方法（401, 403, 404, 400, 500）
- 撰寫單元測試

**驗收標準**:
- `ApiResponseBuilder` 可正常使用
- 所有方法都返回正確的 HTTP 狀態碼
- TypeScript 型別完整

---

### ✅ T4.2 - 定義統一的 API 型別

**目標**: 為前端提供完整的型別定義

**工作內容**:
- 建立 `apps/web/lib/types/api.ts`
- 定義 `ApiResponse`, `ApiSuccessResponse`, `ApiErrorResponse`
- 匯出常用的錯誤代碼 enum
- 更新 `apps/web/lib/api-client.ts` 使用新型別

**驗收標準**:
- 前端可正確推斷 API 回應型別
- 錯誤處理有型別提示
- 無 TypeScript 錯誤

---

### ⏳ T4.3 - 遷移高優先級 API（第一批）

**範圍**: 認證相關 API（10 個 routes）

**API 清單**:
- `/api/auth/*`
- `/api/user/status`
- `/api/profile/*`

**工作方式**:
1. 逐一檢視每個 API 的回應格式
2. 改用 `ApiResponseBuilder`
3. 更新對應的前端呼叫（如果有）
4. 測試功能正常

**驗收標準**:
- 所有 Auth & User API 使用新格式
- 前端功能正常運作
- 無回歸 bug

---

### ⏳ T4.4 - 遷移核心功能 API（第二批）

**範圍**: Ask、Explain、Solve 相關 API（15 個 routes）

**API 清單**:
- `/api/ai/solve`
- `/api/ai/explain`
- `/api/ai/route-solver`
- `/api/explain/*`
- `/api/summary/*`

**注意事項**:
- 這些是高流量 API，需特別小心
- 建議使用 Feature Flag 控制新格式的啟用
- 充分測試錯誤處理

**驗收標準**:
- Ask 頁面功能正常
- 錯誤訊息對用戶友善
- 效能無退化

---

### ⏳ T4.5 - 遷移其他 API（第三批）

**範圍**: 剩餘的 99+ 個 API routes

**分組策略**:
1. Missions & Daily Tasks (10 routes)
2. Battle & Play (15 routes)
3. Backpack & RAG (12 routes)
4. Packs & Store (8 routes)
5. Community & Onboarding (10+ routes)
6. Admin & Internal (剩餘)

**工作方式**:
- 每天遷移 10-15 個 API
- 分批部署，觀察錯誤率
- 使用自動化腳本協助遷移

**驗收標準**:
- 所有 API 使用新格式
- E2E 測試通過
- 無重大 bug

---

### ⏳ T4.6 - 更新前端 API Client

**目標**: 統一前端的 API 呼叫邏輯

**工作內容**:
- 更新 `apps/web/lib/api-client.ts`
- 建立統一的錯誤處理邏輯
- 支援自動重試（可選）
- 加入 loading 狀態管理

**範例**:

```typescript
// apps/web/lib/api-client.ts
export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options)
  const json: ApiResponse<T> = await res.json()

  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message, json.error.details)
  }

  return json.data
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
  }
}
```

**驗收標準**:
- 前端統一使用 `apiCall` 方法
- 錯誤處理邏輯一致
- 有良好的 TypeScript 型別推斷

---

### ⏳ T4.7 - 建立遷移檢查工具

**目標**: 自動化檢查未遷移的 API

**工作內容**:
- 撰寫 Node.js 腳本掃描所有 API routes
- 檢查是否使用 `ApiResponseBuilder`
- 產生遷移進度報告

**腳本範例**:

```typescript
// scripts/check-api-migration.ts
import { glob } from 'glob'
import { readFileSync } from 'fs'

const apiFiles = glob.sync('apps/web/app/api/**/route.ts')
const notMigrated: string[] = []

for (const file of apiFiles) {
  const content = readFileSync(file, 'utf-8')
  if (!content.includes('ApiResponseBuilder')) {
    notMigrated.push(file)
  }
}

console.log(`遷移進度: ${apiFiles.length - notMigrated.length}/${apiFiles.length}`)
console.log(`未遷移的 API:`)
notMigrated.forEach(f => console.log(`  - ${f}`))
```

**驗收標準**:
- 腳本可正確統計遷移進度
- 可輸出未遷移的 API 清單
- 整合到 CI 檢查

---

### ⏳ T4.8 - 撰寫 API 規範文檔

**目標**: 讓團隊知道如何正確使用新格式

**工作內容**:
- 建立 `docs/API_GUIDELINES.md`
- 說明統一的回應格式
- 提供常見範例
- 說明錯誤代碼規範

**驗收標準**:
- 新開發者能快速理解規範
- 有清楚的範例程式碼
- 列出所有錯誤代碼和含義

---

## 5. 風險與應對

### 風險 1: 破壞現有前端邏輯

**影響**: 前端依賴舊格式，突然改變會導致錯誤

**應對**:
- 分批遷移，每批只改 10-15 個 API
- 每次遷移後立即測試對應的前端頁面
- 使用 Feature Flag 控制新格式啟用

### 風險 2: 回歸 Bug

**影響**: 遷移過程中可能引入新 bug

**應對**:
- 每個 API 遷移後都要測試
- 保留舊程式碼 7 天，隨時可 revert
- 使用自動化測試（如 Playwright）

### 風險 3: 遷移時間過長

**影響**: 124+ 個 API 遷移需要大量時間

**應對**:
- 建立自動化遷移腳本（正則替換）
- 優先遷移高流量 API
- 低流量或 Admin API 可延後遷移

---

## 6. 成功指標

- ✅ 所有 API 使用統一格式
- ✅ 前端錯誤處理邏輯統一
- ✅ API 文檔完整
- ✅ 無重大回歸 bug
- ✅ TypeScript 型別覆蓋率 100%

---

## 7. 排程建議

### Week 1: 建立基礎設施
- Day 1-2: T4.1 建立 Response Helper
- Day 3: T4.2 定義 API 型別
- Day 4-5: T4.7 建立檢查工具

### Week 2: 高優先級 API 遷移
- Day 1-2: T4.3 Auth & User API
- Day 3-5: T4.4 Explain & Solve API

### Week 3: 批量遷移與收尾
- Day 1-3: T4.5 遷移剩餘 API（分批）
- Day 4: T4.6 更新前端 API Client
- Day 5: T4.8 撰寫文檔

---

## 8. 下一步

完成 P4 後，可以開始：
- **P1 - 統一資料模型**（合併重複的筆記/書包表）
- **P2 - 簡化 AI 詳解 Pipeline**（需要 P6 先完成）

---

**建立日期**: 2025-01
**狀態**: 📋 Planning
**負責人**: TBD
