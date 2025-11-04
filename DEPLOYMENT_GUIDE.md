# 🚀 Vercel 自動部署指南

## ✅ 目前狀態

**已設置完成！** 你的專案現在已經連結到：
- **GitHub Repo:** https://github.com/simona940301-tech/ai-learning-assistant
- **當前分支:** `chore/cleanup-tutor-safe`
- **Vercel Dashboard:** https://vercel.com/dashboard

---

## 🔄 自動部署原理

### Vercel 自動部署流程

```
你做更改 → Git Commit → Git Push → GitHub → Vercel 自動偵測 → 自動部署
```

**每次你推送到 GitHub，Vercel 會自動：**
1. 偵測到新的 commit
2. 自動觸發建置 (build)
3. 自動部署到預覽環境
4. 提供預覽連結

---

## 📝 使用方式

### 方法 1：快速部署腳本 ⚡ (推薦)

```bash
./scripts/quick-deploy.sh
```

**功能：**
- ✅ 一鍵部署，無提示
- ✅ 自動添加所有更改
- ✅ 自動提交並推送

**適用於：**
- 快速修復 bug
- UI 微調
- 文案更新

---

### 方法 2：完整部署腳本 📋

```bash
./scripts/deploy-to-vercel.sh "你的提交訊息"
```

**功能：**
- ✅ 顯示詳細部署進度
- ✅ 檢查 Git 狀態
- ✅ 自動添加、提交、推送
- ✅ 顯示部署資訊和連結

**範例：**
```bash
./scripts/deploy-to-vercel.sh "Fix: E6/E7 detection improvements"
```

---

### 方法 3：手動部署 🛠️

```bash
# 1. 添加更改
git add .

# 2. 提交
git commit -m "你的提交訊息

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. 推送 (觸發 Vercel 部署)
git push origin chore/cleanup-tutor-safe
```

---

## 📊 查看部署狀態

### 1. Vercel Dashboard

前往：https://vercel.com/dashboard

你會看到：
- 🟢 **Building** - 正在建置
- 🟢 **Ready** - 部署完成
- 🔴 **Error** - 建置失敗

### 2. GitHub Actions (如果有設置)

前往：https://github.com/simona940301-tech/ai-learning-assistant/actions

查看建置狀態和日誌

### 3. 預覽連結

Vercel 會在每次部署後提供預覽連結，格式：
```
https://your-project-abc123.vercel.app
```

---

## ⏱️ 部署時間

- **預覽環境 (Preview):** 通常 2-3 分鐘
- **生產環境 (Production):** 通常 3-5 分鐘

---

## 🔧 環境變數設置

如果需要設置環境變數 (如 API keys)：

### 方法 1：通過 Vercel Dashboard

1. 前往 https://vercel.com/dashboard
2. 選擇你的專案
3. 點擊 **Settings** → **Environment Variables**
4. 添加變數：
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - 等等...

### 方法 2：通過 Vercel CLI

```bash
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_API_KEY preview
vercel env add OPENAI_API_KEY development
```

---

## ❓ 常見問題

### Q1: 推送後沒有自動部署？

**檢查清單：**
1. ✅ Vercel 專案是否已連結 GitHub repo？
2. ✅ 是否推送到正確的分支？
3. ✅ Vercel Dashboard 是否顯示建置記錄？

**解決方法：**
```bash
# 確認遠端連結
git remote -v

# 確認當前分支
git branch --show-current

# 手動觸發部署
vercel --prod
```

### Q2: 建置失敗怎麼辦？

**查看日誌：**
1. 前往 Vercel Dashboard
2. 點擊失敗的部署
3. 查看 **Build Logs**

**常見錯誤：**
- ❌ **Missing dependencies** → 檢查 `package.json`
- ❌ **Environment variables missing** → 設置環境變數
- ❌ **TypeScript errors** → 修復型別錯誤

### Q3: 預覽連結在哪裡？

