# RAG 403 錯誤 - 第二步診斷

## ✅ 確認：RLS 政策已存在

從你的查詢結果可以看到，兩個表的 RLS 政策都已正確創建：
- `notebook_entries`: 4 個政策（SELECT, INSERT, UPDATE, DELETE）
- `rag_documents`: 4 個政策（SELECT, INSERT, UPDATE, DELETE）

## 🔍 既然政策存在，403 的可能原因

### 1. 認證問題（最可能）

即使 RLS 政策正確，如果 `auth.uid()` 返回 `null` 或不匹配，也會導致 403。

**檢查方法：**
在 Supabase SQL Editor 執行：

```sql
-- 檢查當前認證的用戶 ID
SELECT auth.uid() as current_user_id;

-- 如果返回 null，說明沒有有效的認證上下文
```

**可能原因：**
- JWT token 無效或過期
- Supabase client 沒有正確傳遞認證信息
- 在 API route 中使用的 Supabase client 配置錯誤

### 2. 檢查實際的錯誤訊息

在瀏覽器開發者工具中：
1. 打開 **Network Tab**
2. 找到 `/api/rag/upload` 請求
3. 查看 **Response** 的完整內容
4. 確認實際的錯誤訊息（不是狀態碼）

**常見情況：**
- 如果 Response 顯示 `"error": "UNAUTHORIZED"` → 這是 401，不是 403
- 如果 Response 顯示 `"error": "DATABASE_ERROR"` → 這是 500，不是 403
- 如果 Response 顯示 Supabase 的 RLS 錯誤 → 這才是真正的 403

### 3. 測試 RLS 政策是否真的有效

在 Supabase SQL Editor 執行（**使用你的實際用戶 ID**）：

```sql
-- 替換 'YOUR_USER_ID' 為你的實際用戶 ID
-- 可以從瀏覽器 Console 執行：await supabase.auth.getUser() 獲取

-- 測試插入（模擬 API 的行為）
INSERT INTO rag_documents (
  user_id,
  filename,
  file_type,
  status
) VALUES (
  'YOUR_USER_ID',  -- 替換為實際用戶 ID
  'test.txt',
  'txt',
  'uploading'
);

-- 如果插入成功，說明 RLS 政策正常
-- 如果失敗，會顯示具體的錯誤訊息
```

### 4. 檢查 API route 中的 Supabase client

`/api/rag/upload` 使用 `getApiUser(req)` 來獲取 Supabase client。

**可能的問題：**
- `getApiUser` 返回的 `supabase` client 沒有正確的認證上下文
- Cookie 或 JWT token 沒有正確傳遞

**檢查方法：**
在 API route 中添加日誌：

```typescript
// 在 apps/web/app/api/rag/upload/route.ts 的第 27 行後添加
console.log('[RAG Upload] User ID:', user?.id)
console.log('[RAG Upload] Error Type:', errorType)
console.log('[RAG Upload] Supabase client auth:', await supabase.auth.getUser())
```

### 5. 臨時測試：禁用 RLS（僅用於診斷）

**⚠️ 僅用於測試，不要用於生產環境！**

```sql
-- 臨時禁用 RLS
ALTER TABLE rag_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_entries DISABLE ROW LEVEL SECURITY;
```

然後測試 `/api/rag/upload`：
- 如果禁用 RLS 後 403 消失 → 問題確實在 RLS 或認證
- 如果禁用 RLS 後仍有 403 → 問題在 API route 的其他地方

**測試完後記得重新啟用：**
```sql
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
```

## 📋 建議的診斷步驟

1. **先檢查瀏覽器 Network Tab** 的實際錯誤訊息
2. **執行 `SELECT auth.uid()`** 確認認證上下文
3. **使用實際用戶 ID 測試插入** 確認 RLS 是否真的有效
4. **如果還是有問題**，臨時禁用 RLS 測試（記得恢復）

## 🎯 最可能的情況

根據經驗，如果 RLS 政策已存在但仍出現 403，通常是：
- **認證問題**：`auth.uid()` 返回 null
- **實際是 401**：但被誤認為 403
- **Supabase client 配置問題**：API route 中的 client 沒有正確的認證上下文

