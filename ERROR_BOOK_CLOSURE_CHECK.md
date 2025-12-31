# 「詳解卡內容加到錯題本」完整性檢查報告

日期: 2025-11-15
分支: fix-explaincard-rollback

---

## 執行摘要

整個「詳解卡 → 錯題本」的流程存在**設計混亂**的問題：

1. **backpack_notes** (儲存詳解筆記) 和 **error_book** (記錄錯題) 是兩個獨立系統
2. ExplainCard 實際上是保存到 **backpack_notes**，而非 **error_book**
3. 「加入錯題本」的按鈕文案誤導，實際效果是加到 backpack
4. 缺少 error_book 的前端呈現和完整的 CRUD 操作

---

## 1. API Endpoints 詳細分析

### 1.1 錯題本 (Error Book) API - 獨立系統
**檔案**: `/Users/simonac/Desktop/moonshot idea/apps/web/app/api/error-book/route.ts`

#### GET /api/error-book
```typescript
export async function GET(req: NextRequest)
```
- **目的**: 查詢用戶的錯題本
- **認證**: 需要登入 (auth.getUser())
- **查詢參數**:
  - `subject`: 篩選科目
  - `status`: 'active' (預設) | 'mastered' | 'all'
- **返回資料**:
  ```json
  {
    "success": true,
    "items": [
      {
        "id": "UUID",
        "question_id": "UUID",
        "user_id": "UUID",
        "status": "active",
        "last_attempted_at": "ISO-8601",
        "created_at": "ISO-8601",
        "pack_questions": {
          "id", "stem", "choices", "answer", "explanation", "difficulty"
        },
        "packs": {
          "id", "subject", "skill"
        }
      }
    ],
    "count": number
  }
  ```

#### POST /api/error-book
```typescript
export async function POST(req: NextRequest)
```
- **目的**: 新增或更新錯題
- **認證**: 需要登入
- **請求體**:
  ```json
  {
    "questionId": "UUID (必須)"
  }
  ```
- **邏輯流程**:
  1. 檢查該題目是否已在錯題本中 (status='active')
  2. 如果存在 → 只更新 `last_attempted_at`
  3. 如果不存在 → 插入新記錄，狀態預設為 'active'
- **返回**: 新建或更新的 error_book 項目

**問題**: 
- 無法更新 status (如標記為 'mastered')
- 無法刪除錯題
- 無法批量操作

---

### 1.2 Backpack Save API - 用於詳解保存
**檔案**: `/Users/simonac/Desktop/moonshot idea/apps/web/app/api/backpack/save/route.ts`

#### POST /api/backpack/save (ExplainCard 實際使用)
```typescript
export async function POST(request: NextRequest)
```
- **目的**: 儲存詳解筆記到 backpack
- **支援兩種請求格式**:

**格式 1 - Legacy (ExplainCard 使用)**:
```json
{
  "user_id": "UUID",
  "question": "題目標題或題幹",
  "canonical_skill": "英文 | 數學等",
  "note_md": "Markdown 格式的詳解筆記"
}
```

**格式 2 - Contract v2**:
```json
{
  "user_id": "UUID",
  "contract_response": {
    "phase": "string",
    "subject": "string",
    "keypoint": {
      "id", "code", "name", "category"
    },
    "question": { "stem": "string" },
    "explanation": {
      "summary", "steps", "checks", "error_hints", "extensions"
    }
  }
}
```

- **目標表**: `backpack_notes` (NOT error_book)
- **儲存的欄位**: id, user_id, question, canonical_skill, note_md, created_at

**問題**:
- 按鈕文案「加入錯題本」實際是加到 backpack_notes
- 與 error_book 完全獨立，無法跟蹤題目的掌握度

---

### 1.3 Backpack Items API - 項目管理
**檔案**: `/Users/simonac/Desktop/moonshot idea/apps/web/app/api/backpack/route.ts`

#### GET /api/backpack
```typescript
export async function GET(req: NextRequest)
```
- **返回**: backpack_items 表的數據
- **支援篩選**: subject, type

---

## 2. 資料庫 Schema 分析

### 2.1 error_book 表結構
**位置**: `supabase/migrations/SAFE_20251026_NEW_TABLES_ONLY.sql`

```sql
CREATE TABLE IF NOT EXISTS error_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES pack_questions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',           -- 'active' | 'mastered'
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes JSONB DEFAULT '{}'::JSONB,                  -- 未使用（備用欄位）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_book_user_id ON error_book(user_id);
```

**設計分析**:
- ✓ 與題庫 (pack_questions) 關聯，可追蹤具體題目
- ✓ 有 status 欄位，支援 active/mastered 狀態
- ✓ 有 last_attempted_at，支援間隔重複
- ✗ notes 欄位未使用
- ✗ 無前端呈現和完整 CRUD

