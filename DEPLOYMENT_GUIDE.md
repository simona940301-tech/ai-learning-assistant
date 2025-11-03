# 🚀 部署指南

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
