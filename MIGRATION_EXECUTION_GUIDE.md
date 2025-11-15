# Migration 執行指南

## 當前狀態

你的 migration 文件已經按正確順序重新命名：

```
✅ supabase/migrations/001_create_backpack_function.sql
✅ supabase/migrations/002_fix_constraints.sql
✅ supabase/migrations/20250127_add_battle_fields.sql
✅ supabase/migrations/20250127_add_coins_field.sql
✅ supabase/migrations/20251018_add_concept_id_to_solve_options.sql
✅ supabase/migrations/20251018_archive_legacy_tutor.sql
✅ supabase/migrations/20251026_00_create_analytics_events.sql      ← 新的
✅ supabase/migrations/20251026_01_create_packs_schema.sql          ← 新的
✅ supabase/migrations/20251026_02_create_missions_schema.sql       ← 新的
✅ supabase/migrations/20251026_03_enhance_missions_v2.sql          ← 新的
✅ supabase/migrations/20251026_04_update_packs_schema_v2.sql       ← 新的
✅ supabase/migrations/20251026_05_optimize_sampler_performance.sql ← 新的
```

## 問題回顧

**之前的錯誤**：
```
ERROR: 42P01: relation "user_missions" does not exist LINE 265
```

**原因**：`20251026_optimize_sampler_performance.sql` 在創建 VIEW 時引用了 `user_missions` 表，但因為字母排序問題，可能在 `create_missions_schema.sql` 之前執行。

**修復**：添加序號前綴 (00-05) 確保正確執行順序。

---

## 選項 1：使用遠端 Supabase（推薦）

### 方法 A：Supabase Dashboard（最安全）

1. **登入 Supabase Dashboard**
   - 訪問：https://supabase.com/dashboard
   - 選擇你的專案

2. **進入 SQL Editor**
   - 左側選單 → SQL Editor
   - 點擊 "New query"

3. **逐一執行 SQL 文件**（按以下順序）：

   ```sql
   -- 如果是全新數據庫，先執行基礎 schema
   -- 複製貼上 supabase/schema.sql 的內容

   -- 然後執行所有 migrations（按順序）：
   ```

   **執行順序**：
   ```
   1. 001_create_backpack_function.sql
   2. 002_fix_constraints.sql
   3. 20250127_add_battle_fields.sql
   4. 20250127_add_coins_field.sql
   5. 20251018_add_concept_id_to_solve_options.sql
   6. 20251018_archive_legacy_tutor.sql
   7. 20251026_00_create_analytics_events.sql    ← 新的
   8. 20251026_01_create_packs_schema.sql        ← 新的
   9. 20251026_02_create_missions_schema.sql     ← 新的
   10. 20251026_03_enhance_missions_v2.sql       ← 新的
   11. 20251026_04_update_packs_schema_v2.sql    ← 新的
   12. 20251026_05_optimize_sampler_performance.sql ← 新的
   ```

4. **驗證執行成功**
   ```sql
   -- 檢查表是否存在
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- 應該看到這些表：
   -- ✓ analytics_events
   -- ✓ packs
   -- ✓ pack_chapters
   -- ✓ pack_questions
   -- ✓ user_pack_installations
   -- ✓ missions
   -- ✓ user_missions
   -- ✓ mission_logs
   -- ✓ user_question_history
   -- ✓ error_book
   -- ✓ user_answers
   ```

### 方法 B：Supabase CLI（需要 Docker）

如果你想使用本地開發環境：

```bash
# 1. 啟動 Docker Desktop
open -a Docker

# 2. 等待 Docker 啟動完成（約 30 秒）

# 3. 初始化本地 Supabase（如果還沒做過）
supabase init

# 4. 啟動本地 Supabase
supabase start

# 5. 重置數據庫並執行所有 migrations
supabase db reset

# 6. 檢查狀態
supabase status
```

---

## 選項 2：如果已經有舊的 Migration 記錄

如果你的遠端數據庫已經執行過舊版本的 migrations（有錯誤的順序），你有兩個選擇：

### 選項 2A：清空數據庫重新開始（開發環境）

⚠️ **警告：這會刪除所有數據！**

