# Google OAuth 設定指南

## 問題診斷

根據你提供的截圖,問題是:
1. ✅ Google Cloud Console 的重定向 URI 已正確設定為 Supabase 的回調 URL
2. ✅ Supabase URL 環境變數已正確配置
3. ⚠️  可能缺少 `NEXT_PUBLIC_SITE_URL` 環境變數,導致本地開發時重定向問題

## 解決方案

### 步驟 1: 檢查並更新 `.env.local`

確保你的 `apps/web/.env.local` 文件包含以下配置:

```bash
# Supabase Configuration (必須)
NEXT_PUBLIC_SUPABASE_URL=https://umzqjgxsetsmwzhniemw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key

# Site URL Configuration (重要!)
# 本地開發時使用 localhost
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 生產環境時使用你的實際域名
# NEXT_PUBLIC_SITE_URL=https://plms-learning.vercel.app
```

### 步驟 2: Google Cloud Console 設定

你的 Google Cloud Console 設定已經正確:

#### 已授權的 JavaScript 來源
- ✅ `http://localhost:3000` (本地開發)
- ✅ `https://plms-learning.vercel.app` (生產環境)

#### 已授權的重新導向 URI
- ✅ `https://umzqjgxsetsmwzhniemw.supabase.co/auth/v1/callback` (Supabase OAuth 回調)

**重要提示**:
- Supabase 會自動處理 OAuth 回調,然後重定向到你的應用
- 不需要添加 `http://localhost:3000/auth/callback` 到 Google Cloud Console
- 重定向流程: Google → Supabase → 你的應用 `/auth/callback`

### 步驟 3: Supabase Dashboard 設定

前往你的 Supabase Project Dashboard:
1. 進入 **Authentication** → **URL Configuration**
2. 確保 **Site URL** 設定為:
   - 開發環境: `http://localhost:3000`
   - 生產環境: `https://plms-learning.vercel.app`
3. 在 **Redirect URLs** 中添加:
   - `http://localhost:3000/auth/callback`
   - `https://plms-learning.vercel.app/auth/callback`

### 步驟 4: 測試流程

1. 確保開發服務器運行在 `http://localhost:3000`
   ```bash
   cd apps/web
   pnpm dev
   ```

2. 訪問登入頁面並點擊 "使用 Google 登入"

3. 預期流程:
   - 用戶點擊 Google 登入
   - 跳轉到 Google 選擇帳號頁面
   - 選擇帳號後,Google 回調到 Supabase
   - Supabase 處理認證後重定向到 `http://localhost:3000/auth/callback`
   - `/auth/callback` 檢查 onboarding 進度並導向對應頁面

## 常見問題

### Q: 為什麼登入後會返回 localhost 而不是 vercel.app?

A: 這是正常的!當你在本地開發時:
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000` 會讓 OAuth 重定向到 localhost
- 這樣你才能在本地測試整個登入流程

如果你想測試生產環境的流程,請:
1. 直接訪問 `https://plms-learning.vercel.app`
2. 或者臨時更改 `.env.local` 中的 `NEXT_PUBLIC_SITE_URL` 為生產 URL

### Q: 為什麼在選完頭像後又回到 localhost?

A: 這個問題已經在程式碼中修復了:
- 之前的邏輯檢查 `avatar_url`,但 migration 會自動設置默認頭像
- 現在改為檢查 `current_step`,確保用戶必須主動選擇頭像

### Q: 如何確認 Supabase 的 Site URL 設定?

A: 運行以下 SQL 查詢在 Supabase SQL Editor:
```sql
-- 檢查當前的 Site URL 設定
SELECT * FROM auth.config;
```

## 下一步

修復完成後,完整的 onboarding 流程應該是:
1. 用戶訪問 `/onboarding` 或使用 Google 登入
2. 登入成功後 → `/auth/callback` 檢查進度
3. 新用戶 → `/onboarding/goal` (設定目標)
4. 完成目標 → `/onboarding/avatar` (選擇頭像) ✅ 修復
5. 完成頭像 → `/onboarding/challenge` (3題測驗)
6. 完成測驗 → `/onboarding/reward` (查看結果)
7. 完成 → `/home`

## 需要檢查的環境變數

請運行以下命令檢查你的環境變數:

```bash
cd apps/web
cat .env.local | grep -E "NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SITE_URL"
```

如果 `NEXT_PUBLIC_SITE_URL` 未設定,請添加它:

```bash
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" >> .env.local
```

然後重啟開發服務器。
