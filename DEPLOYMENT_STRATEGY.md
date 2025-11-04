# 🚀 PLMS 部署策略指南

## 📋 現況分析

### 專案架構
- **類型**: Progressive Web App (PWA) + 未來 Mobile App
- **技術棧**: Next.js 14 (React) + Supabase + OpenAI
- **代碼結構**: Monorepo (apps/web + 未來 apps/mobile)

### 為什麼不建議直接部署到現有網站？

1. **環境隔離** - 需要獨立的環境變數（OpenAI API keys, Supabase credentials）
2. **開發彈性** - 頻繁更新時不影響主網站穩定性
3. **Mobile 準備** - 未來轉 React Native 時共用 API 層，需要獨立網域
4. **SEO 分離** - 學習平台與主網站的 SEO 策略不同

---

## 🎯 推薦策略：三階段部署

### 階段 1️⃣：本地開發 (現在)

**目的**: 功能開發與測試

```bash
# 啟動開發伺服器
cd "/Users/simonac/Desktop/moonshot idea"
pnpm dev:web

# 瀏覽器訪問
http://127.0.0.1:3000/ask
```

**檢查清單**:
- ✅ 伺服器運行在 port 3000
- ✅ 可以訪問 /ask 頁面
- ✅ Analytics errors 可忽略（不影響核心功能）

---

### 階段 2️⃣：Staging 環境 (推薦: Vercel)

**目的**: 給用戶測試，收集反饋

#### 選項 A: Vercel (推薦)

**優勢**:
- ✅ 免費方案充足 (個人專案)
- ✅ 自動 HTTPS + CDN
- ✅ 環境變數管理簡單
- ✅ GitHub 自動部署
- ✅ 獨立網域 (e.g., `plms-staging.vercel.app`)
- ✅ 支援 Next.js 原生

**設置步驟**:

1. **安裝 Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **初次部署**:
   ```bash
   cd "/Users/simonac/Desktop/moonshot idea"
   vercel
   ```
   - 選擇 `apps/web` 作為 root
   - 設置環境變數 (OpenAI API key, Supabase URL/Key)

3. **後續更新**:
   ```bash
   vercel --prod
   ```

4. **環境變數設置** (Vercel Dashboard):
   ```
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

#### 選項 B: Netlify

類似 Vercel，但需要額外配置 Next.js。

---

### 階段 3️⃣：Production (功能穩定後)

**目的**: 正式對外服務

#### 方案 A: Subdomain (推薦)

```
learn.yourdomain.com
```

**優勢**:
- 獨立管理
- 不影響主站
- 未來可獨立擴展
- 品牌統一 (同網域)

**DNS 設置**:
```
learn.yourdomain.com  →  CNAME  →  cname.vercel-dns.com
```

#### 方案 B: 獨立網域

```
plms.app  或  yourlearn.app
```

**優勢**:
- 完全獨立品牌
- SEO 獨立優化
- 更容易記憶

**缺點**:
- 需要購買新網域
- 品牌分散

#### ❌ 不推薦: 主網域路徑

```
yourdomain.com/learn  (不推薦)
```

**問題**:
- Next.js routing 複雜
- 主站框架衝突
- 環境變數共享風險
- Mobile app 轉換困難

---

## 📱 Mobile App 準備

### 現有架構已支援

當前的 monorepo 架構已經為 mobile 做好準備：

```
apps/
├── web/          # PWA (已完成)
└── mobile/       # React Native (未來)
    └── shared/   # 共用代碼
```

### 轉換選項

1. **React Native** (推薦)
   - 共用大部分邏輯代碼
   - 原生性能
   - 獨立 App Store / Google Play

2. **Capacitor**
   - PWA 直接打包
   - 快速上線
   - 性能略遜於原生

### API 層獨立部署

```
api.yourdomain.com  →  Vercel Serverless Functions
learn.yourdomain.com  →  Web PWA
```

Mobile app 呼叫同一個 API endpoint，完美解耦。

---

## 🔐 安全考量

### 環境變數分離

**開發環境** (.env.local):
```bash
OPENAI_API_KEY=sk-test-...
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
```

**Production** (Vercel):
```bash
OPENAI_API_KEY=sk-prod-...
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
```

### API Key 保護

- ❌ 不要直接暴露在前端
- ✅ 使用 Next.js API Routes (serverless)
- ✅ Supabase Row Level Security (RLS)

---

## 📊 成本估算

### Vercel 免費方案限制

- Bandwidth: 100GB/月
- Serverless Execution: 100GB-hours/月
- Build Minutes: 6000 分鐘/月

**對於初期用戶 (< 1000 MAU)**: 完全夠用

### 升級需求

當每月活躍用戶 > 5000 時考慮：
- Vercel Pro: $20/月
- 或自建 VPS (Digital Ocean, AWS)

---

## ✅ 下一步行動

### 立即執行 (今天)

1. **確認本地預覽**:
   ```bash
   # 打開瀏覽器
   http://127.0.0.1:3000/ask
   ```

2. **測試新 UI**:
   - 貼上閱讀理解題目
   - 檢查解析顯示
   - 驗證誘答標記

### 本週內

1. **設置 Vercel Staging**:
   ```bash
   vercel
   ```

2. **邀請測試用戶**:
   - 分享 staging URL
   - 收集反饋

3. **優化手機體驗**:
   - PWA manifest
   - 響應式佈局

### 下個月

1. **準備 Production**:
   - 決定網域策略
   - DNS 設置
   - SSL 配置

2. **Mobile 原型**:
   - 評估 React Native vs Capacitor
   - 開始 shared logic 重構

---

## 🆘 常見問題

### Q: 本地看不到預覽怎麼辦？

A: 檢查以下：
```bash
# 1. 確認伺服器運行
lsof -i :3000

# 2. 清除瀏覽器緩存
# Chrome: Cmd+Shift+Delete

# 3. 重啟開發伺服器
pkill -f "next dev"
pnpm dev:web
```

### Q: 可以先部署到 GitHub Pages 嗎？

A: ❌ 不推薦
- GitHub Pages 只支援靜態站點
- Next.js 需要 serverless functions (API routes)
- 建議用 Vercel (免費 + 原生支援)

### Q: 要不要先做 Mobile App？

A: ❌ 不建議
- 先把 Web PWA 做穩定
- 收集用戶反饋
- 然後再考慮原生 App
- PWA 已經可以「添加到主屏幕」

---

## 📞 聯絡支援

如果遇到部署問題：
1. 檢查 Vercel 部署日誌
2. 查看 Next.js 錯誤信息
3. 確認環境變數設置正確

**記住**: 先在本地測試通過，再部署到 staging，最後才上 production。