```sql
-- 在 Supabase Dashboard SQL Editor 執行：

-- 1. 刪除所有 migrations 相關的表
DROP TABLE IF EXISTS user_question_history CASCADE;
DROP TABLE IF EXISTS mission_logs CASCADE;
DROP TABLE IF EXISTS user_missions CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP TABLE IF EXISTS user_pack_installations CASCADE;
DROP TABLE IF EXISTS pack_questions CASCADE;
DROP TABLE IF EXISTS pack_chapters CASCADE;
DROP TABLE IF EXISTS packs CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS error_book CASCADE;
DROP TABLE IF EXISTS user_answers CASCADE;

-- 2. 然後按照「選項 1 方法 A」重新執行所有 migrations
```

### 選項 2B：創建修復 Migration（生產環境）

如果數據庫中有重要數據，創建一個修復 migration：

```sql
-- 創建新文件：supabase/migrations/20251114_fix_missing_tables.sql

-- 檢查並創建缺失的表
DO $$
BEGIN
    -- 檢查 user_missions 是否存在
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'user_missions'
    ) THEN
        -- 執行 20251026_02_create_missions_schema.sql 的內容
        RAISE NOTICE 'Creating user_missions table...';
        -- （在這裡複製貼上 create_missions_schema.sql 的內容）
    END IF;

    -- 檢查其他缺失的表...
END $$;
```

---

## 選項 3：手動按順序執行（最安全，推薦用於生產環境）

我可以為你生成一個合併的 SQL 腳本，包含所有新的 migrations：

```bash
# 生成合併的 SQL 文件
cat supabase/migrations/20251026_00_create_analytics_events.sql \
    supabase/migrations/20251026_01_create_packs_schema.sql \
    supabase/migrations/20251026_02_create_missions_schema.sql \
    supabase/migrations/20251026_03_enhance_missions_v2.sql \
    supabase/migrations/20251026_04_update_packs_schema_v2.sql \
    supabase/migrations/20251026_05_optimize_sampler_performance.sql \
    > supabase/migrations/COMBINED_20251026_ALL.sql
```

然後在 Supabase Dashboard 執行這個合併文件。

---

## 建議的執行步驟（最佳實踐）

### 步驟 1：備份當前數據庫（如果有數據）

```sql
-- 在 Supabase Dashboard SQL Editor 執行：
-- 導出現有數據（如果有）
SELECT * FROM packs; -- 複製結果保存
SELECT * FROM user_missions; -- 複製結果保存
-- ... 其他重要表
```

### 步驟 2：檢查當前數據庫狀態

```sql
-- 檢查哪些表已經存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'analytics_events',
    'packs',
    'pack_questions',
    'missions',
    'user_missions',
    'error_book',
    'user_answers'
  )
ORDER BY table_name;
```

### 步驟 3：根據結果選擇執行方式

**情況 A：表都不存在（全新數據庫）**
→ 使用「選項 1 方法 A」按順序執行所有 migrations

**情況 B：部分表存在但缺少某些表**
→ 使用「選項 2B」創建修復 migration

**情況 C：所有表都存在但有錯誤**
→ 使用「選項 2A」清空重建（開發環境）

### 步驟 4：驗證結果

```sql
-- 1. 檢查所有表都存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. 檢查 user_missions 表結構
\d user_missions

-- 3. 測試有問題的 VIEW
SELECT * FROM sampler_performance_metrics LIMIT 1;

-- 4. 測試示例數據
SELECT * FROM packs LIMIT 3;
SELECT * FROM missions LIMIT 1;
```

---

## 快速命令參考

```bash
# 本地開發（需要 Docker）
supabase start          # 啟動本地 Supabase
supabase db reset       # 重置並執行所有 migrations
supabase status         # 查看狀態
supabase stop          # 停止

# 遠端部署
supabase db push        # 推送 migrations 到遠端（謹慎使用！）
supabase db pull        # 從遠端拉取 schema
```

---

## 疑難排解

### 錯誤：Table already exists

```sql
-- 刪除已存在的表（小心！）
DROP TABLE IF EXISTS table_name CASCADE;
```

### 錯誤：Column already exists

migrations 使用了 `IF NOT EXISTS` 和 `DO $$` 區塊，應該可以安全重複執行。

### 錯誤：Foreign key constraint

確保執行順序正確：
1. 先創建父表 (packs, missions)
2. 再創建子表 (pack_questions, user_missions)

---

## 下一步

**我建議你現在做的事**：

1. ✅ **先檢查遠端數據庫狀態**
   ```sql
   -- 在 Supabase Dashboard 執行
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

2. ✅ **告訴我結果**，我會根據你的情況給出具體建議

3. ✅ **選擇執行方式**（我推薦「選項 1 方法 A」）

需要我幫你生成合併的 SQL 文件嗎？或者你想先檢查數據庫狀態？
