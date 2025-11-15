# ✅ 代碼審查檢查清單

> **用途**: PR 審查時使用，確保代碼符合架構規範  
> **狀態**: 強制執行

---

## 📋 Route 層檢查（app/api/**/route.ts）

### 文件大小
- [ ] Route 文件不超過 **100 行**
- [ ] 超過 100 行必須重構，將業務邏輯移到 Service 層

### 導入檢查
- [ ] ❌ 沒有直接導入 `@/lib/tutor-utils` 的 `supabase`
- [ ] ❌ 沒有直接導入全局 `supabase` 實例
- [ ] ✅ 使用 `createClient()` 創建 Supabase 客戶端
- [ ] ✅ 通過 Service/Repo 訪問數據

### 業務邏輯檢查
- [ ] ❌ 沒有直接查詢數據庫（`supabase.from(...)`）
- [ ] ❌ 沒有複雜的業務邏輯判斷
- [ ] ✅ 所有業務邏輯都在 Service 層
- [ ] ✅ Route 只負責：解析請求、調用 Service、構建響應

### 響應格式檢查
- [ ] ✅ 使用 `ApiResponseBuilder` 構建響應
- [ ] ✅ 成功響應：`ok(data)`
- [ ] ✅ 錯誤響應：`fail(errorCode, message)`
- [ ] ❌ 沒有手動構建響應對象

### 錯誤處理檢查
- [ ] ✅ 使用統一的錯誤處理
- [ ] ✅ 錯誤碼符合 `ERROR_MAP.ts` 規範
- [ ] ✅ 錯誤消息清晰明確

### 代碼結構檢查
```typescript
// ✅ 正確結構（樣板）
export async function POST(req: Request) {
  try {
    // 1. 解析請求
    const input = await req.json()
    const validated = Schema.parse(input)
    
    // 2. 創建依賴
    const db = createClient()
    const repo = new KeypointRepo(db)
    const service = new SolveService(repo)
    
    // 3. 調用 Service
    const result = await service.solve(validated)
    
    // 4. 返回響應
    return NextResponse.json(ok(result))
  } catch (e: any) {
    return NextResponse.json(fail('ERROR_CODE', e.message), { status: 400 })
  }
}
```

---

## 🔧 Service 層檢查（lib/services/**/*.ts）

### 依賴注入檢查
- [ ] ✅ 通過構造函數接收依賴
- [ ] ✅ 不直接導入全局實例
- [ ] ✅ 依賴類型明確（TypeScript 類型）

### 業務邏輯檢查
- [ ] ✅ 封裝業務規則和流程
- [ ] ✅ 不包含數據庫查詢（通過 Repo）
- [ ] ✅ 不包含 HTTP 相關邏輯

### 方法命名檢查
- [ ] ✅ 查詢方法：`get*`, `find*`, `fetch*`
- [ ] ✅ 業務方法：動詞 + 名詞（e.g., `matchKeypoint`）
- [ ] ✅ 命名清晰、語義明確

### 代碼結構檢查
```typescript
// ✅ 正確結構（樣板）
export class SolveService {
  constructor(
    private repo: KeypointRepo,
    private aiService?: AIService
  ) {}
  
  async solve(input: SolveRequest): Promise<SolveResponse> {
    // 1. 獲取數據（通過 Repo）
    const subject = await this.repo.getSubjectByName(input.subject)
    
    // 2. 執行業務邏輯
    const keypoints = await this.repo.getBySubjectId(subject.id)
    const matched = await this.matchKeypoint(keypoints, input.prompt)
    
    // 3. 返回結果
    return { explanation: '...', keypoint: matched }
  }
  
  private matchKeypoint(keypoints: Keypoint[], prompt: string) {
    // 業務規則封裝
  }
}
```

---

## 💾 DAL/Repo 層檢查（lib/dal/**/*.ts）

### 數據訪問檢查
- [ ] ✅ 純數據庫操作，無業務邏輯
- [ ] ✅ 接收 `SupabaseClient` 作為依賴
- [ ] ✅ 方法只做 CRUD 操作

### 錯誤處理檢查
- [ ] ✅ 數據庫錯誤直接拋出
- [ ] ✅ 不在此層處理業務錯誤

### 方法命名檢查
- [ ] ✅ 查詢：`get*`, `find*`
- [ ] ✅ 創建：`create*`, `insert*`
- [ ] ✅ 更新：`update*`, `patch*`
- [ ] ✅ 刪除：`delete*`, `remove*`

### 代碼結構檢查
```typescript
// ✅ 正確結構（樣板）
export class KeypointRepo {
  constructor(private db: SupabaseClient) {}
  
  async getSubjectByName(name: string): Promise<Subject | null> {
    const { data, error } = await this.db
      .from('subjects')
      .select('*')
      .eq('name', name)
      .single()
    
    if (error) throw error
    return data
  }
  
  async getBySubjectId(subjectId: string): Promise<Keypoint[]> {
    const { data, error } = await this.db
      .from('keypoints')
      .select('*')
      .eq('subject_id', subjectId)
    
    if (error) throw error
    return data ?? []
  }
}
```

---

## 🧪 測試檢查

