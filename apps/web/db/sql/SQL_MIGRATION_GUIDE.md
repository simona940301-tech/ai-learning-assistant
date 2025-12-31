# Supabase SQL 遷移指南

## 📋 執行順序

請按照以下順序在 Supabase SQL Editor 中執行這些 SQL 文件：

### 1️⃣ 基礎表結構（必須先執行）
**文件：`005_backpack_upload.sql`**
- 創建 `files`、`file_pages`、`doc_chunks`、`citations` 表
- 設置 RLS 策略
- 創建基礎搜尋函數 `search_doc_chunks`

### 2️⃣ Scoped Ask 功能
**文件：`006_backpack_scoped_ask.sql`**
- 擴展 `doc_chunks` 表（添加 `start`、`end` 欄位）
- 創建 `highlights`、`notes`、`note_links`、`asks`、`answers` 表
- **重要**：創建 `search_doc_chunks_scoped` 函數（RAG 核心）

### 3️⃣ 註解功能（GoodNotes 樣式）
**文件：`007_backpack_annotations.sql`**
- 創建 `annotation_type` ENUM
- 創建 `annotations` 表
- 設置 RLS 策略

### 4️⃣ AI 知識庫擴展（最新）
**文件：`008_backpack_ai_knowledge_base.sql`**
- 為 `files` 表添加 `auto_tags` 和 `initial_summary` 欄位
- 添加 GIN 索引支援標籤搜尋

---

## ✅ 檢查清單

執行完所有 SQL 後，請確認以下項目：

### 表結構
- [ ] `files` 表存在，包含 `auto_tags`、`initial_summary` 欄位
- [ ] `file_pages` 表存在，包含 `bbox_json` 欄位
- [ ] `doc_chunks` 表存在，包含 `start`、`end` 欄位
- [ ] `highlights` 表存在
- [ ] `annotations` 表存在
- [ ] `asks`、`answers` 表存在

### 函數
- [ ] `search_doc_chunks` 函數存在
- [ ] `search_doc_chunks_scoped` 函數存在（**關鍵**）
- [ ] `update_files_updated_at` 觸發器存在

### RLS 策略
- [ ] 所有表都已啟用 RLS
- [ ] 用戶只能訪問自己的文件

---

## 🔍 驗證 SQL

執行以下 SQL 檢查函數是否存在：

```sql
-- 檢查 search_doc_chunks_scoped 函數
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'search_doc_chunks_scoped';

-- 檢查 files 表的欄位
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'files'
  AND column_name IN ('auto_tags', 'initial_summary');

-- 檢查 doc_chunks 表的欄位
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'doc_chunks'
  AND column_name IN ('start', 'end');
```

---

## 🚨 常見問題

### 問題 1：`search_doc_chunks_scoped` 函數不存在
**錯誤訊息**：`function search_doc_chunks_scoped does not exist`
**解決方案**：執行 `006_backpack_scoped_ask.sql`

### 問題 2：`doc_chunks.start` 欄位不存在
**錯誤訊息**：`column "start" does not exist`
**解決方案**：執行 `006_backpack_scoped_ask.sql`（會自動添加欄位）

### 問題 3：`files.auto_tags` 欄位不存在
**錯誤訊息**：`column "auto_tags" does not exist`
**解決方案**：執行 `008_backpack_ai_knowledge_base.sql`

---

## 📝 注意事項

1. **執行順序很重要**：必須按照 005 → 006 → 007 → 008 的順序執行
2. **pgvector 擴展**：確保已啟用 `vector` 擴展（`005_backpack_upload.sql` 會自動處理）
3. **RLS 策略**：所有表都已設置 RLS，確保用戶數據安全
4. **重複執行**：SQL 文件使用 `IF NOT EXISTS`，可以安全重複執行

