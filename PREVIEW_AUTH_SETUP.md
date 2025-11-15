# 🔐 Preview Environment Authentication Setup

> **目的**: 讓 Vercel Preview 環境能夠自動使用固定 mock user，無需手動 Google 登入

> **快速開始**: 查看 [QUICK_START_PREVIEW_AUTH.md](QUICK_START_PREVIEW_AUTH.md) 了解 5 分鐘設置步驟

---

## 📋 問題背景

### Play 頁面需求
- `PlayProvider` 需要 `useAuth()` 提供使用者才能載入資料
- 調用受保護 API：`/api/play/user/status`、`/api/play/user/consume-energy`
- 這些 API 在 Supabase 端驗證 user，沒有 user 會返回 401
- 無 `userStatus` 時，頁面顯示「請先登入」卡片，不載入對戰素材

### Backpack 頁面需求
- `/api/backpack` 透過 `createClient()` 查登入者
- 沒有 user 返回 401
- 前端看到 401 會 fallback 到 localStorage 或 seedFiles
- 實際的錯題本資料、上傳、聯動都需要登入後的 user id

---

## ✅ 解決方案：統一 Mock User 策略

### 核心概念

使用環境變數 `NEXT_PUBLIC_PREVIEW_FORCE_MOCK` 和 `PREVIEW_FORCE_MOCK` 來啟用 mock user 模式：

- **本地開發**: `NODE_ENV === 'development'` 自動啟用
- **Vercel Preview**: 設置 `NEXT_PUBLIC_PREVIEW_FORCE_MOCK=true` 和 `PREVIEW_FORCE_MOCK=true`
- **正式環境**: 不設置任何 flag，使用真實 Supabase auth

### Mock User 資訊

```typescript
const MOCK_USER_ID = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
const MOCK_EMAIL = 'dev@test.com'
```

---

## 🛠️ 實作細節

### 1. Client-side Auth ([lib/auth-context.tsx](apps/web/lib/auth-context.tsx))

```typescript
// 判斷是否使用 mock user
const USE_MOCK_USER =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_PREVIEW_FORCE_MOCK === 'true'

// 在 AuthProvider 中自動登入
if (USE_MOCK_USER) {
  const mode = process.env.NODE_ENV === 'development' ? 'Development' : 'Preview'
  console.log(`[AuthProvider] 🔧 ${mode} mode: Auto-login as`, MOCK_USER_ID)
  const mockUser = {
    id: MOCK_USER_ID,
    email: 'dev@test.com',
    // ...
  } as User
  setUser(mockUser)
  setLoading(false)
  return
}
```

### 2. Server-side Auth ([lib/supabase/server.ts](apps/web/lib/supabase/server.ts))

```typescript
// 判斷是否使用 mock user (server-side 不用 NEXT_PUBLIC_ prefix)
const USE_MOCK_USER =
  process.env.NODE_ENV === 'development' ||
  process.env.PREVIEW_FORCE_MOCK === 'true'

// 使用 service role key 繞過 RLS
const supabaseKey = USE_MOCK_USER
  ? process.env.SUPABASE_SERVICE_ROLE_KEY!
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Override auth methods
if (USE_MOCK_USER) {
  client.auth.getUser = async () => ({
    data: { user: mockUser },
    error: null,
  })
}
```

---

## 🚀 Vercel 部署設置

### 步驟 1: 添加環境變數到 Vercel Project

在 Vercel 專案設置中添加以下環境變數（**僅限 Preview 環境**）:

1. **`NEXT_PUBLIC_PREVIEW_FORCE_MOCK`**
   - Value: `true`
   - Environment: **Preview** only
   - 用途: Client-side 啟用 mock user

2. **`PREVIEW_FORCE_MOCK`**
   - Value: `true`
   - Environment: **Preview** only
   - 用途: Server-side 啟用 mock user

3. **`SUPABASE_SERVICE_ROLE_KEY`** (如果尚未添加)
   - Value: `eyJhbGciOiJIUz...` (從 Supabase Dashboard 獲取)
   - Environment: **Preview** only
   - 用途: 繞過 RLS，直接讀寫 profiles

### 步驟 2: 確保其他必要環境變數存在

確保以下變數在 Preview 環境已設置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BATTLE_WS_URL` (如果 Battle WebSocket 在遠端)

### 步驟 3: 重新部署

設置完環境變數後，重新觸發 Preview 部署：

```bash
git commit --allow-empty -m "Trigger preview rebuild"
git push
```

---

## 📊 資料準備

### 為 Mock User 預先 Seed 資料

確保 Mock User (`e770f9cd-52a7-43de-b983-70f6f78d2f53`) 在 Supabase 有以下資料：

#### 1. `profiles` 表

```sql
INSERT INTO profiles (id, name, daily_energy, daily_energy_reset_at, coins, elo_rank)
VALUES (
  'e770f9cd-52a7-43de-b983-70f6f78d2f53',
  'Dev User',
  8,
  NOW() + INTERVAL '1 day',
  1000,
  1000
)
ON CONFLICT (id) DO UPDATE SET
  daily_energy = 8,
  coins = 1000,
  elo_rank = 1000;
