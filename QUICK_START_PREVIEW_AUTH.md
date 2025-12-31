# 🚀 Quick Start: Preview Auth Setup

> **5 分鐘快速設置 Preview 環境自動登入**

---

## 📋 TL;DR

本地開發和 Vercel Preview 環境都使用固定 mock user，無需手動登入。

- ✅ **本地**: 自動啟用（`NODE_ENV=development`）
- ✅ **Preview**: 設置 2 個環境變數即可
- ✅ **Production**: 使用真實 Supabase auth

---

## 🎯 為什麼需要這個？

### 問題
- **Play 頁面**: 需要登入才能載入 WebSocket、Elo、Energy
- **Backpack 頁面**: 需要登入才能讀寫錯題本資料
- **傳統方案**: 需要設置 Google OAuth、處理 session、同步身份

### 解決方案
- 使用固定 mock user (`e770f9cd-52a7-43de-b983-70f6f78d2f53`)
- 本地和 Preview 自動登入
- 資料確定性、易於測試和錄影

---

## 🛠️ 設置步驟

### Step 1: Supabase 準備資料

1. 打開 Supabase SQL Editor
2. 執行 seed script:
   ```bash
   # 位置: apps/web/db/sql/seed_preview_user.sql
   ```

3. 這會創建：
   - ✅ Mock user profile (Energy: 8, Coins: 1000, Elo: 1000)
   - ✅ 7 個範例錯題本項目
   - ✅ 跨科目測試資料

### Step 2: 本地開發（已自動啟用）

本地開發無需任何設置，已自動啟用：

```bash
# 直接啟動即可
pnpm dev

# 訪問頁面會自動登入
open http://localhost:3000/play
open http://localhost:3000/backpack
```

**驗證**: Console 應該顯示：
```
[AuthProvider] 🔧 Development mode: Auto-login as e770f9cd-52a7-43de-b983-70f6f78d2f53
```

### Step 3: Vercel Preview 設置

#### 3.1 添加環境變數

在 Vercel Project Settings → Environment Variables，添加：

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_PREVIEW_FORCE_MOCK` | `true` | **Preview** |
| `PREVIEW_FORCE_MOCK` | `true` | **Preview** |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | **Preview** |

**重要**:
- ⚠️ 僅選擇 **Preview** 環境，不要選 Production
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 從 Supabase Dashboard → Settings → API 獲取

#### 3.2 確認其他變數

確保以下變數在 Preview 環境已存在：

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `NEXT_PUBLIC_BATTLE_WS_URL` (如果有遠端 WebSocket)

#### 3.3 觸發部署

```bash
# 推送到 GitHub 觸發 Preview
git push origin your-branch

# 或空 commit 重新觸發
git commit --allow-empty -m "Trigger preview rebuild"
git push
```

---

## ✅ 驗證

### 本地驗證清單

- [ ] `pnpm dev` 啟動成功
- [ ] 訪問 `/play` 看到 Energy: 8, Coins: 1000
- [ ] 訪問 `/backpack` 看到 7 個範例錯題
- [ ] Console 顯示 `Development mode: Auto-login`

### Preview 驗證清單

- [ ] Preview 部署成功
- [ ] 訪問 Preview URL
- [ ] 打開 DevTools Console
- [ ] 看到 `[AuthProvider] 🔧 Preview mode: Auto-login as e770f9cd...`
- [ ] `/play` 頁面顯示 Energy/Coins/Elo
- [ ] `/backpack` 頁面顯示錯題本資料

---

## 🔧 故障排除

### 問題 1: Preview 仍要求登入

**解決**:
1. 檢查 Vercel 環境變數是否正確設置
2. 確認只選擇了 **Preview** 環境
3. 檢查 Console 是否有錯誤
4. 重新觸發部署

### 問題 2: API 返回 404/401

**原因**: Mock user 沒有 profile

**解決**:
```sql
-- 在 Supabase SQL Editor 執行
INSERT INTO profiles (id, name, daily_energy, coins, elo_rank)
VALUES ('e770f9cd-52a7-43de-b983-70f6f78d2f53', 'Dev User', 8, 1000, 1000)
ON CONFLICT (id) DO UPDATE SET daily_energy = 8;
```

### 問題 3: WebSocket 連線失敗

**原因**: Battle WebSocket 服務器未運行

**本地解決**:
```bash
cd services/battle-ws
./start.sh
```

**Preview 解決**:
- 設置 `NEXT_PUBLIC_BATTLE_WS_URL` 指向遠端 WebSocket
- 或暫時忽略此功能進行其他測試

---

## 📊 實作細節

### Client-side ([lib/auth-context.tsx](apps/web/lib/auth-context.tsx))

```typescript
const USE_MOCK_USER =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_PREVIEW_FORCE_MOCK === 'true'

if (USE_MOCK_USER) {
  // Auto-login as mock user
  setUser(mockUser)
}
```

### Server-side ([lib/supabase/server.ts](apps/web/lib/supabase/server.ts))

```typescript
const USE_MOCK_USER =
  process.env.NODE_ENV === 'development' ||
  process.env.PREVIEW_FORCE_MOCK === 'true'

// Use service role key to bypass RLS
const supabaseKey = USE_MOCK_USER
  ? process.env.SUPABASE_SERVICE_ROLE_KEY!
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

---

## 🎯 環境對照表

| Environment | Mock User | Supabase Key | Login Required |
|------------|-----------|--------------|----------------|
| **Local Dev** | ✅ Auto | Service Role | ❌ No |
| **Vercel Preview** | ✅ Auto (if flag set) | Service Role | ❌ No |
| **Production** | ❌ Disabled | Anon Key | ✅ Yes |

---

## 📚 相關文件

- [完整設置指南](PREVIEW_AUTH_SETUP.md) - 詳細說明和安全考量
- [Seed Script](apps/web/db/sql/seed_preview_user.sql) - 資料準備腳本
- [.env.example](apps/web/.env.example) - 環境變數範例

---

## 🆘 需要幫助？

1. 檢查 [故障排除](#-故障排除) 章節
2. 查看 Browser Console 錯誤
3. 檢查 Vercel Function Logs
4. 參考完整設置指南

---

**最後更新**: 2025-01-14