**3 種方式獲取：**
1. Vercel Dashboard → Deployments → 點擊最新部署 → Visit
2. GitHub PR 評論中的 Vercel bot 留言
3. Vercel CLI: `vercel ls`

---

## ✨ 最佳實踐

### 1. 部署前測試

```bash
# 本地測試
npm run build

# 本地預覽
npm run start
```

### 2. 使用有意義的提交訊息

```bash
# ✅ 好的提交訊息
git commit -m "Fix: E6/E7 detection accuracy improvements"
git commit -m "Feature: Add English grammar (E2) detection"
git commit -m "Refactor: Simplify sentence detection logic"

# ❌ 不好的提交訊息
git commit -m "update"
git commit -m "fix bug"
git commit -m "wip"
```

### 3. 分支策略

```
main (生產環境)
  ↑
  └── chore/cleanup-tutor-safe (當前開發分支)
       ↑
       └── feature/new-feature (功能分支)
```

**推薦流程：**
1. 在功能分支開發 (`feature/xxx`)
2. 測試無誤後合併到開發分支 (`chore/cleanup-tutor-safe`)
3. 最終合併到主分支 (`main`) → 自動部署到生產環境

---

## 📚 快速參考

### 腳本位置

```
scripts/
  ├── deploy-to-vercel.sh   # 完整部署腳本（有提示）
  └── quick-deploy.sh        # 快速部署腳本（無提示）
```

### 常用指令

```bash
# 快速部署
./scripts/quick-deploy.sh

# 完整部署
./scripts/deploy-to-vercel.sh "你的提交訊息"

# 查看 Vercel 狀態
vercel ls

# 查看日誌
vercel logs

# 手動部署到生產環境
vercel --prod
```

---

## 🎯 總結

✅ **已設置完成的內容：**
- Git 連結到 GitHub
- 自動部署腳本已創建
- 每次推送自動觸發 Vercel 部署

✅ **你現在可以：**
- 使用 `./scripts/quick-deploy.sh` 快速部署
- 使用 `./scripts/deploy-to-vercel.sh "訊息"` 完整部署
- 每次推送到 GitHub 自動觸發部署

🎉 **開始使用吧！**

---

---

# 📋 原部署指南 (參考)

## 📋 預覽系統

### 本地預覽
您的系統已經在運行！訪問以下網址：

- **主頁**: `http://localhost:3000`
- **AI 助手**: `http://localhost:3000/ask`
- **檔案庫**: `http://localhost:3000/backpack`

### 完整功能測試流程
1. **進入 Backpack**: 查看示例檔案
2. **點擊 "Ask ▼"**: 選擇 "整理" 或 "解題"
3. **自動跳轉**: 到 Ask 頁面，檔案已載入
4. **測試 AI**: 輸入任何學習內容，點擊 "開始整理"
5. **查看結果**: 五段式結構化輸出
6. **保存結果**: 點擊 "存至 Backpack"

---

## 🌐 GitHub 部署

### 1. 創建 GitHub Repository

#### 方法 A: 使用 GitHub CLI (推薦)
```bash
# 安裝 GitHub CLI (如果還沒有)
brew install gh

# 登入 GitHub
gh auth login

# 創建 repository
gh repo create ai-learning-assistant --public --description "AI-powered learning assistant platform based on PLMS Agent System"

# 推送代碼
git remote add origin https://github.com/YOUR_USERNAME/ai-learning-assistant.git
git branch -M main
git push -u origin main
```

