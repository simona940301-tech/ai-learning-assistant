# 🏗️ 專案架構規範

> **最後更新**: 2025-01-XX  
> **狀態**: 強制執行

---

## 📋 核心原則

### 三層分工（嚴格執行）

```
┌─────────────────────────────────────┐
│   Route Layer (app/api/)             │
│   - 收參、驗證                        │
│   - 回應構建                          │
│   - 錯誤轉譯                          │
│   ❌ 禁止：查 DB、跑流程              │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Service Layer (lib/services/)     │
│   - 商業流程編排                      │
│   - 業務規則                          │
│   - 依賴注入                          │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   DAL/Repo Layer (lib/dal/)         │
│   - 純 SQL/Supabase CRUD            │
│   - 無商業邏輯                        │
└─────────────────────────────────────┘
```

---

## 🚫 Route 層規範（app/api/）

### ✅ 允許做的事

1. **請求解析**
   ```typescript
   const body = await request.json()
   const validated = Schema.parse(body)
   ```

2. **調用 Service**
   ```typescript
   const service = new SolveService(new KeypointRepo(db))
   const result = await service.solve(validated)
   ```

3. **響應構建**
   ```typescript
   return NextResponse.json(ok(result))
   ```

4. **錯誤轉譯**
   ```typescript
   catch (e) {
     return NextResponse.json(fail('ERROR_CODE', e.message), { status: 400 })
   }
   ```

### ❌ 禁止做的事

1. **直接查詢數據庫**
   ```typescript
   // ❌ 禁止
   const { data } = await supabase.from('keypoints').select('*')
   
   // ✅ 正確
   const repo = new KeypointRepo(supabase)
   const data = await repo.getBySubjectId(subjectId)
   ```

2. **複雜業務邏輯**
   ```typescript
   // ❌ 禁止
   if (keypoint.confidence > 0.8) {
     // 複雜判斷邏輯
   }
   
   // ✅ 正確：移到 Service 層
   const result = await service.matchKeypoint(options)
   ```

3. **直接導入全局 supabase**
   ```typescript
   // ❌ 禁止
   import { supabase } from '@/lib/tutor-utils'
   
   // ✅ 正確
   import { createClient } from '@/lib/supabase/server'
   const db = createClient()
   ```

### 📏 文件大小限制

- **Route 文件不得超過 100 行**
- 超過 100 行必須重構，將業務邏輯移到 Service 層

### ⚠️ 暫時豁免名單

- `app/api/tutor/answer/route.ts`
- `app/api/warmup/keypoint-mcq/route.ts`

> 以上 Route 仍在重構排程中，暫時允許 `no-restricted-imports` 以警告方式執行。重構時請參考 `app/api/solve/route.ts` 作為標準實作。

---

## 🔧 Service 層規範（lib/services/）

### ✅ 職責

1. **業務流程編排**
   ```typescript
   async solve(input: SolveRequest): Promise<SolveResponse> {
     // 1. 獲取數據
     const subject = await this.repo.getSubjectByName(input.subject)
     // 2. 執行業務規則
     const keypoints = await this.repo.getBySubjectId(subject.id)
     // 3. 編排流程
     const matched = await this.matchKeypoint(keypoints, input.prompt)
     // 4. 返回結果
     return { explanation: '...', keypoint: matched }
   }
   ```

2. **業務規則封裝**
   ```typescript
   private matchKeypoint(keypoints: Keypoint[], prompt: string) {
     // 業務規則：匹配算法
   }
   ```

3. **依賴注入**
   ```typescript
   constructor(
     private repo: KeypointRepo,
     private aiService?: AIService
   ) {}
   ```

### ❌ 禁止做的事

1. **直接數據庫操作**
   ```typescript
   // ❌ 禁止
   const { data } = await this.supabase.from('keypoints')...
   
   // ✅ 正確：通過 Repo
   const data = await this.repo.getBySubjectId(id)
   ```

2. **HTTP 相關邏輯**
   ```typescript
   // ❌ 禁止
   return NextResponse.json(...)
   
   // ✅ 正確：返回純數據
   return { success: true, data: ... }
   ```

---

## 💾 DAL/Repo 層規範（lib/dal/）

### ✅ 職責

1. **純數據訪問**
   ```typescript
   async getSubjectByName(name: string): Promise<Subject | null> {
     const { data, error } = await this.db
       .from('subjects')
       .select('*')
       .eq('name', name)
       .single()
     
     if (error) throw error
     return data
   }
   ```

2. **接收 SupabaseClient 作為依賴**
   ```typescript
   constructor(private db: SupabaseClient) {}
   ```

### ❌ 禁止做的事

1. **業務邏輯**
   ```typescript
   // ❌ 禁止
   async getSubjectByName(name: string) {
     const data = await this.db.from('subjects')...
     // ❌ 業務邏輯
     if (data.confidence > 0.8) {
       return data
     }
     return null
   }
   
   // ✅ 正確：純數據訪問
   async getSubjectByName(name: string) {
     const { data } = await this.db.from('subjects')...
     return data
   }
   ```