### 2.2 backpack_notes 表結構
**位置**: `apps/web/supabase/schema.sql:114`

```sql
CREATE TABLE IF NOT EXISTS backpack_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,                          -- 題目標題
  canonical_skill TEXT NOT NULL,                   -- 技能標籤
  note_md TEXT NOT NULL,                           -- Markdown 筆記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backpack_notes_user_id ON backpack_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_backpack_notes_created_at ON backpack_notes(created_at DESC);
```

**問題**:
- ✗ 無 question_id 外鍵，無法追蹤原始題目
- ✗ 無 updated_at，無版本控制
- ✗ 無分類標籤（科目、難度等）
- ✓ 結構簡單，適合自由筆記

---

## 3. 前端實現分析

### 3.1 詳解卡元件
**檔案**: `/Users/simonac/Desktop/moonshot idea/apps/web/components/solve/ExplainCardV2.tsx`

#### 按鈕 UI (第 245-270 行)
```typescript
function ActionFooter({ visible, isSaving, saveStatus, saveMessage, onPrimaryClick }: ActionFooterProps) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-zinc-800/40 bg-zinc-950/80 px-4 py-3 backdrop-blur">
      <button
        type="button"
        onClick={onPrimaryClick}
        disabled={isSaving}
        className="w-full rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white"
      >
        {isSaving ? '儲存中…' : '加入錯題本'}  {/* 👈 文案誤導 */}
      </button>
      {saveStatus !== 'idle' && (
        <span className={`text-xs ${saveStatus === 'success' ? 'text-emerald-300' : 'text-amber-300'}`}>
          {saveMessage}
        </span>
      )}
    </div>
  )
}
```

#### 保存邏輯 (第 1100-1177 行)
```typescript
const handlePrimaryAction = useCallback(async () => {
  if (isSaving) return

  try {
    setIsSaving(true)
    setSaveStatus('idle')
    setSaveMessage('')

    const canonicalSkill = clarityStripeData?.legacyKind ?? 
                          (questionSetKind !== 'unknown' ? `english_${questionSetKind}` : vm?.kind ?? 'english')
    const questionTitle = questionSetVM
      ? `題組解析（${questionSetVM.questions.length} 題）`
      : explainView?.stem?.en ?? inputText.slice(0, 60)

    let userId: string | null = null
    try {
      const { data, error } = await supabaseBrowserClient.auth.getUser()
      if (error) {
        console.warn('[ExplainCardV2] supabase auth getUser error:', error.message)
      }
      userId = data?.user?.id ?? null
    } catch (err) {
      console.warn('[ExplainCardV2] Unable to retrieve Supabase user:', err)
    }

    if (!userId) {
      throw new Error('請先登入以收藏錯題')
    }

    const note_md = buildWrongbookNote()

    const res = await fetch('/api/backpack/save', {  {/* 👈 調用 backpack/save，NOT error-book */}
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        question: questionTitle,
        canonical_skill: canonicalSkill ?? 'english',
        note_md,
      }),
    })

    if (!res.ok) {
      throw new Error('儲存錯題失敗，請稍後再試')
    }

    setSaveStatus('success')
    setSaveMessage('已加入錯題本')  {/* 👈 文案誤導 */}

    track('explain.action' as any, {
      action: 'save-error',
      mode: questionSetVM ? 'question-set' : 'single',
      status: 'success',
    })
  } catch (err) {
    // ... error handling
  } finally {
    setIsSaving(false)
  }
}, [
  isSaving,
  buildWrongbookNote,
  clarityStripeData,
  questionSetKind,
  questionSetVM,
  explainView,
  inputText,
  vm,
])
```

#### 筆記構建邏輯 (第 735-853 行)
```typescript
const buildWrongbookNote = useCallback((): string => {
  const lines: string[] = ['# 錯題筆記', '']

  // 優先使用新格式的 structuredData
  const currentStructuredData = vm ? (() => {
    if ((vm as any).structured) {
      return { type: 'structured' as const, data: (vm as any).structured }
    }
    if ((vm as any).questions) {
      return { type: 'questions' as const, data: (vm as any).questions }
    }
    if ((vm as any).sharedPassage) {
      return { type: 'sharedPassage' as const, data: (vm as any).sharedPassage }
    }
    return null
  })() : null

  if (currentStructuredData) {
    // 處理 sharedPassage、questions、structured 格式
    // ... 生成 Markdown
    return lines.join('\n')
  }

  if (questionSetVM && questionSetVM.questions.length > 0) {
    // 處理題組
    // ... 生成 Markdown
    return lines.join('\n')
  }

  if (explainView) {
    // 處理舊格式
    // ... 生成 Markdown
    return lines.join('\n')
  }

  lines.push(inputText.trim())
  return lines.join('\n')
}, [questionSetVM, questionSetAnalysis, explainView, inputText, vm])
```