```

#### 2. `backpack_items` 表

```sql
-- 插入一些範例錯題
INSERT INTO backpack_items (user_id, subject, question_text, correct_answer, user_answer, created_at)
VALUES
  ('e770f9cd-52a7-43de-b983-70f6f78d2f53', 'math', 'What is 2+2?', '4', '3', NOW() - INTERVAL '1 day'),
  ('e770f9cd-52a7-43de-b983-70f6f78d2f53', 'english', 'What is the past tense of "go"?', 'went', 'goed', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;
```

#### 3. `seed_questions` 表 (如果有)

確保有足夠的題目供 Battle 系統使用。

---

## ✅ 驗證步驟

### 本地驗證

```bash
# 確保在開發模式
NODE_ENV=development pnpm dev

# 訪問以下頁面，應該自動登入
open http://localhost:3000/play
open http://localhost:3000/backpack

# 檢查 Console，應該看到：
# [AuthProvider] 🔧 Development mode: Auto-login as e770f9cd-52a7-43de-b983-70f6f78d2f53
```

### Preview 驗證

1. 推送分支到 GitHub，觸發 Vercel Preview
2. 訪問 Preview URL
3. 打開 Browser DevTools Console
4. 應該看到：
   ```
   [AuthProvider] 🔧 Preview mode: Auto-login as e770f9cd-52a7-43de-b983-70f6f78d2f53
   ```
5. Play 頁面應該顯示 Energy: 8, Coins: 1000, Elo: 1000
6. Backpack 頁面應該顯示預先 seed 的錯題

---

## 🔒 安全考量

### 為什麼這樣做是安全的？

1. **僅限 Preview 環境**
   - `PREVIEW_FORCE_MOCK` 僅在 Preview 環境設置
   - Production 環境不設置此變數，使用真實 auth

2. **固定 UUID**
   - Mock user 使用固定 UUID，易於追蹤和管理
   - 不會影響真實用戶資料

3. **Service Role Key 隔離**
   - Preview 環境使用獨立的 Supabase project（建議）
   - 或使用相同 project 但透過 RLS policy 隔離 dev user

### 建議的安全措施

1. **使用獨立 Supabase Project**
   ```bash
   # Preview 環境
   NEXT_PUBLIC_SUPABASE_URL=https://preview-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=preview-service-key

   # Production 環境
   NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=prod-service-key (不設置 PREVIEW_FORCE_MOCK)
   ```

2. **限制 Mock User 權限**
   - 在 RLS policy 中限制 mock user 只能訪問測試資料
   - 或在 preview project 中使用完全隔離的資料集

---

## 🎯 優勢

### 相比 Google Sign-In 按鈕的優勢

1. **無需 OAuth 流程**
   - 不需要設置 Google OAuth
   - 不需要處理 session cookie
   - 不需要 E2E 身份同步

2. **確定性資料**
   - 固定 UUID 確保每次 preview 看到相同資料
   - 易於錄影和演示
   - 易於測試和 debug

3. **簡化開發流程**
   - 本地開發和遠端 preview 體驗一致
   - 不需要每次都手動登入
   - Play/Backpack/API 驗證邏輯保持一致

4. **易於維護**
   - 只需設置兩個環境變數
   - 不需要額外 UI 元件
   - 代碼邏輯清晰簡單

---

## 🐛 故障排除

### 問題 1: Preview 環境仍然要求登入

**檢查清單**:
- [ ] 確認 `NEXT_PUBLIC_PREVIEW_FORCE_MOCK=true` 已設置在 Vercel Preview 環境
- [ ] 確認 `PREVIEW_FORCE_MOCK=true` 已設置在 Vercel Preview 環境
- [ ] 確認 `SUPABASE_SERVICE_ROLE_KEY` 已設置
- [ ] 檢查 Browser Console 是否有 `[AuthProvider] 🔧 Preview mode` 日誌
- [ ] 重新觸發 Preview 部署

### 問題 2: API 返回 401/404

**可能原因**:
- Mock user 在 Supabase 沒有 profile 記錄
- Service role key 不正確
- RLS policy 阻止訪問

**解決方法**:
1. 在 Supabase 手動插入 profile：
   ```sql
   INSERT INTO profiles (id, name, daily_energy, coins, elo_rank)
   VALUES ('e770f9cd-52a7-43de-b983-70f6f78d2f53', 'Dev User', 8, 1000, 1000)
   ON CONFLICT (id) DO UPDATE SET daily_energy = 8;
   ```

2. 檢查 Vercel Function Logs 查看錯誤詳情

### 問題 3: WebSocket 連線失敗

**原因**:
- Battle WebSocket 服務器沒有運行在遠端
- `NEXT_PUBLIC_BATTLE_WS_URL` 未正確設置

**解決方法**:
1. 確保 Battle WebSocket 服務器已部署到遠端
2. 或暫時禁用 WebSocket 功能進行其他功能的預覽

---

## 📚 相關文件

- [AuthProvider 實作](apps/web/lib/auth-context.tsx)
- [Server Supabase Client 實作](apps/web/lib/supabase/server.ts)
- [Play API Status 路由](apps/web/app/api/play/user/status/route.ts)
- [Backpack API 路由](apps/web/app/api/backpack/route.ts)
- [架構規範](ARCHITECTURE.md)

---

## 📞 支援

如有問題，請參考：
1. 本文檔的故障排除章節
2. Vercel Function Logs
3. Browser DevTools Console
4. Supabase Dashboard Logs

---

**最後更新**: 2025-01-14