### Service 層測試
- [ ] ✅ 有單元測試文件
- [ ] ✅ Mock 了 Repo 依賴
- [ ] ✅ 測試覆蓋主要業務流程
- [ ] ✅ 測試覆蓋率 ≥ 80%

### Route 層測試
- [ ] ✅ 有集成測試文件
- [ ] ✅ 測試 API 端點行為
- [ ] ✅ 測試錯誤處理

---

## 📝 文檔檢查

- [ ] ✅ 複雜邏輯有註釋說明
- [ ] ✅ 公開方法有 JSDoc
- [ ] ✅ 類型定義清晰

---

## 🚨 常見違規模式

### ❌ Route 層違規

```typescript
// ❌ 違規 1: 直接查詢數據庫
export async function POST(req: Request) {
  const { data } = await supabase.from('keypoints').select('*')
  return NextResponse.json(data)
}

// ❌ 違規 2: 複雜業務邏輯
export async function POST(req: Request) {
  const keypoints = await getKeypointsForSubject(subjectId)
  // 複雜的匹配邏輯...
  const matched = keypoints.find(kp => {
    // 50+ 行業務邏輯
  })
}

// ❌ 違規 3: 手動構建響應
export async function POST(req: Request) {
  return NextResponse.json({
    success: true,
    data: result
  })
}
```

### ❌ Service 層違規

```typescript
// ❌ 違規 1: 直接查詢數據庫
export class SolveService {
  async solve() {
    const { data } = await supabase.from('keypoints')...
  }
}

// ❌ 違規 2: HTTP 相關邏輯
export class SolveService {
  async solve() {
    return NextResponse.json({...}) // ❌
  }
}
```

### ❌ Repo 層違規

```typescript
// ❌ 違規 1: 業務邏輯
export class KeypointRepo {
  async getBySubjectId(id: string) {
    const data = await this.db.from('keypoints')...
    // ❌ 業務邏輯
    if (data.confidence > 0.8) {
      return data
    }
    return null
  }
}
```

---

## ✅ 樣板代碼（參考）

### Route 樣板

```typescript
// app/api/solve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SolveService } from '@/lib/services/solve-service'
import { KeypointRepo } from '@/lib/dal/keypoint-repo'
import { ok, fail } from '@/lib/utils/api-response-builder'

const SolveRequestSchema = z.object({
  subject: z.string(),
  question: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const input = await req.json()
    const validated = SolveRequestSchema.parse(input)
    
    const db = createClient()
    const repo = new KeypointRepo(db)
    const service = new SolveService(repo)
    
    const result = await service.solve(validated)
    return NextResponse.json(ok(result))
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(fail('VALIDATION_ERROR', e.message), { status: 400 })
    }
    return NextResponse.json(fail('SOLVE_ERROR', e.message), { status: 500 })
  }
}
```

### Service 樣板

```typescript
// lib/services/solve-service.ts
import type { KeypointRepo } from '@/lib/dal/keypoint-repo'

export interface SolveRequest {
  subject: string
  question: string
}

export interface SolveResponse {
  explanation: string
  keypoint: string
}

export class SolveService {
  constructor(private repo: KeypointRepo) {}
  
  async solve(input: SolveRequest): Promise<SolveResponse> {
    const subject = await this.repo.getSubjectByName(input.subject)
    if (!subject) {
      throw new Error('SUBJECT_NOT_FOUND')
    }
    
    const keypoints = await this.repo.getBySubjectId(subject.id)
    const matched = await this.matchKeypoint(keypoints, input.question)
    
    return {
      explanation: '...',
      keypoint: matched.code,
    }
  }
  
  private async matchKeypoint(keypoints: any[], prompt: string) {
    // 業務邏輯：匹配算法
    return keypoints[0]
  }
}
```

### Repo 樣板

```typescript
// lib/dal/keypoint-repo.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Subject {
  id: string
  name: string
}

export interface Keypoint {
  id: string
  code: string
  name: string
  subject_id: string
}

export class KeypointRepo {
  constructor(private db: SupabaseClient) {}
  
  async getSubjectByName(name: string): Promise<Subject | null> {
    const { data, error } = await this.db
      .from('subjects')
      .select('id, name')
      .eq('name', name)
      .single()
    
    if (error) throw error
    return data
  }
  
  async getBySubjectId(subjectId: string): Promise<Keypoint[]> {
    const { data, error } = await this.db
      .from('keypoints')
      .select('*')
      .eq('subject_id', subjectId)
    
    if (error) throw error
    return data ?? []
  }
}
```

---

## 🔍 自動檢查命令

```bash
# 檢查 Route 文件大小
find apps/web/app/api -name "route.ts" -exec wc -l {} \; | awk '$1 > 100'

# 檢查 Route 是否直接導入 supabase
grep -r "from '@/lib/tutor-utils'" apps/web/app/api

# 檢查是否使用 ApiResponseBuilder
grep -r "ApiResponseBuilder\|ok\|fail" apps/web/app/api
```

---

## 📞 審查流程

1. **提交 PR** → 自動觸發 CI 檢查
2. **CI 失敗** → 修正代碼
3. **人工審查** → 使用此檢查清單
4. **通過檢查** → 合併 PR

---

**重要提醒**：所有檢查項必須通過才能合併 PR。違規代碼將被拒絕。