2. **數據轉換（除非是數據庫格式轉換）**
   ```typescript
   // ❌ 禁止：業務轉換
   async getKeypoints(subjectId: string) {
     const data = await this.db.from('keypoints')...
     // ❌ 業務邏輯轉換
     return data.map(kp => ({
       ...kp,
       displayName: `${kp.name} (${kp.category})`
     }))
   }
   ```

---

## 📦 命名規範

### 文件命名

- **Route**: `route.ts` (Next.js 約定)
- **Service**: `{domain}-service.ts` (e.g., `solve-service.ts`)
- **Repo**: `{domain}-repo.ts` (e.g., `keypoint-repo.ts`)
- **Utils**: `{purpose}-utils.ts` (e.g., `api-response-builder.ts`)

### 類命名

- **Service**: `{Domain}Service` (e.g., `SolveService`)
- **Repo**: `{Domain}Repo` (e.g., `KeypointRepo`)
- **Utils**: 使用函數導出，不使用類

### 方法命名

- **查詢**: `get*`, `find*`, `fetch*`
- **創建**: `create*`, `insert*`
- **更新**: `update*`, `patch*`
- **刪除**: `delete*`, `remove*`
- **業務邏輯**: 動詞 + 名詞 (e.g., `matchKeypoint`, `buildResponse`)

---

## 🔒 依賴注入規範

### Service 層

```typescript
// ✅ 正確：通過構造函數注入
export class SolveService {
  constructor(
    private repo: KeypointRepo,
    private aiService?: AIService
  ) {}
}

// ❌ 錯誤：直接導入全局實例
import { supabase } from '@/lib/tutor-utils'
export class SolveService {
  async solve() {
    const data = await supabase.from('keypoints')... // ❌
  }
}
```

### Route 層

```typescript
// ✅ 正確：創建實例並注入
export async function POST(req: Request) {
  const db = createClient()
  const repo = new KeypointRepo(db)
  const service = new SolveService(repo)
  const result = await service.solve(input)
}

// ❌ 錯誤：使用全局實例
import { supabase } from '@/lib/tutor-utils'
export async function POST(req: Request) {
  const data = await supabase.from('keypoints')... // ❌
}
```

---

## 📝 響應格式規範

### 統一使用 ApiResponseBuilder

```typescript
import { ok, fail } from '@/lib/utils/api-response-builder'

// ✅ 成功響應
return NextResponse.json(ok(result))

// ✅ 錯誤響應
return NextResponse.json(fail('ERROR_CODE', message), { status: 400 })
```

### 響應格式

```typescript
// 成功
{
  success: true,
  data: T
}

// 錯誤
{
  success: false,
  error: string,
  message?: string
}
```

---

## 🧪 測試要求

### Service 層

- **必須有單元測試**
- **必須 Mock Repo 依賴**
- **測試覆蓋率 ≥ 80%**

```typescript
describe('SolveService', () => {
  it('should solve question', async () => {
    const mockRepo = {
      getSubjectByName: jest.fn().mockResolvedValue({ id: '1', name: 'math' }),
      getBySubjectId: jest.fn().mockResolvedValue([...])
    }
    const service = new SolveService(mockRepo)
    const result = await service.solve({ subject: 'math', question: '...' })
    expect(result).toBeDefined()
  })
})
```

### Route 層

- **必須有集成測試**
- **測試 API 端點行為**

---

## 🚨 違規處理

### 自動檢查

1. **ESLint 規則**：禁止 Route 直接導入 supabase
2. **CI 腳本**：檢查 Route 文件大小
3. **TypeScript**：強制類型檢查

### 審查流程

1. PR 必須通過架構檢查
2. 違規代碼必須修正才能合併
3. 架構文檔必須更新

---

## 📚 參考範例

### ✅ 正確範例

見 `CODE_REVIEW_CHECKLIST.md` 中的樣板代碼。

### ❌ 錯誤範例

見各層「禁止做的事」章節。

---

## 🔄 遷移計劃

### 階段 1：建立規範（本週）
- ✅ 創建架構文檔
- ✅ 恢復 ApiResponseBuilder
- ✅ 建立樣板 API

### 階段 2：漸進重構（下週）
- 逐條重構 API Routes
- 補上 Lint 規則
- 添加 CI 檢查

### 階段 3：完善測試（本月）
- Service 層單元測試
- Route 層集成測試
- 測試覆蓋率達標

---

## 📞 問題反饋

如有架構相關問題，請：
1. 查閱本文檔
2. 參考樣板代碼
3. 聯繫架構負責人

---

**重要提醒**：此架構規範為強制執行，所有新代碼必須遵循。違規代碼將被拒絕合併。

