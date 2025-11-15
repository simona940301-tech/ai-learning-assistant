# 錯題本閉環修復指南

## 📋 修復摘要

修復「詳解卡內容加到錯題本」的閉環，實作**雙軌制**架構：

```
加入錯題本按鈕
    │
    ├─ 有 questionId → 存到 error_book (可追蹤、間隔重複)
    └─ 無 questionId → 存到 backpack_notes (純筆記，標記為 error_book 資料夾)
```

## ✅ 已完成的修改

### 1. ExplainCardV2 元件增強

#### 1.1 新增 `questionId` 可選參數
**檔案**: `apps/web/components/solve/ExplainCardV2.tsx`

```typescript
interface ExplainCardV2Props {
  inputText: string
  questionId?: string // ✅ 新增：來自題庫時提供，啟用 error_book 追蹤
  conservative?: boolean
  onLoadingChange?: (isLoading: boolean) => void
}
```

#### 1.2 雙軌儲存邏輯
**位置**: `ExplainCardV2.tsx:1131-1168`

```typescript
// ✅ 有 questionId → 存到 error_book
if (questionId) {
  const res = await fetch('/api/error-book', {
    method: 'POST',
    body: JSON.stringify({ questionId }),
  })
  setSaveMessage('已加入錯題本（可追蹤復習）')
}
// ✅ 無 questionId → 存到 backpack_notes
else {
  const res = await fetch('/api/backpack/save', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      question: questionTitle,
      canonical_skill: canonicalSkill ?? 'english',
      note_md,
      folder: 'error_book', // 標記為錯題本資料夾
    }),
  })
  setSaveMessage('已加入錯題筆記')
}
```

#### 1.3 動態按鈕文案
**位置**: `ExplainCardV2.tsx:259`

```typescript
{isSaving ? '儲存中…' : hasQuestionId ? '加入錯題本' : '加入筆記'}
```

### 2. 資料庫 Schema 增強

#### 2.1 backpack_notes 新增 folder 欄位
**檔案**: `supabase/migrations/20251115_add_folder_to_backpack_notes.sql`

```sql
ALTER TABLE backpack_notes
ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_backpack_notes_folder
ON backpack_notes (user_id, folder, created_at DESC);
```

#### 2.2 TypeScript 介面更新
**檔案**: `apps/web/lib/supabase.ts`

```typescript
export interface BackpackNoteInsert {
  user_id: string
  question: string
  canonical_skill: string
  note_md: string
  folder?: string // ✅ 新增：'error_book', 'general', 等
  created_at?: string
}
```

## 🗂️ 完整資料流

### 流程 1: 對戰遊戲 → 錯題本 ✅（已存在）
```
對戰答錯
  → /api/missions/answer (POST)
  → 存入 error_book (question_id + user_id)
  → 可被間隔重複系統抓取
```

### 流程 2: Ask Page → 錯題筆記 ✅（新增）
```
Ask page 輸入題目
  → ExplainCardV2 (無 questionId)
  → 點擊「加入筆記」
  → /api/backpack/save (POST, folder: 'error_book')
  → 存入 backpack_notes (folder 標記為錯題本)
```

### 流程 3: 題庫題目 → 錯題本 ✅（新增）
```
從題庫打開題目
  → ExplainCardV2 (有 questionId)
  → 點擊「加入錯題本」
  → /api/error-book (POST, questionId)
  → 存入 error_book
  → 可被間隔重複系統抓取
```

## 📊 兩種錯題儲存方式的差異

| 項目 | error_book | backpack_notes (folder: error_book) |
|------|------------|-------------------------------------|
| 資料來源 | 題庫題目 (有 question_id) | 手動輸入題目 (無 question_id) |
| 主鍵關聯 | ✅ 連結到 pack_questions | ❌ 僅存文字 |
| 間隔重複 | ✅ 支援 | ❌ 不支援 |
| 掌握度追蹤 | ✅ 支援 (status: active/mastered) | ❌ 不支援 |
| 適用場景 | 對戰錯題、任務錯題 | Ask page 學生問題 |

