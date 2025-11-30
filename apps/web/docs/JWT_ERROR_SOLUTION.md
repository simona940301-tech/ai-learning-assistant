# JWT 錯誤 "Expected 3 parts in JWT; got 1" - 完整解決方案

## ✅ 問題已解決！

### 根本原因

錯誤訊息：**"Expected 3 parts in JWT; got 1"**

**問題根源**：在 Mock 模式下，`mockSession.access_token` 使用了無效的字符串 `'mock-token'`，這不是一個有效的 JWT（JWT 必須有三個部分：`header.payload.signature`）。當 Supabase SDK 執行 database queries 時，會將這個無效的 token 發送到 PostgREST API，導致錯誤 `PGRST301`。

## 🔧 關鍵修復

### 1. **修復 Mock Session 使用 Service Role Key**

檔案：[lib/supabase/server.ts](apps/web/lib/supabase/server.ts#L114-L120)

```typescript
// ❌ 錯誤的實現
const mockSession = {
  access_token: 'mock-token',  // 只有 1 部分，不是有效的 JWT！
  refresh_token: 'mock-refresh',
  // ...
}

// ✅ 正確的實現
const mockSession = {
  access_token: process.env.SUPABASE_SERVICE_ROLE_KEY!,  // 使用真實的 service role key（有 3 部分）
  refresh_token: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
}
```

**為什麼這樣修復有效**：
- Service role key 是一個有效的 JWT（有 3 個部分）
- 當 SDK 執行 database queries 時，會使用這個有效的 token
- PostgREST 可以正確驗證這個 token 並允許查詢

### 2. **環境變數修復**

確保 `.env.local` 中的 `SUPABASE_SERVICE_ROLE_KEY` 沒有多餘的換行符：

```bash
# ❌ 錯誤
SUPABASE_SERVICE_ROLE_KEY="eyJ...\n"

# ✅ 正確
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. **Database Schema 修復**

檔案：[app/api/error-book/route.ts](apps/web/app/api/error-book/route.ts)

```typescript
// ❌ 錯誤：error_book 沒有直接關聯到 packs
.select(`
  *,
  pack_questions (*),
  packs (*)  // ❌ 找不到關係
`)

// ✅ 正確：通過 pack_questions 關聯到 packs
.select(`
  *,
  pack_questions (
    *,
    packs (*)  // ✅ 正確的巢狀關聯
  )
`)
```

## 📝 已修復的檔案清單

### 核心修復
- ✅ `apps/web/lib/supabase/server.ts` - 修復 mock session 使用 service role key
- ✅ `apps/web/lib/auth/getCurrentUser.ts` - 統一 mock 模式邏輯
- ✅ `apps/web/lib/api/auth.ts` - 新增 `getApiUser()` helper
- ✅ `apps/web/.env.local` - 移除 service role key 的換行符

### API Routes
- ✅ `apps/web/app/api/error-book/route.ts` - 修復 schema 查詢 + 使用 `getApiUser()`
- ✅ `apps/web/app/api/backpack/route.ts` - 使用 `getCurrentUser()`
- ✅ `apps/web/app/api/backpack/save/route.ts` - 使用 `getApiUser()`
- ✅ `apps/web/app/api/backpack/upload/route.ts` - 使用 `getApiUser()`

### RSC Pages
- ✅ `apps/web/app/(app)/error-book/page.tsx` - 使用 `getCurrentUser()`
- ✅ `apps/web/app/(app)/error-book/[id]/page.tsx` - 使用 `getCurrentUser()`
- ✅ `apps/web/app/(app)/backpack/page.tsx` - 使用 `getCurrentUser()`

## 🧪 測試結果

### API 測試
```bash
# ✅ Error Book API 正常
$ curl http://localhost:3000/api/error-book
{"success":true,"items":[...],"count":1}

# ✅ Backpack API 正常
$ curl http://localhost:3000/api/backpack
{"success":true,"items":[],"count":0}
```

### 頁面測試
- ✅ `/error-book` - 正常載入，顯示錯題列表
- ✅ `/backpack` - 正常載入，顯示 mock 提示
- ✅ `/play` - 正常載入（WebSocket 錯誤是另一個問題）

### Console 日誌
```
[Supabase Server] 🔧 Mock user mode enabled
[Supabase Server] Using service role key: eyJhbGciOiJIUzI1NiIs...
[Supabase Server] Returning mock session with service role token
```

## 🎯 關鍵要點

1. **Mock 模式必須使用有效的 JWT**
   - 不能使用像 `'mock-token'` 這樣的字符串
   - 必須使用真實的 service role key

2. **環境變數格式很重要**
   - 確保沒有多餘的換行符或空格
   - 使用 `sed` 或手動編輯清理

3. **Database 查詢必須遵循 schema 關聯**
   - 巢狀關聯要正確（如 `error_book → pack_questions → packs`）
   - 不能直接跨越中間表

## 📚 相關文檔

- [JWT_ERROR_FIX.md](JWT_ERROR_FIX.md) - 詳細的修復指南
- [EXPLAIN_DEBUGGING_FIXES.md](EXPLAIN_DEBUGGING_FIXES.md) - Explain 生成邏輯修復

## ✨ 後續優化建議

1. 添加環境變數驗證腳本，確保所有 keys 格式正確
2. 為其他 API routes 也更新為使用 `getApiUser()`
3. 考慮添加更詳細的 mock 模式日誌
4. 文檔化 database schema 關聯圖

---

**修復完成時間**：2025-11-16
**狀態**：✅ 已解決
