# 🚀 自動部署設定指南

## ✅ 已完成的配置

1. **Vercel 自動部署已啟用**
   - Vercel 已連接 GitHub 倉庫
   - 每次 push 到 `chore/cleanup-tutor-safe` 分支會自動觸發部署

2. **部署腳本已創建**
   - `scripts/auto-deploy.sh` - 一鍵自動部署腳本

---

## 🎯 使用方式

### 方法 1：使用自動部署腳本（推薦）

```bash
# 修改檔案後執行
./scripts/auto-deploy.sh "你的提交訊息"

# 範例
./scripts/auto-deploy.sh "fix: E6 router detection"
./scripts/auto-deploy.sh "feat: add new input validation"
```

**功能：**
- ✅ 自動添加所有變更
- ✅ 自動提交
- ✅ 自動推送到遠端
- ✅ 觸發 Vercel 自動部署

---

### 方法 2：手動 Git 流程（也會自動部署）

```bash
# 1. 修改檔案
# 2. 添加變更
git add .

# 3. 提交
git commit -m "你的提交訊息"

# 4. 推送（會自動觸發 Vercel 部署）
git push origin chore/cleanup-tutor-safe
```

**說明：**
- 只要 push 到 GitHub，Vercel 會自動偵測並開始部署
- 無需額外操作

---

### 方法 3：安裝 Git Hook（完全自動化）

```bash
# 安裝 post-commit hook（每次 commit 後自動推送）
cp scripts/git-hook-post-commit.sh .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

**安裝後：**
```bash
# 修改檔案
# 添加並提交
git add .
git commit -m "你的提交訊息"
# → 自動推送到遠端 → 自動觸發 Vercel 部署
```

**注意：**
- Hook 會自動推送，可能不適合需要 review 的工作流程
- 如需暫停，可移除 hook：`rm .git/hooks/post-commit`

---

## 📊 查看部署狀態

### 1. Vercel Dashboard
前往：https://vercel.com/dashboard

查看：
- 🟢 **Building** - 正在建置
- 🟢 **Ready** - 部署完成
- 🔴 **Error** - 建置失敗

### 2. GitHub Actions（如果有設置）
前往：https://github.com/simona940301-tech/ai-learning-assistant/actions

### 3. 預覽連結
部署完成後，Vercel 會提供預覽連結：
- 格式：`https://your-project-abc123.vercel.app`
- 可在 Dashboard 或 GitHub PR 評論中找到

---

## ⚙️ 配置確認

### Vercel Dashboard 設定（必須）

確保以下設定正確：

```
Framework Preset: Next.js
Root Directory: ./
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter web build
Output Directory: apps/web/.next
Node.js Version: 20.x
```

### Git 設定確認

```bash
# 檢查遠端倉庫
git remote -v

# 檢查當前分支
git branch --show-current

# 應該顯示：
# origin  https://github.com/simona940301-tech/ai-learning-assistant.git
# 分支: chore/cleanup-tutor-safe
```

---

## 🔄 自動部署流程

```
你修改檔案
    ↓
執行 ./scripts/auto-deploy.sh 或 git push
    ↓
GitHub 接收 push
    ↓
Vercel 自動偵測變更
    ↓
自動開始建置 (2-3 分鐘)
    ↓
部署完成 → 預覽連結可用
```

---

## 💡 最佳實踐

### 1. 提交訊息規範

```bash
# 功能新增
feat: add E6 paragraph organization support

# Bug 修復
fix: correct router detection logic

# 文件更新
docs: update deployment guide

# 重構
refactor: simplify template generation

# 樣式調整
style: update input dock styling
```

### 2. 頻繁部署

- ✅ 小修改可以頻繁部署
- ✅ Vercel 會自動建立預覽環境
- ✅ 每個部署都有獨立的 URL

### 3. 測試流程

```bash
# 1. 本地測試
pnpm --filter web dev

# 2. 本地建置測試
pnpm --filter web build

# 3. 確認無誤後部署
./scripts/auto-deploy.sh "你的提交訊息"
```

---

## ❓ 常見問題

### Q1: 推送後沒有自動部署？

**檢查：**
1. Vercel Dashboard → Settings → Git → 確認已連接 GitHub
2. 確認推送到正確的分支
3. 檢查 Vercel Dashboard 是否有部署記錄

### Q2: 建置失敗怎麼辦？

**查看日誌：**
1. Vercel Dashboard → 點擊失敗的部署
2. 查看 Build Logs
3. 根據錯誤訊息修復

### Q3: 如何取消自動部署？

**暫時停止：**
```bash
# 移除 post-commit hook（如果安裝了）
rm .git/hooks/post-commit

# 或使用 --no-verify 跳過 hook
git commit --no-verify -m "你的訊息"
```

---

## 📝 快速參考

```bash
# 一鍵部署（推薦）
./scripts/auto-deploy.sh "你的提交訊息"

# 手動部署
git add .
git commit -m "你的提交訊息"
git push origin chore/cleanup-tutor-safe

# 查看部署狀態
vercel ls

# 查看預覽連結
vercel inspect
```

---

## 🎉 完成！

現在你可以：
1. 修改任何檔案
2. 執行 `./scripts/auto-deploy.sh "訊息"`
3. 等待 2-3 分鐘
4. 在 Vercel Dashboard 查看預覽連結

**自動部署已設置完成！** 🚀

