# ✅ Vercel 環境變數檢查清單

> **用於驗證 Vercel Preview 環境設置是否正確**

---

## 📋 必需的環境變數（Preview 環境）

### 1. Preview Auth 相關

| Variable | Value | Environment | Status |
|----------|-------|-------------|--------|
| `NEXT_PUBLIC_PREVIEW_FORCE_MOCK` | `true` | **Preview only** | ✅ 已設置 |
| `PREVIEW_FORCE_MOCK` | `true` | **Preview only** | ✅ 已設置 |

**重要提醒**:
- ⚠️ 確認**僅選擇 Preview** 環境，不要勾選 Production
- ⚠️ 兩個變數都必須設置（client-side 和 server-side）

---

### 2. Supabase 相關

| Variable | Example Value | Environment | 用途 |
|----------|--------------|-------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | All | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | **Preview only** | Service role (bypass RLS) |

**檢查點**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已設置且正確
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設置且正確
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 已設置（Preview 環境）
- [ ] Service role key 從 Supabase Dashboard → Settings → API → `service_role` 獲取

---

### 3. OpenAI 相關

| Variable | Environment | 用途 |
|----------|-------------|------|
| `OPENAI_API_KEY` | All | AI 解釋功能 |

**檢查點**:
- [ ] `OPENAI_API_KEY` 已設置且有效

---

### 4. Battle System 相關（可選）

| Variable | Example Value | Environment | 用途 |
|----------|--------------|-------------|------|
| `NEXT_PUBLIC_BATTLE_WS_URL` | `ws://your-server.com/ws/battle` | Preview | WebSocket 連線 |

**檢查點**:
- [ ] 如果有遠端 WebSocket，設置 `NEXT_PUBLIC_BATTLE_WS_URL`
- [ ] 如果沒有，暫時可忽略（本地測試時會失敗）

---

## 🔍 驗證步驟

### Step 1: 檢查 Vercel Dashboard

1. 進入 Vercel Project → Settings → Environment Variables
2. 確認以下變數存在且環境正確：

```
✅ NEXT_PUBLIC_PREVIEW_FORCE_MOCK = "true" (Preview)
✅ PREVIEW_FORCE_MOCK = "true" (Preview)
✅ SUPABASE_SERVICE_ROLE_KEY = "eyJ..." (Preview)
✅ NEXT_PUBLIC_SUPABASE_URL = "https://..." (All)
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJ..." (All)
✅ OPENAI_API_KEY = "sk-..." (All)
```

### Step 2: 觸發新的 Preview 部署

環境變數設置後，需要重新部署才會生效：

```bash
# 方法 1: 推送新 commit
git commit --allow-empty -m "chore: trigger preview rebuild for env vars"
git push

# 方法 2: 在 Vercel Dashboard 手動觸發 Redeploy
```

### Step 3: 驗證 Preview 環境

部署完成後：

1. **訪問 Preview URL**
   ```
   https://your-app-git-branch-username.vercel.app
   ```

2. **打開 Browser DevTools Console**
   - 按 F12 或右鍵 → Inspect
   - 切換到 Console tab

3. **檢查日誌**
   應該看到：
   ```
   [AuthProvider] 🔧 Preview mode: Auto-login as e770f9cd-52a7-43de-b983-70f6f78d2f53
   ```

4. **測試頁面功能**
   - 訪問 `/play` - 應該看到 Energy: 8, Coins: 1000, Elo: 1000
   - 訪問 `/backpack` - 應該看到範例錯題本資料

---

## 🐛 常見問題排除

### 問題 1: Console 沒有 "Preview mode" 日誌

**可能原因**:
- 環境變數沒有正確設置
- 部署時環境變數未生效（需要重新部署）

**解決方法**:
1. 檢查 Vercel Dashboard 環境變數
2. 確認環境選擇是 **Preview**
3. 重新觸發部署

### 問題 2: API 返回 401/404

**可能原因**:
- Mock user 在 Supabase 沒有 profile
- Service role key 不正確

**解決方法**:
1. 在 Supabase SQL Editor 執行 seed script:
   ```sql
   -- 位置: apps/web/db/sql/seed_preview_user.sql
   ```
2. 檢查 `SUPABASE_SERVICE_ROLE_KEY` 是否正確

### 問題 3: 仍然要求登入

**可能原因**:
- `NEXT_PUBLIC_PREVIEW_FORCE_MOCK` 未設置（注意有 `NEXT_PUBLIC_` prefix）
- 環境變數值不是字串 `"true"`

**解決方法**:
1. 確認兩個變數都已設置：
   - `NEXT_PUBLIC_PREVIEW_FORCE_MOCK=true` (client-side)
   - `PREVIEW_FORCE_MOCK=true` (server-side)
2. 值必須是小寫字串 `"true"`，不能是布林值

---

## 📊 環境對照表

| Environment | NODE_ENV | PREVIEW_FORCE_MOCK | Mock User | 說明 |
|------------|----------|-------------------|-----------|------|
| **Local Dev** | `development` | 不需要 | ✅ 自動 | 本地開發自動啟用 |
| **Vercel Preview** | `production` | `true` | ✅ 啟用 | 需要設置環境變數 |
| **Vercel Production** | `production` | 未設置 | ❌ 禁用 | 使用真實 auth |

---

## 🔐 安全提醒

### Production 環境確認

**重要**: 確保 Production 環境**不要**設置以下變數：
- ❌ `NEXT_PUBLIC_PREVIEW_FORCE_MOCK`
- ❌ `PREVIEW_FORCE_MOCK`
- ❌ `SUPABASE_SERVICE_ROLE_KEY` (Production 用 anon key)

如果不小心設置了，立即刪除並重新部署！

---

## 📝 下一步

設置完成後：

1. [ ] 在 Supabase 執行 seed script ([seed_preview_user.sql](apps/web/db/sql/seed_preview_user.sql))
2. [ ] 觸發 Preview 部署
3. [ ] 驗證 Preview 環境正常運作
4. [ ] 測試 Play 和 Backpack 頁面
5. [ ] 錄製 Demo 影片（可選）

---

## 📚 相關文件

- [快速開始指南](QUICK_START_PREVIEW_AUTH.md)
- [完整技術文件](PREVIEW_AUTH_SETUP.md)
- [變更摘要](PREVIEW_AUTH_CHANGES_SUMMARY.md)
- [Seed Script](apps/web/db/sql/seed_preview_user.sql)

---

**最後更新**: 2025-01-14
