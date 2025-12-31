# 📊 資料庫 Migration 執行步驟

## ⚠️ 重要提示

你收到的錯誤是因為資料庫表格還沒建立。請依照以下步驟執行 migration。

---

## 🚀 執行步驟

### 步驟 1: 打開 Supabase Dashboard

1. 訪問 https://supabase.com/dashboard
2. 選擇你的專案
3. 點擊左側選單的 **SQL Editor**

### 步驟 2: 執行 Migration SQL

**⭐ 推薦：使用 Safe Migration（處理已存在的物件）**

1. 打開檔案：**`execute-migrations-safe.sql`**（在專案根目錄）
2. 複製**全部內容**
3. 在 Supabase SQL Editor 貼上
4. 點擊 **RUN** 按鈕

這個版本會：
- ✅ 自動處理已存在的表格和政策
- ✅ 先刪除舊的函數和政策再重建
- ✅ 包含驗證查詢
- ✅ 不會因為重複執行而報錯

**方法 B: 使用原始檔案**

如果是全新的資料庫，可以使用：
1. 打開檔案：`execute-migrations.sql`
2. 複製全部內容 → 貼上到 SQL Editor → 點擊 RUN

### 步驟 3: 驗證 Migration

在 SQL Editor 執行以下查詢：

```sql
-- 檢查表格是否建立成功
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'user_proficiency',
  'user_subject_proficiency',
  'user_concept_proficiency',
  'hint_usage_logs'
);
```

**預期結果**：應該看到 4 個表格名稱

```
table_name
----------------------------
user_proficiency
user_subject_proficiency
user_concept_proficiency
hint_usage_logs
```

### 步驟 4: 驗證函數

```sql
-- 檢查函數是否建立成功
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_latest_user_proficiency',
  'update_concept_proficiency'
);
```

**預期結果**：應該看到 2 個函數

---

## ✅ Migration 成功後

執行測試查詢（不應該再報錯）：

```sql
SELECT COUNT(*) FROM user_proficiency;
SELECT COUNT(*) FROM hint_usage_logs;
SELECT COUNT(*) FROM user_concept_proficiency;
```

**預期結果**：
```
count
-----
0
```

（剛建立的表格是空的，所以 count 是 0）

---

## 🔧 如果遇到問題

### 問題 1: 表格已存在

**錯誤訊息**: `ERROR: relation "user_proficiency" already exists`

**解決方案**：
```sql
-- 刪除舊表（僅測試環境！）
DROP TABLE IF EXISTS hint_usage_logs CASCADE;
DROP TABLE IF EXISTS user_concept_proficiency CASCADE;
DROP TABLE IF EXISTS user_subject_proficiency CASCADE;
DROP TABLE IF EXISTS user_proficiency CASCADE;

-- 然後重新執行 migration
```

### 問題 2: 外鍵錯誤

**錯誤訊息**: `ERROR: relation "concept_tags" does not exist`

**解決方案**：
確保 `concept_tags` 表已建立。執行：

```sql
-- 檢查 concept_tags 是否存在
SELECT COUNT(*) FROM concept_tags;

-- 如果不存在，需要先執行相關 migration
```

### 問題 3: RLS 政策衝突

**錯誤訊息**: `ERROR: policy "..." already exists`

**解決方案**：
```sql
-- 刪除舊政策
DROP POLICY IF EXISTS "Users can view their own proficiency" ON user_proficiency;
DROP POLICY IF EXISTS "System can insert proficiency records" ON user_proficiency;
-- ... 重複其他政策

-- 然後重新執行 migration
```

---

## 📝 Migration 檔案位置

```
專案根目錄/
├── execute-migrations.sql          # 合併的 migration（推薦使用）
└── apps/web/supabase/migrations/
    ├── 025_user_proficiency_system.sql
    └── 026_hint_usage_logs.sql
```

---

## 🎯 完成後的下一步

1. ✅ Migration 執行成功
2. ✅ 表格驗證通過
3. ➡️ 執行 API 測試：`npx tsx test-personalization-apis.ts`
4. ➡️ 訪問 Dashboard：http://localhost:3000/dashboard/enhanced

---

## 💡 提示

- 使用 `execute-migrations.sql` 是最簡單的方法
- 確保在正確的 Supabase 專案中執行
- Migration 是冪等的（可以重複執行）
- 所有表格都有 RLS 保護，確保數據安全

---

**需要幫助？** 檢查 Supabase Dashboard 的 Logs 查看詳細錯誤訊息。
