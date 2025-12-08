# Vercel 部署檢查清單

## 📋 部署前檢查

### 1. 環境變數設定（Vercel Dashboard → Settings → Environment Variables）

#### 🔴 必需環境變數（Production）

```env
# Supabase (公開)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (服務端，不公開)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# 應用設定
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

#### 🟡 可選環境變數（Feature Flags）

```env
# 遊戲模式控制
NEXT_PUBLIC_ENABLE_SYSTEM_BATTLE=false  # 目前關閉對戰功能
NEXT_PUBLIC_ENABLE_LYRICAL_FLOW=true
NEXT_PUBLIC_ENABLE_FOCUS_MODE=true
NEXT_PUBLIC_ENABLE_CUSTOM_BATTLE=false
NEXT_PUBLIC_ENABLE_UGC=false
NEXT_PUBLIC_ENABLE_PRACTICE=false
NEXT_PUBLIC_ENABLE_DETECTIVE=false
NEXT_PUBLIC_ENABLE_EDITOR=false

# Hotfix Flags (可選)
NEXT_PUBLIC_HOTFIX_BATCH1=true
NEXT_PUBLIC_HOTFIX_BATCH1_5=true
NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA=true
NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY=true
NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API=true
NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF=true

# 開發/測試 (Production 應設為 false)
NEXT_PUBLIC_DISABLE_MOCK_USER=true
NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST=false
```

#### 🟢 Sentry (可選)

```env
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-token
```

### 2. Vercel 專案設定

#### Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `cd ../.. && pnpm install && turbo run build --filter=web`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `cd ../.. && pnpm install`
- **Root Directory**: `apps/web` (如果使用 monorepo)

#### Node.js Version
- **Node.js Version**: 20.x (在 `package.json` 中指定)

### 3. 手機端兼容性檢查

#### ✅ PWA 設定
- [x] `manifest.json` 已配置
- [x] Service Worker 已啟用（生產環境）
- [x] 圖標文件存在：`/icon-192.png`, `/icon-512.png`
- [x] `display: standalone` 設定正確

#### ✅ Viewport 設定
- [x] 使用 `100dvh` 處理動態視口
- [x] Safe Area Insets 已處理（`env(safe-area-inset-top/bottom)`）
- [x] `orientation: portrait-primary` 設定

#### ✅ 響應式設計
- [x] Mobile-first CSS 設計
- [x] Touch 事件支援
- [x] 字體大小適配（最小 16px 避免 iOS 縮放）

### 4. 部署步驟

1. **推送代碼到 Git**
   ```bash
   git add .
   git commit -m "Deploy: Feature flags and mobile optimizations"
   git push origin main
   ```

2. **Vercel 自動部署**
   - 推送後 Vercel 會自動觸發部署
   - 檢查部署日誌確認環境變數已載入

3. **驗證部署**
   - [ ] 訪問生產 URL
   - [ ] 檢查手機端顯示
   - [ ] 測試 PWA 安裝
   - [ ] 驗證功能正常（單字滑卡、專注模式）
   - [ ] 確認 AI 對戰已隱藏

### 5. 手機端測試清單

#### iOS Safari
- [ ] 頁面正常載入
- [ ] Safe Area 正確顯示
- [ ] 底部 TabBar 不被遮擋
- [ ] PWA 可安裝
- [ ] 觸控操作正常

#### Android Chrome
- [ ] 頁面正常載入
- [ ] 底部導航正常
- [ ] PWA 可安裝
- [ ] 觸控操作正常

### 6. 功能驗證

#### ✅ 啟用功能
- [ ] 單字滑卡 (`LYRICAL_FLOW`)
- [ ] 專注模式 (`FOCUS_MODE`)

#### ❌ 已隱藏功能
- [ ] AI 對戰 (`SYSTEM_BATTLE`) - 應已隱藏
- [ ] 自訂對戰 (`CUSTOM_BATTLE`) - 應已隱藏
- [ ] 其他進階功能 - 應已隱藏

### 7. 常見問題排查

#### 問題：環境變數未生效
- 檢查 Vercel Dashboard → Settings → Environment Variables
- 確認變數名稱正確（大小寫敏感）
- 重新部署以載入新變數

#### 問題：手機端顯示異常
- 檢查 `manifest.json` 設定
- 確認 viewport meta tag
- 測試不同設備尺寸

#### 問題：PWA 無法安裝
- 檢查 HTTPS 設定（Vercel 自動提供）
- 確認 Service Worker 已註冊
- 檢查 `manifest.json` 完整性

## 📱 手機端環境變數驗證

所有 `NEXT_PUBLIC_*` 環境變數會在構建時注入到客戶端代碼中，手機端可以正常訪問。

**注意**：
- `NEXT_PUBLIC_*` 變數會暴露在客戶端代碼中，不要包含敏感資訊
- 服務端變數（如 `SUPABASE_SERVICE_ROLE_KEY`）不會暴露給客戶端

## 🚀 快速部署命令

```bash
# 1. 確認所有變更已提交
git status

# 2. 推送到遠端
git push origin main

# 3. Vercel 會自動部署
# 或手動觸發：
vercel --prod
```
