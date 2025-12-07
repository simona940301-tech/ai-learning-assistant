# 📱 手機測試 Google OAuth 設定指南

## 問題診斷

當你在**手機上測試** Vercel 部署的應用時,OAuth 重定向會出問題,因為:
1. ❌ 手機無法訪問 `localhost:3000`
2. ✅ 你應該通過 `https://plms-learning.vercel.app` 訪問
3. ⚠️  Supabase 需要正確配置生產環境的重定向 URL

## 🎯 解決方案

### 步驟 1: Vercel 環境變數設定

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇你的專案 `plms-learning`
3. 進入 **Settings** → **Environment Variables**
4. 添加以下環境變數:

```
NEXT_PUBLIC_SITE_URL=https://plms-learning.vercel.app
```

5. 確保這個變數應用到 **Production**, **Preview**, 和 **Development** 環境
6. **重新部署**應用 (Settings → Deployments → 最新部署 → Redeploy)

### 步驟 2: Supabase Dashboard 設定

這是**最關鍵**的步驟！

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案 `umzqjgxsetsmwzhniemw`
3. 進入 **Authentication** → **URL Configuration**
4. 設定以下內容:

#### Site URL (網站 URL)
```
https://plms-learning.vercel.app
```

#### Redirect URLs (重定向 URL)
添加以下 URL (每行一個):
```
https://plms-learning.vercel.app/auth/callback
https://plms-learning.vercel.app/*
http://localhost:3000/auth/callback
http://localhost:3000/*
```

**重要**:
- `/*` 是通配符,允許所有子路徑
- 同時保留 localhost 以便本地開發

5. 點擊 **Save** 保存設定

### 步驟 3: Google Cloud Console (已完成 ✅)

你的 Google Cloud Console 設定已經正確:

**已授權的 JavaScript 來源**:
- ✅ `https://plms-learning.vercel.app`
- ✅ `http://localhost:3000`

**已授權的重新導向 URI**:
- ✅ `https://umzqjgxsetsmwzhniemw.supabase.co/auth/v1/callback`

不需要修改!

## 📱 手機測試流程

設定完成後,在手機上測試:

1. **清除瀏覽器快取和 Cookie**
   - iOS Safari: 設定 → Safari → 清除歷史記錄與網站資料
   - Android Chrome: 設定 → 隱私權 → 清除瀏覽資料

2. **訪問生產環境**
   ```
   https://plms-learning.vercel.app
   ```

3. **開始 Onboarding**
   - 點擊 "使用 Google 登入"
   - 選擇 Google 帳號
   - 授權後應該會回到 `https://plms-learning.vercel.app/auth/callback`
   - 然後導向到 onboarding 流程

4. **預期流程**:
   ```
   開始 → 設定目標 → 選擇頭像 → 3題測驗 → 查看結果 → 完成
   ```

## 🔍 Debug: 檢查當前設定

### 方法 1: Vercel 環境變數檢查

在 Vercel Dashboard 執行以下步驟:
1. Settings → Environment Variables
2. 確認 `NEXT_PUBLIC_SITE_URL` 存在且值為 `https://plms-learning.vercel.app`
3. 確認應用到所有環境 (Production, Preview, Development)

### 方法 2: 瀏覽器 Console 檢查

在手機上打開應用,然後:
1. 使用 [Eruda](https://github.com/liriliri/eruda) 或遠程調試
2. 在 Console 中輸入:
   ```javascript
   console.log('Site URL:', process.env.NEXT_PUBLIC_SITE_URL)
   console.log('Current Origin:', window.location.origin)
   ```
3. 應該看到 `https://plms-learning.vercel.app`

### 方法 3: Supabase 設定檢查

在 Supabase SQL Editor 執行:
```sql
-- 檢查 Site URL 設定
SELECT * FROM auth.config;
```

應該看到 `site_url` 為 `https://plms-learning.vercel.app`

## ⚠️ 常見錯誤

### 錯誤 1: 重定向到 localhost

**症狀**: 手機上登入後嘗試跳轉到 `http://localhost:3000`

**原因**:
- Vercel 環境變數未設定 `NEXT_PUBLIC_SITE_URL`
- 或者應用沒有重新部署

**解決**:
1. 在 Vercel 添加 `NEXT_PUBLIC_SITE_URL`
2. 重新部署應用

### 錯誤 2: Supabase redirect_uri_mismatch

**症狀**: Supabase 錯誤: "redirect_uri provided does not match"

**原因**: Supabase 的 Redirect URLs 沒有包含你的生產 URL

**解決**:
1. 前往 Supabase Dashboard
2. Authentication → URL Configuration → Redirect URLs
3. 添加 `https://plms-learning.vercel.app/auth/callback`

### 錯誤 3: Google OAuth 錯誤

**症狀**: Google 顯示 "redirect_uri_mismatch" 或 "unauthorized"

**原因**: Google Cloud Console 的授權來源未包含你的域名

**解決**:
1. 前往 Google Cloud Console
2. 確認 **已授權的 JavaScript 來源** 包含 `https://plms-learning.vercel.app`

## 🚀 快速設定命令

如果你想在本地測試生產環境的行為,可以:

```bash
# 1. 在 apps/web/.env.local 添加生產 URL
echo "NEXT_PUBLIC_SITE_URL=https://plms-learning.vercel.app" >> apps/web/.env.local

# 2. 重啟開發服務器
pnpm --filter web dev
```

但**注意**: 這會讓 OAuth 重定向到 Vercel 而不是 localhost,你需要:
- 在 Vercel 上部署最新代碼
- 或者改回 `http://localhost:3000` 以便本地測試

## ✅ 檢查清單

手機測試前,確保以下都已完成:

- [ ] Vercel 環境變數設定 `NEXT_PUBLIC_SITE_URL=https://plms-learning.vercel.app`
- [ ] Vercel 應用已重新部署
- [ ] Supabase Site URL = `https://plms-learning.vercel.app`
- [ ] Supabase Redirect URLs 包含 `https://plms-learning.vercel.app/auth/callback`
- [ ] Google Cloud Console 授權來源包含 `https://plms-learning.vercel.app`
- [ ] 手機瀏覽器已清除快取

完成後,在手機上訪問 `https://plms-learning.vercel.app` 測試!

## 💡 推薦: 使用 Vercel Preview URL 測試

如果你想在不影響生產環境的情況下測試:

1. 推送代碼到 Git (非 main 分支)
2. Vercel 會自動創建 Preview 部署
3. 獲取 Preview URL (例如: `https://plms-learning-git-fix-oauth-yourusername.vercel.app`)
4. 在 Supabase Redirect URLs 添加 Preview URL
5. 在手機上測試 Preview URL

這樣你可以安全測試,不會影響生產環境!
