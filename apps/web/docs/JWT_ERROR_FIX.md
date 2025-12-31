# JWT 錯誤處理修復總結

## 問題描述

錯誤訊息：**"Expected 3 parts in JWT; got 1"**

這個錯誤發生在：
- 使用者的 cookie 中存在無效的 JWT token
- Supabase 嘗試解析 JWT 時發現格式不正確（正常 JWT 應該是 `header.payload.signature` 三部分）

## 解決方案

### 1. **統一的 Mock 模式邏輯**

在開發和預覽環境中，我們需要 mock 使用者來測試需要登入的頁面（如 backpack、play）。

#### 環境變數設定

```bash
# .env.local (開發環境)
NODE_ENV=development                    # 自動啟用 mock 模式
BACKPACK_DEV_USER_ID=your-user-id      # Mock 使用者 ID
AUTH_CLEAR_INVALID_JWT=true            # 自動清除無效 JWT

# 或者明確指定
APP_USE_MOCK_USER=true
```

#### Mock 模式觸發條件（三個條件任一即可）

```typescript
const USE_MOCK_USER =
  process.env.NODE_ENV === 'development' ||      // 開發模式
  process.env.PREVIEW_FORCE_MOCK === 'true' ||   // Vercel 預覽模式
  process.env.APP_USE_MOCK_USER === 'true'       // 手動啟用
```

### 2. **三層防護機制**

#### 第一層：Cookie 過濾（`lib/supabase/server.ts`）

在 Supabase client 創建時，過濾掉無效的 JWT cookies：

```typescript
// lib/supabase/server.ts:47-60
get(name: string) {
  if (USE_MOCK_USER) {
    return undefined  // Mock 模式下完全忽略 cookies
  }

  const value = cookieStore.get(name)?.value

  // 驗證 JWT 格式
  if (value && value.includes('.')) {
    const parts = value.split('.')
    if (parts.length !== 3) {
      console.log(`[Supabase] Filtering invalid JWT cookie: ${name}`)
      return undefined
    }
    // 驗證每個部分都是有效的 base64
    const looksValid = parts.every(part =>
      part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part)
    )
    if (!looksValid) {
      return undefined
    }
  }

  return value
}
```

#### 第二層：錯誤捕獲（`lib/auth/getCurrentUser.ts`）

集中處理認證邏輯，捕獲 JWT 錯誤並返回結構化的錯誤類型：

```typescript
// lib/auth/getCurrentUser.ts
export async function getCurrentUser(): Promise<CurrentUserResult> {
  // Mock 模式優先
  if (MOCK_FLAG && MOCK_USER_ID) {
    return { user: buildMockUser(MOCK_USER_ID), errorType: 'none' }
  }

  const supabase = createClient()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return handleSupabaseAuthError(error)  // 處理 JWT 錯誤
    }

    if (!user) {
      return { user: null, errorType: 'unauthenticated' }
    }

    return { user, errorType: 'none' }
  } catch (error) {
    return handleSupabaseAuthError(error)  // 捕獲異常
  }
}

function handleSupabaseAuthError(error: unknown): CurrentUserResult {
  const message = getErrorMessage(error)

  // 識別 JWT 錯誤
  if (message.includes('Expected 3 parts in JWT')) {
    console.warn('[Auth] Invalid JWT detected, treating as signed-out.')

    // 開發模式下自動清除
    if (CLEAR_INVALID_JWT) {
      clearAuthCookies()
    }

    return { user: null, errorType: 'invalid-jwt' }
  }

  return { user: null, errorType: 'other' }
}
```

#### 第三層：API Route 統一處理（`lib/api/auth.ts`）

提供 `getApiUser()` helper 給所有 API routes 使用：

```typescript
// lib/api/auth.ts
export async function getApiUser(req?: NextRequest): Promise<{
  supabase: SupabaseClient
  user: User | null
  errorType: AuthErrorType
}> {
  const supabase = getSupabaseClient(req)
  const token = req ? extractBearerToken(req.headers.get('authorization')) : null

  if (token) {
    // Bearer token 驗證，捕獲 JWT 錯誤
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        const message = error.message || String(error)
        if (message.includes('Expected 3 parts in JWT')) {
          return { supabase, user: null, errorType: 'invalid-jwt' }
        }
        return { supabase, user: null, errorType: 'other' }
      }

      return { supabase, user, errorType: 'none' }
    } catch (err) {
      // 捕獲拋出的異常
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('Expected 3 parts in JWT')) {
        return { supabase, user: null, errorType: 'invalid-jwt' }
      }
      return { supabase, user: null, errorType: 'other' }
    }
  }

  // Cookie-based auth，使用 getCurrentUser
  const { user, errorType } = await getCurrentUser()
  return { supabase, user, errorType }
}
```

### 3. **更新的檔案清單**

