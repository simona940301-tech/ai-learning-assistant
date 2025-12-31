# 認證問題診斷報告 - Google OAuth 與 /reward 路由失效

## 問題摘要

從錯誤日誌和程式碼分析，發現以下主要問題：

### 1. Google OAuth 配置問題
- **Supabase Dashboard 缺少 Google Provider 配置**
- 沒有設置 Google OAuth 客戶端 ID 和密鑰
- 缺少正確的 redirect URI 配置

### 2. Mock User 干擾真實認證
- 程式碼中仍有 Mock User 邏輯干擾
- 環境變數配置混亂

### 3. /reward 路由認證檢查過嚴
- 對匿名用戶的處理邏輯有問題
- 認證檢查導致正常流程被阻擋

## 具體錯誤分析

### A. Google OAuth 失效原因
```
console.log('[AuthProvider] Error getting user: AuthSessionMissingError: Auth session missing!')
```

**根本原因：**
1. Supabase 項目中沒有啟用 Google OAuth Provider
2. 缺少 Google OAuth 客戶端配置
3. Redirect URI 不匹配

### B. Sentry 403 錯誤
```
POST https://o4506904258674688.ingest.us.sentry.io/api/4510178264809472/envelope… 403 (Forbidden)
```

**原因：** Sentry DSN 配置錯誤或過期

### C. /reward 路由問題
程式碼顯示 reward 頁面有過多的認證檢查，阻止了正常的匿名到註冊流程

## 解決方案

### 第一步：修復 Google OAuth 配置

#### 1. Supabase Dashboard 設置
1. 登入 Supabase Dashboard
2. 進入 Authentication > Providers
3. 啟用 Google Provider
4. 設置以下配置：

```
Client ID: [從 Google Cloud Console 獲取]
Client Secret: [從 Google Cloud Console 獲取]
Redirect URL: https://umzqjgxsetsmwzhniemw.supabase.co/auth/v1/callback
```

#### 2. Google Cloud Console 設置
1. 建立或選擇 Google Cloud 項目
2. 啟用 Google+ API
3. 建立 OAuth 2.0 客戶端 ID
4. 設置授權重定向 URI：
   - `https://umzqjgxsetsmwzhniemw.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (開發環境)

### 第二步：清理環境配置

#### 修復 .env.local
```bash
# 移除 Mock User 配置
# APP_USE_MOCK_USER=true  # 註解掉
# NEXT_PUBLIC_PREVIEW_FORCE_MOCK=true  # 註解掉

# 確保真實認證
NEXT_PUBLIC_DISABLE_MOCK_USER=true
NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST=true
```

### 第三步：修復程式碼問題

#### 1. 修復 Auth Context
程式碼中 Mock User 邏輯需要完全移除

#### 2. 修復 /reward 頁面認證邏輯
移除過嚴的認證檢查，允許匿名用戶正常流程

#### 3. 修復 Middleware 配置
確保 `/onboarding/reward` 路由允許匿名存取

## 緊急修復步驟 (立即執行)

### 1. 立即修復環境配置
```bash
cd apps/web
cp .env.local .env.local.backup
```

### 2. 更新 .env.local
移除所有 Mock User 相關配置

### 3. 重啟開發伺服器
```bash
npm run dev
```

### 4. 測試流程
1. 清除瀏覽器 cookies 和 localStorage
2. 訪問 `/onboarding/goal` 
3. 完成挑戰
4. 測試 Google 註冊功能

## 預期結果

修復後應該能夠：
1. ✅ Google OAuth 正常工作
2. ✅ 匿名用戶能正常訪問 /reward
3. ✅ 註冊流程完整運行
4. ✅ 錯誤日誌清除

## 下一步行動

1. **立即執行：** 環境配置清理
2. **24小時內：** Supabase OAuth 配置
3. **本週內：** 程式碼重構去除 Mock User 邏輯