#### 方法 B: 使用 GitHub 網頁
1. 訪問 [GitHub.com](https://github.com)
2. 點擊 "New repository"
3. Repository name: `ai-learning-assistant`
4. Description: `AI-powered learning assistant platform based on PLMS Agent System`
5. 選擇 Public
6. 不要初始化 README (我們已經有了)
7. 點擊 "Create repository"

### 2. 連接本地 Repository
```bash
# 添加遠程 repository
git remote add origin https://github.com/YOUR_USERNAME/ai-learning-assistant.git

# 推送代碼到 GitHub
git branch -M main
git push -u origin main
```

---

## ☁️ 雲端部署

### Vercel 部署 (推薦)

#### 1. 準備 Vercel
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入 Vercel
vercel login
```

#### 2. 部署項目
```bash
# 在項目目錄中運行
vercel

# 按照提示完成設置
# - Set up and deploy? Yes
# - Which scope? 選擇你的帳戶
# - Link to existing project? No
# - Project name? ai-learning-assistant
# - Directory? ./
# - Override settings? No
```

#### 3. 設定環境變數
在 Vercel Dashboard 中：
1. 進入項目設置
2. 點擊 "Environment Variables"
3. 添加以下變數：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

#### 4. 重新部署
```bash
vercel --prod
```

### Netlify 部署

#### 1. 準備 Netlify
```bash
# 安裝 Netlify CLI
npm i -g netlify-cli

# 登入 Netlify
netlify login
```

#### 2. 部署項目
```bash
# 構建項目
npm run build

# 部署到 Netlify
netlify deploy --prod --dir=out
```

### Railway 部署

#### 1. 準備 Railway
1. 訪問 [Railway.app](https://railway.app)
2. 使用 GitHub 登入
3. 連接你的 repository

#### 2. 設定環境變數
在 Railway Dashboard 中添加環境變數：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

---

## 🔧 環境設定

### 本地開發環境
```bash
# 複製環境變數模板
cp .env.local.example .env.local

# 編輯 .env.local 文件
nano .env.local
```

### 生產環境檢查清單
- [ ] Supabase 項目已建立
- [ ] 資料庫 schema 已執行
- [ ] API 金鑰已設定
- [ ] OpenAI API 金鑰已獲取
- [ ] 環境變數已配置
- [ ] 域名已設定 (可選)

---

## 📊 部署後驗證

### 功能測試清單
- [ ] 主頁正常載入
- [ ] Ask 頁面功能正常
- [ ] Backpack 頁面顯示正確
- [ ] AI 處理功能正常
- [ ] 檔案上傳功能正常
- [ ] 儲存功能正常
- [ ] 主題切換正常
- [ ] 響應式設計正常

### 性能檢查
- [ ] 頁面載入時間 < 3 秒
- [ ] AI 響應時間 < 5 秒
- [ ] 移動端體驗良好
- [ ] 錯誤處理正常

---

## 🎯 分享您的項目

### 項目展示
1. **GitHub README**: 詳細的功能介紹和使用指南
2. **Live Demo**: 部署後的實際運行網站
3. **Screenshots**: 主要功能截圖
4. **Video Demo**: 功能演示影片

### 社群分享
- **Reddit**: r/webdev, r/nextjs, r/opensource
- **Twitter**: 使用相關 hashtag (#NextJS, #AI, #EdTech)
- **LinkedIn**: 專業網路分享
- **Dev.to**: 技術文章分享

---

## 🔒 安全注意事項

### API 金鑰保護
- ✅ 不要將 API 金鑰提交到 Git
- ✅ 使用環境變數管理敏感資訊
- ✅ 定期輪換 API 金鑰
- ✅ 限制 API 金鑰權限

### 數據安全
- ✅ 啟用 Supabase RLS
- ✅ 驗證用戶輸入
- ✅ 實施速率限制
- ✅ 監控異常活動

---

## 🎉 部署完成！

恭喜！您的 AI 學習輔助系統已經成功部署。

### 下一步建議
1. **監控性能**: 使用 Vercel Analytics 或類似工具
2. **收集反饋**: 邀請用戶測試並提供反饋
3. **持續改進**: 根據使用數據優化功能
4. **擴展功能**: 添加新功能和新 Agent 系統

**讓每個學生都感覺自己是天才！** 🚀