## 🚀 部署步驟

### Step 1: 執行資料庫 Migration
```bash
cd /Users/simonac/Desktop/moonshot\ idea
supabase db push supabase/migrations/20251115_add_folder_to_backpack_notes.sql
```

### Step 2: 驗證 Migration
```sql
-- 檢查 backpack_notes 是否有 folder 欄位
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'backpack_notes'
  AND column_name = 'folder';

-- 檢查索引是否建立
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'backpack_notes'
  AND indexname = 'idx_backpack_notes_folder';
```

### Step 3: 測試閉環

#### 測試案例 1: Ask Page (無 questionId)
1. 前往 `/ask` 頁面
2. 輸入題目：「The book _____ on the table. (A) is (B) are」
3. 等待詳解生成
4. 點擊「加入筆記」按鈕
5. 驗證：
   - ✅ 按鈕文案顯示「加入筆記」
   - ✅ 成功訊息顯示「已加入錯題筆記」
   - ✅ 資料存入 `backpack_notes` 表，`folder = 'error_book'`

#### 測試案例 2: 題庫題目 (有 questionId)
1. 從題庫選擇一道題目
2. 傳入 `questionId` 給 ExplainCardV2
3. 點擊「加入錯題本」按鈕
4. 驗證：
   - ✅ 按鈕文案顯示「加入錯題本」
   - ✅ 成功訊息顯示「已加入錯題本（可追蹤復習）」
   - ✅ 資料存入 `error_book` 表，`question_id` 正確關聯

#### 測試案例 3: 對戰遊戲 (既有流程)
1. 完成一場對戰
2. 答錯題目
3. 驗證：
   - ✅ 錯題自動存入 `error_book`
   - ✅ 可在錯題本頁面看到

## 🔍 常見問題排查

### Q1: Migration 執行失敗
**錯誤**: `column "folder" already exists`
**解決**: 正常，表示已經執行過，可以跳過

### Q2: 按鈕文案沒有變化
**檢查點**:
- 確認 `questionId` 有正確傳入 ExplainCardV2
- 確認 `hasQuestionId` 有傳給 ActionFooter

### Q3: 儲存到錯誤的表
**檢查點**:
- Ask page: 應該存到 `backpack_notes` (folder: error_book)
- 題庫題目: 應該存到 `error_book`
- 對戰錯題: 應該存到 `error_book`

## 📝 未來優化建議

### 1. Backpack 錯題本頁面增強
**目標**: 統一顯示兩種來源的錯題

```typescript
// apps/web/app/(app)/backpack/BackpackContent.tsx
const errorBookItems = await supabase
  .from('error_book')
  .select('*, pack_questions(*)')
  .eq('user_id', userId)

const errorBookNotes = await supabase
  .from('backpack_notes')
  .select('*')
  .eq('user_id', userId)
  .eq('folder', 'error_book')

// 合併顯示兩種來源
```

### 2. 新增「標記為已掌握」功能
**位置**: ExplainCard 或 Backpack 頁面
**功能**:
- error_book: 更新 status = 'mastered'
- backpack_notes: 移動到 folder = 'archived'

### 3. 間隔重複通知
**功能**: 根據 `last_attempted_at` 推送復習提醒

## ✅ 檢查清單

- [x] ExplainCardV2 增加 questionId prop
- [x] 實作雙軌儲存邏輯
- [x] 動態按鈕文案
- [x] backpack_notes 增加 folder 欄位
- [x] 建立 migration 檔案
- [x] 更新 TypeScript 介面
- [ ] 執行 migration
- [ ] 測試 Ask page 流程
- [ ] 測試題庫題目流程
- [ ] 測試對戰錯題流程

## 📞 聯絡

如有問題，請參考：
- API 文件: `apps/web/app/api/error-book/route.ts`
- 元件文件: `apps/web/components/solve/ExplainCardV2.tsx`
- Schema: `supabase/migrations/20251115_add_folder_to_backpack_notes.sql`