**設計問題**:
1. 「加入錯題本」按鈕實際調用 `/api/backpack/save` (backpack_notes)
2. 完全不使用 `/api/error-book` (錯題跟蹤系統)
3. 無法獲取題目 ID，無法與題庫關聯
4. 無法跟蹤掌握度 (mastered vs active)

---

### 3.2 Backpack 頁面
**檔案**: `/Users/simonac/Desktop/moonshot idea/apps/web/app/(app)/backpack/BackpackContent.tsx`

#### 兩個 Tab 視圖 (第 52-127 行)
```typescript
type ViewMode = 'backpack' | 'error-book'

export function BackpackContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('backpack')
  const [errorBookItems, setErrorBookItems] = useState<any[]>([])

  // Load error book items
  const loadErrorBookItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/error-book')  {/* ✓ 呼叫正確的 API */}
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '載入失敗')
      }
      const data = await response.json()
      setErrorBookItems(data.items || [])
    } catch (err) {
      console.error('Failed to load error book items:', err)
      setError(err instanceof Error ? err.message : '載入失敗')
      setErrorBookItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (viewMode === 'backpack') {
      loadBackpackItems()
    } else {
      loadErrorBookItems()
    }
  }, [viewMode, loadBackpackItems, loadErrorBookItems])
}
```

**問題**:
- ✓ 有錯題本的 API 呼叫
- ✗ UI 呈現邏輯不完整（只看到數據載入，無渲染代碼）
- ✗ ExplainCard 保存的內容無法出現在錯題本分頁

---

## 4. MCP 服務層 (Wrongbook)
**檔案**: `/Users/simonac/Desktop/moonshot idea/apps/web/lib/services/mcp/wrongbook.ts`

```typescript
export async function create_wrongbook_entry(args: {
  userId: string
  questionId: string
  explanation: unknown
}): Promise<{ ok: boolean; entryId?: string; error?: string }> {
  try {
    if (!args.userId || !args.questionId) {
      return { ok: false, error: 'INVALID_INPUT:create_wrongbook_entry' }
    }

    const supabase = getServiceSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from('error_book')
      .select('id')
      .eq('user_id', args.userId)
      .eq('question_id', args.questionId)
      .eq('status', 'active')
      .maybeSingle()

    if (existingError) {
      console.error('MCP:create_wrongbook_entry:select', existingError)
      throw existingError
    }

    const nowIso = new Date().toISOString()

    if (existing?.id) {
      // 更新 last_attempted_at
      const { error: updateError } = await supabase
        .from('error_book')
        .update({ last_attempted_at: nowIso })
        .eq('id', existing.id)
      if (updateError) throw updateError
      return { ok: true, entryId: existing.id }
    }

    // 創建新錯題
    const { data, error: insertError } = await supabase
      .from('error_book')
      .insert({
        user_id: args.userId,
        question_id: args.questionId,
        status: 'active',
        last_attempted_at: nowIso,
      })
      .select('id')
      .single()

    if (insertError) throw insertError
    return { ok: true, entryId: data?.id }
  } catch (err) {
    console.error('MCP:create_wrongbook_entry', err)
    return { ok: false, error: 'FAILED_CREATE_WRONGBOOK_ENTRY' }
  }
}
```

**分析**:
- ✓ 正確使用 error_book 表
- ✓ 支援重複題目的更新邏輯
- ✗ 未被 ExplainCard 呼叫
- ✗ 需要 question_id，但 ExplainCard 沒有

---

## 5. 前端共用 SDK
**檔案**: `/Users/simonac/Desktop/moonshot idea/packages/shared/sdk/errorBook.ts`

```typescript
import { BaseClient } from './baseClient';
import { ErrorItem } from '../types/errorBook';

export function createErrorBookAPI(client: BaseClient) {
  return {
    getErrors: () => client.request<ErrorItem[]>('/api/error-book'),
    addError: (item: Partial<ErrorItem>) =>
      client.request<ErrorItem>('/api/error-book', {
        method: 'POST',
        body: JSON.stringify(item),
      }),
  };
}
```

**問題**:
- ✗ addError 方法簽名不清楚 (Partial<ErrorItem> 不明確)
- ✗ 未被 ExplainCard 使用

---

## 6. 完整流程分析

### 當前實現的流程 (有問題)
```
ExplainCard UI (「加入錯題本」按鈕)
    ↓
handlePrimaryAction()
    ↓
buildWrongbookNote() → Markdown 格式的詳解
    ↓
POST /api/backpack/save
    ↓
backpack_notes 表 (詳解筆記)
    ↓
Backpack 頁面展示
    ❌ 無法在「錯題本」分頁中顯示
```

