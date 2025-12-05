# Vercel Deployment Guide - MVP 部署準備

本指南涵蓋如何部署 MVP 版本，包括功能旗標管理、PWA 自動更新和環境配置。

---

## 📋 部署前檢查清單

### 1. 功能旗標檢查

**✅ 生產就緒功能（預設啟用）：**
- System Battle（系統對戰）
- Custom Battle（自訂對戰）
- UGC Mode（內容貢獻）
- Practice Mode（無限練習）
- Focus Mode（專注修煉）

**❌ 未完成功能（預設禁用）：**
- Detective Mode（偵探檔案）- UI 完整但 API 未實作
- Editor Mode（實習編輯）- 功能性待確認

---

## 🚀 Vercel 部署步驟

### 步驟 1: 設定環境變數

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇專案
3. 進入 **Settings** → **Environment Variables**
4. 添加以下變數（參考 `.env.production.example`）

**必要變數：**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**功能旗標（MVP 階段）：**
```bash
NEXT_PUBLIC_ENABLE_SYSTEM_BATTLE=true
NEXT_PUBLIC_ENABLE_CUSTOM_BATTLE=true
NEXT_PUBLIC_ENABLE_UGC=true
NEXT_PUBLIC_ENABLE_PRACTICE=true
NEXT_PUBLIC_ENABLE_FOCUS=true
NEXT_PUBLIC_ENABLE_DETECTIVE=false
NEXT_PUBLIC_ENABLE_EDITOR=false
```

### 步驟 2: 部署

```bash
# CLI 方式
vercel --prod

# 或透過 Git Push（如已連接）
git push origin main
```

### 步驟 3: 驗證

訪問 `/play` 頁面，確認：
- ✅ 看到 5 個生產就緒功能
- ❌ 看不到 Detective Mode 和 Editor Mode

---

## 🎯 功能旗標管理

### 啟用新功能

1. Vercel Dashboard → Environment Variables
2. 找到對應旗標（例如 `NEXT_PUBLIC_ENABLE_DETECTIVE`）
3. 改為 `true`
4. Redeploy

**無需更改程式碼！**

---

## 🔄 PWA 自動更新

### 工作原理

1. Service Worker 每 60 秒檢查更新
2. 檢測到新版本時顯示通知
3. 用戶點擊「重新整理」立即更新

### 測試

```bash
# 1. 建立並啟動
pnpm build && pnpm start

# 2. 修改程式碼並重建
pnpm build && pnpm start

# 3. 返回瀏覽器（不刷新）
# 應看到更新通知
```

---

## 📊 監控

### 檢查功能旗標
```javascript
console.log('Enabled:', getEnabledGameModes())
console.log('Disabled:', getDisabledGameModes())
```

### 檢查 Service Worker
```javascript
navigator.serviceWorker.ready.then(reg => {
  console.log('Active:', reg.active)
  console.log('Waiting:', reg.waiting)
})
```

---

## 🚨 常見問題

### Q: 功能旗標沒生效？
- 確認已儲存並重新部署
- 清除瀏覽器快取

### Q: PWA 更新沒通知？
- 確認已安裝 PWA（加入主畫面）
- 檢查 Console 是否有錯誤

---

## ✅ 部署檢查清單

部署前：
- [ ] 環境變數已設定
- [ ] 功能旗標符合 MVP 計劃
- [ ] 建構成功無錯誤

部署後：
- [ ] Play 頁面顯示正確
- [ ] 所有功能正常運作
- [ ] PWA 可安裝
- [ ] 更新通知正常

---

**最後更新**: 2025-12-05
