# SQL 匯入指南

## 📋 執行順序

### 步驟 1：基礎 Schema（如果尚未執行）

如果您的資料庫中還沒有 `files` 和 `doc_chunks` 表，請先執行：

**檔案**: `apps/web/db/sql/005_backpack_upload.sql`

此文件包含：
- `files` 表（檔案上傳基礎表）
- `file_pages` 表（檔案頁面）
- `doc_chunks` 表（向量檢索）
- `citations` 表
- 基礎 RLS 政策

### 步驟 2：Scoped Ask Schema（必須執行）

**檔案**: `apps/web/db/sql/006_backpack_scoped_ask_COMPLETE.sql`

此文件包含：
- 擴展 `doc_chunks` 表（新增 `start`、`end` 欄位）
- `highlights` 表（高亮標註）
- `notes` 表（貼註）
- `note_links` 表（貼註連結）
- `asks` 表（問答記錄）
- `answers` 表（回答記錄）
- 完整的 RLS 政策
- `search_doc_chunks_scoped` 函數

## 🚀 快速執行

### 在 Supabase Dashboard 執行

1. 登入 Supabase Dashboard
2. 前往 **SQL Editor**
3. 複製 `006_backpack_scoped_ask_COMPLETE.sql` 的全部內容
4. 貼上並執行

### 檢查執行結果

執行後，您應該看到以下表：

```sql
-- 檢查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'highlights', 
    'notes', 
    'note_links', 
    'asks', 
    'answers'
  );

-- 檢查 doc_chunks 是否有 start/end 欄位
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'doc_chunks' 
  AND column_name IN ('start', 'end');

-- 檢查函數是否存在
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'search_doc_chunks_scoped';
```

## ⚠️ 注意事項

1. **依賴關係**：`006_backpack_scoped_ask_COMPLETE.sql` 依賴 `005_backpack_upload.sql`
   - 如果 `files` 表不存在，會導致外鍵錯誤
   - 如果 `doc_chunks` 表不存在，擴展欄位會失敗

2. **RLS 政策**：所有表都已啟用 RLS
   - 確保 Supabase Auth 已正確設定
   - 測試時需要使用已登入的使用者

3. **向量擴展**：確保 `vector` extension 已啟用
   - SQL 文件開頭會自動啟用，但請確認

## 🔧 故障排除

### 錯誤：relation "files" does not exist

**解決方案**：先執行 `005_backpack_upload.sql`

### 錯誤：extension "vector" does not exist

**解決方案**：在 Supabase Dashboard 的 Database → Extensions 中啟用 `vector`

### 錯誤：policy already exists

**解決方案**：SQL 文件已包含 `DROP POLICY IF EXISTS`，應該不會出現此錯誤。如果出現，可以手動刪除舊政策。

## 📝 驗證清單

執行後請確認：

- [ ] `highlights` 表已建立
- [ ] `notes` 表已建立
- [ ] `note_links` 表已建立
- [ ] `asks` 表已建立
- [ ] `answers` 表已建立
- [ ] `doc_chunks` 表有 `start` 和 `end` 欄位
- [ ] `search_doc_chunks_scoped` 函數已建立
- [ ] 所有表的 RLS 已啟用

## 🎯 下一步

SQL 匯入完成後，您可以：

1. 測試 API 端點
2. 整合前端組件
3. 開始使用 Scoped Ask 功能

---

**檔案位置**：
- `apps/web/db/sql/005_backpack_upload.sql`（基礎）
- `apps/web/db/sql/006_backpack_scoped_ask_COMPLETE.sql`（Scoped Ask）