### 應該實現的流程 (正確)
```
ExplainCard (需要題目 ID)
    ↓
POST /api/error-book { questionId: "UUID" }
    ↓
error_book 表 (錯題跟蹤)
    ↓
同時保存詳解到 backpack_notes 或 error_book.notes
    ↓
Backpack/ErrorBook 頁面展示 (區分兩個系統)
```

---

## 7. 問題匯總

### 7.1 架構設計問題
- [ ] **混淆的系統設計**: backpack_notes (筆記系統) 和 error_book (題目跟蹤系統) 應該是兩個獨立系統
  - 當前: ExplainCard → backpack_notes (完全未使用 error_book)
  - 應該: ExplainCard → 同時更新 error_book + backpack_notes

### 7.2 API 缺陷
- [ ] **error_book 缺少完整 CRUD**:
  - ✓ GET (查詢)
  - ✓ POST (新增)
  - ✗ PATCH/PUT (更新 status)
  - ✗ DELETE (刪除)

- [ ] **backpack_notes 結構不完整**:
  - ✗ 無 question_id (外鍵)
  - ✗ 無 updated_at
  - ✗ 無 subject/difficulty 分類

### 7.3 前端實現問題
- [ ] **「加入錯題本」按鈕文案誤導**: 實際加到 backpack，非 error_book
- [ ] **無法獲取題目 ID**: ExplainCard 無法調用 error_book API
- [ ] **無法跟蹤掌握度**: 詳解內容儲存後無法標記為 'mastered'
- [ ] **錯題本分頁呈現不完整**: BackpackContent 有載入邏輯，但無渲染代碼

### 7.4 數據流問題
- [ ] **題目關聯缺失**: ExplainCard 保存的筆記與原題目無關聯
- [ ] **狀態管理缺失**: 無法跟蹤「已掌握」vs「仍在學習」
- [ ] **間隔重複支援不完整**: last_attempted_at 存在但未應用

---

## 8. 修復建議

### 優先級 1 (必須修復)
1. **補充 error_book API**:
   ```
   PUT /api/error-book/{id} - 更新狀態
   DELETE /api/error-book/{id} - 刪除記錄
   ```

2. **修改 ExplainCard 按鈕行為**:
   - 取得題目 ID (如果有)
   - 優先調用 `/api/error-book` (錯題跟蹤)
   - 備用調用 `/api/backpack/save` (詳解筆記)

3. **修復文案**:
   - 按鈕: 「加入錯題本」或「保存詳解」 (視情況)
   - 消息: 「已加入錯題本」或「詳解已保存」

### 優先級 2 (完善功能)
1. **增強 backpack_notes**:
   - 添加 question_id (外鍵，可選)
   - 添加 updated_at
   - 添加分類標籤

2. **完善 BackpackContent UI**:
   - 實現錯題本分頁的渲染
   - 顯示掌握度指標
   - 支援篩選和排序

3. **實現間隔重複**:
   - 根據 last_attempted_at 推薦複習
   - 根據 status 過濾顯示

---

## 9. 核心文件位置速查表

| 功能 | 檔案路徑 | 狀態 |
|------|--------|------|
| error_book API | `/apps/web/app/api/error-book/route.ts` | ✓ 部分完整 |
| backpack save API | `/apps/web/app/api/backpack/save/route.ts` | ✓ 完整 |
| ExplainCardV2 UI | `/apps/web/components/solve/ExplainCardV2.tsx` | ✗ 流程錯誤 |
| BackpackContent | `/apps/web/app/(app)/backpack/BackpackContent.tsx` | ✗ 呈現不完整 |
| error_book schema | `supabase/migrations/SAFE_20251026_NEW_TABLES_ONLY.sql` | ✓ 完整 |
| backpack_notes schema | `/apps/web/supabase/schema.sql:114` | ✗ 缺欄位 |
| MCP wrongbook | `/apps/web/lib/services/mcp/wrongbook.ts` | ✓ 完整，未使用 |
| Supabase save 函數 | `/apps/web/lib/supabase.ts:60` | ✓ 完整 |

---

## 10. 結論

「詳解卡內容加到錯題本」的閉環**不完整**，主要問題是：

1. **架構混亂**: 詳解卡流向 backpack_notes，而非 error_book，導致錯題追蹤功能無法使用
2. **API 缺陷**: error_book 缺少更新/刪除端點，backpack_notes 無法與題庫關聯
3. **前端呈現**: 按鈕文案誤導，錯題本分頁無法展示詳解內容
4. **數據流斷裂**: 詳解筆記與題目無關聯，無法跟蹤掌握度

建議優先完成優先級 1 的修復，確保數據流閉環完整。

