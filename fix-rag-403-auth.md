# 修復 RAG 403 錯誤 - 認證問題解決方案

## 🔍 問題確認

從你的查詢結果可以看到，在 Supabase SQL Editor 中 `auth.uid()` 返回 `NULL`。

**重要說明：** 這在 SQL Editor 中是**正常的**，因為 SQL Editor 是直接連接到數據庫，沒有通過應用程序的認證流程。這**不代表**應用程序中的認證有問題。

## 🎯 真正的問題

403 錯誤更可能來自：
1. **API route 中的 Supabase client 沒有正確的認證上下文**
2. **Cookie 或 JWT token 沒有正確傳遞**
3. **`getApiUser` 返回的 client 配置錯誤**

## 🔧 解決方案

### 方案 1：檢查 API route 中的認證日誌（推薦）

在 `apps/web/app/api/rag/upload/route.ts` 中添加詳細的認證日誌：

```typescript
export async function POST(req: NextRequest) {
    try {
        // 1. 驗證用戶身份
        const { supabase, user, errorType } = await getApiUser(req)

        // 🔍 添加診斷日誌
        console.log('[RAG Upload] ===== 認證診斷 =====')
        console.log('[RAG Upload] User:', user ? { id: user.id, email: user.email } : 'null')
        console.log('[RAG Upload] Error Type:', errorType)
        
        // 測試 Supabase client 的認證狀態
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()
        console.log('[RAG Upload] Supabase Auth User:', supabaseUser ? { id: supabaseUser.id } : 'null')
        console.log('[RAG Upload] Supabase Auth Error:', authError)
        console.log('[RAG Upload] ====================')

        if (!user) {
            return NextResponse.json(
                {
                    error: 'UNAUTHORIZED',
                    message: errorType === 'invalid-jwt'
                        ? '登入狀態失效，請重新登入'
                        : '需要登入',
                    debug: {
                        errorType,
                        supabaseUser: supabaseUser ? { id: supabaseUser.id } : null,
                        authError: authError?.message,
                    }
                },
                { status: 401 }
            )
        }

        // ... 其餘代碼
```

然後：
1. 重啟 dev server
2. 嘗試上傳文件
3. 查看終端中的日誌輸出
4. 確認 `user` 和 `supabaseUser` 是否為 null

### 方案 2：檢查瀏覽器中的認證狀態

在瀏覽器 Console 中執行：

```javascript
// 檢查當前認證狀態
const checkAuth = async () => {
  try {
    // 檢查是否有 session
    const response = await fetch('/api/auth/user', { credentials: 'include' })
    const data = await response.json()
    console.log('認證狀態:', data)
    
    // 檢查 Supabase client（如果有的話）
    if (window.supabase) {
      const { data: { user }, error } = await window.supabase.auth.getUser()
      console.log('Supabase User:', user)
      console.log('Supabase Error:', error)
    }
  } catch (error) {
    console.error('檢查認證失敗:', error)
  }
}

checkAuth()
```

### 方案 3：檢查 Cookie 和 Headers

在瀏覽器開發者工具的 Network Tab 中：
1. 找到 `/api/rag/upload` 請求
2. 查看 **Request Headers**：
   - 是否有 `Cookie` header？
   - 是否有 `Authorization` header？
3. 查看 **Response Headers**：
   - 狀態碼是什麼？
   - 錯誤訊息是什麼？

### 方案 4：臨時繞過 RLS 測試（僅用於診斷）

**⚠️ 僅用於測試，不要用於生產環境！**

如果確認認證有問題，可以臨時使用 `service_role` key 來繞過 RLS：

```typescript
// 在 apps/web/app/api/rag/upload/route.ts 中
import { createClient } from '@supabase/supabase-js'

// 臨時使用 service_role（僅用於診斷）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 使用 service_role 繞過 RLS
)

// 在插入時使用 supabaseAdmin 而不是 supabase
const { data: docRecord, error: insertError } = await supabaseAdmin
    .from('rag_documents')
    .insert({
        user_id: user.id, // 仍然使用認證的 user.id
        // ...
    })
```

**測試完後記得恢復原來的代碼！**

## 📋 診斷步驟總結

1. ✅ **RLS 政策已確認存在**（從你的查詢結果）
2. ✅ **SQL Editor 中 auth.uid() 為 NULL 是正常的**（SQL Editor 沒有認證上下文）
3. 🔍 **下一步：檢查應用程序中的認證**
   - 添加認證日誌到 API route
   - 檢查瀏覽器中的認證狀態
   - 查看 Network Tab 中的實際請求/響應

## 🎯 最可能的情況

根據代碼分析，`/api/rag/upload` 使用 `getApiUser(req)` 來獲取認證用戶。如果：
- `getApiUser` 返回的 `user` 為 `null` → 會返回 401（不是 403）
- `getApiUser` 返回的 `supabase` client 沒有正確的認證上下文 → 插入時會觸發 RLS 403

**建議：先添加認證日誌，確認實際的認證狀態。**







