#### 核心認證檔案
- ✅ `apps/web/lib/auth/getCurrentUser.ts` - 統一 mock 模式邏輯，自動清除無效 JWT
- ✅ `apps/web/lib/api/auth.ts` - 新增 `getApiUser()` helper
- ✅ `apps/web/lib/supabase/server.ts` - JWT cookie 過濾

#### RSC (React Server Components)
- ✅ `apps/web/app/(app)/error-book/page.tsx`
- ✅ `apps/web/app/(app)/error-book/[id]/page.tsx`
- ✅ `apps/web/app/(app)/backpack/page.tsx`

#### API Routes（已更新）
- ✅ `apps/web/app/api/error-book/route.ts`
- ✅ `apps/web/app/api/backpack/route.ts`
- ✅ `apps/web/app/api/backpack/save/route.ts`
- ✅ `apps/web/app/api/backpack/upload/route.ts`

#### API Routes（待更新）
以下檔案仍使用舊的 `supabase.auth.getUser()` 直接調用，建議更新為 `getApiUser()`：
- `apps/web/app/api/metrics/route.ts`
- `apps/web/app/api/missions/*.ts`
- `apps/web/app/api/packs/*.ts`
- `apps/web/app/api/play/user/status/route.ts`
- `apps/web/app/api/play/user/consume-energy/route.ts`
- `apps/web/app/api/play/knowledge/generate-note/route.ts`

## 使用指南

### React Server Component 中使用

```typescript
import { getCurrentUser } from '@/lib/auth/getCurrentUser'

export default async function MyPage() {
  const { user, errorType } = await getCurrentUser()

  if (!user) {
    const message = errorType === 'invalid-jwt'
      ? '登入狀態失效，請重新整理頁面或重新登入。'
      : errorType === 'unauthenticated'
      ? '請登入後再使用此功能。'
      : '無法取得使用者資訊，請稍後再試。'

    return <ErrorMessage>{message}</ErrorMessage>
  }

  // 正常渲染
  return <div>Welcome {user.id}</div>
}
```

### API Route 中使用

```typescript
import { getApiUser } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)

  if (!user) {
    const message = errorType === 'invalid-jwt'
      ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
      : errorType === 'unauthenticated'
      ? 'Authentication required'
      : 'Authentication error occurred'

    return NextResponse.json(
      { error: 'UNAUTHORIZED', message, errorType },
      { status: 401 }
    )
  }

  // 正常處理
  const { data } = await supabase.from('table').select().eq('user_id', user.id)
  return NextResponse.json({ data })
}
```

## 測試步驟

### 1. Mock 模式測試

```bash
# 設定環境變數
export APP_USE_MOCK_USER=true
export BACKPACK_DEV_USER_ID=e770f9cd-52a7-43de-b983-70f6f78d2f53
export AUTH_CLEAR_INVALID_JWT=true

# 啟動開發伺服器
pnpm dev

# 訪問需要登入的頁面
open http://localhost:3000/backpack
open http://localhost:3000/error-book
```

**預期結果**：頁面直接載入 mock 使用者資料，無需登入

### 2. 無效 JWT 測試

```bash
# 1. 手動在瀏覽器 DevTools 中設定無效 cookie
document.cookie = "sb-xxx-auth-token=invalid; path=/;"

# 2. 重新整理頁面
```

**預期結果**：
- 不會出現紅色錯誤訊息
- 顯示「登入狀態失效，請重新整理頁面或重新登入」
- Cookie 被自動清除（在開發模式下）

### 3. 正常登入測試

```bash
# 1. 移除 mock 相關環境變數
unset APP_USE_MOCK_USER
unset BACKPACK_DEV_USER_ID

# 2. 正常登入後訪問頁面
```

**預期結果**：正常載入使用者資料

## 效果

### 修復前
```
Error: Expected 3 parts in JWT; got 1
  at GoTrueClient.getUser()
  at ...
```
→ 紅色錯誤訊息，頁面崩潰

### 修復後
```
[Auth] Invalid JWT detected, treating as signed-out.
```
→ 友善的訊息卡片：「登入狀態失效，請重新整理頁面或重新登入。」

## 為什麼使用 Mock 模式？

1. **符合專案規定**：backpack 和 play 頁面必須登入才能存取
2. **方便開發測試**：不需要每次都登入就能測試功能
3. **預覽環境友善**：Vercel Preview 可以展示完整功能給非登入用戶
4. **保持安全性**：使用 Service Role Key 繞過 RLS，但僅在開發/預覽環境

## 注意事項

⚠️ **安全提醒**：
- Mock 模式僅應在開發和預覽環境使用
- 生產環境必須設定 `NODE_ENV=production` 且不設定 `APP_USE_MOCK_USER`
- Service Role Key 絕對不能暴露在客戶端

✅ **最佳實踐**：
- 始終使用 `getCurrentUser()` 或 `getApiUser()` 而非直接調用 `supabase.auth.getUser()`
- 根據 `errorType` 提供友善的錯誤訊息
- 在開發模式下自動清除無效 JWT
