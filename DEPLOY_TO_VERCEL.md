# 🚀 部署到 Vercel 指南

## 快速部署步驟

### 方法 1: 使用 Vercel Dashboard（推薦）

1. **登入 Vercel**
   - 訪問 https://vercel.com
   - 使用 GitHub/GitLab/Bitbucket 帳號登入

2. **導入專案**
   - 點擊 "Add New Project"
   - 選擇你的 Git 倉庫
   - 選擇 `apps/web` 作為 Root Directory

3. **設定環境變數**
   - 進入專案 Settings → Environment Variables
   - 參考 `VERCEL_DEPLOYMENT_CHECKLIST.md` 添加所有必需變數

4. **部署**
   - Vercel 會自動檢測 Next.js 並開始構建
   - 等待構建完成

### 方法 2: 使用 Vercel CLI

```bash
# 1. 安裝 Vercel CLI（如果尚未安裝）
npm i -g vercel

# 2. 登入 Vercel
vercel login

# 3. 在專案根目錄執行部署
cd /Users/simonac/Desktop/moonshot-idea
vercel

# 4. 生產環境部署
vercel --prod
```

## 📱 手機端兼容性確認

### ✅ 已完成的配置

1. **PWA 設定**
   - ✅ `manifest.json` 已配置
   - ✅ Service Worker 已啟用（生產環境）
   - ✅ 圖標文件已準備

2. **Viewport 設定**
   - ✅ 使用 `100dvh` 處理動態視口
   - ✅ Safe Area Insets 已處理
   - ✅ `viewportFit: 'cover'` 設定

3. **響應式設計**
   - ✅ Mobile-first CSS
   - ✅ Touch 事件支援
   - ✅ 字體大小適配

4. **Feature Flags**
   - ✅ `SYSTEM_BATTLE: false` - AI 對戰已隱藏
   - ✅ `LYRICAL_FLOW: true` - 單字滑卡啟用
   - ✅ `FOCUS_MODE: true` - 專注模式啟用

## 🔧 環境變數設定

### 必需變數（在 Vercel Dashboard 設定）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# 應用 URL
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### Feature Flags（可選，已有預設值）

```env
# 目前設定（可在 Vercel 中覆蓋）
NEXT_PUBLIC_ENABLE_SYSTEM_BATTLE=false
NEXT_PUBLIC_ENABLE_LYRICAL_FLOW=true
NEXT_PUBLIC_ENABLE_FOCUS_MODE=true
```

## 📋 部署後檢查清單

### 功能測試
- [ ] 訪問生產 URL
- [ ] 檢查手機端顯示（iOS Safari / Android Chrome）
- [ ] 測試 PWA 安裝
- [ ] 驗證單字滑卡功能
- [ ] 驗證專注模式功能
- [ ] 確認 AI 對戰已隱藏

### 手機端測試
- [ ] iOS Safari - 頁面正常載入
- [ ] iOS Safari - Safe Area 正確顯示
- [ ] iOS Safari - 底部 TabBar 不被遮擋
- [ ] Android Chrome - 頁面正常載入
- [ ] Android Chrome - 觸控操作正常
- [ ] PWA 可安裝（iOS / Android）

### 性能檢查
- [ ] 首頁載入時間 < 3 秒
- [ ] 圖片優化正常
- [ ] Service Worker 已註冊
- [ ] 離線功能正常

## 🐛 常見問題

### 問題：構建失敗
**解決方案**：
1. 檢查 Vercel 構建日誌
2. 確認所有環境變數已設定
3. 檢查 `package.json` 中的 Node.js 版本

### 問題：環境變數未生效
**解決方案**：
1. 確認變數名稱正確（大小寫敏感）
2. 重新部署以載入新變數
3. 檢查變數是否為 `NEXT_PUBLIC_*`（客戶端變數）

### 問題：手機端顯示異常
**解決方案**：
1. 檢查 `manifest.json` 設定
2. 確認 viewport meta tag
3. 測試不同設備尺寸
4. 檢查 Safe Area Insets

## 📞 支援

如有問題，請檢查：
- Vercel 部署日誌
- 瀏覽器控制台錯誤
- 手機端開發者工具
