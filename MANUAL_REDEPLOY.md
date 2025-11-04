# 🚀 Vercel 手動重新部署指南

## ✅ 手動重新部署

可以手動重新部署，會使用**最新的 commit**（最新版本）。

---

## 方法 1: Vercel Dashboard（最簡單）

### 步驟：

1. **前往：** https://vercel.com/dashboard
2. **選擇專案：** `plms-learning`
3. **前往 Deployments 頁籤**
4. **找到最新的部署**（應該是你剛才推送的 commit）
5. **點擊 "..." 選單** → **"Redeploy"**
6. **選擇環境：**
   - Preview（預覽環境）
   - Production（生產環境）
7. **點擊 "Redeploy"**

### 優點：
- ✅ 簡單快速
- ✅ 不需要安裝 CLI
- ✅ 可以使用最新的 commit

---

## 方法 2: Vercel CLI（推薦）

### 安裝 Vercel CLI（如果還沒安裝）：

```bash
npm install -g vercel
```

### 登入：

```bash
vercel login
```

### 重新部署：

```bash
# 預覽環境
vercel

# 生產環境
vercel --prod
```

### 強制重新部署（使用最新設定）：

```bash
# 強制重新部署，忽略快取
vercel --prod --force
```

### 優點：
- ✅ 可以強制重新部署
- ✅ 可以使用最新設定
- ✅ 可以透過 `--force` 忽略快取

---

## 方法 3: 透過 Git 觸發（自動）

### 推送空的 commit：

```bash
git commit --allow-empty -m "chore: trigger redeployment"
git push origin chore/cleanup-tutor-safe
```

這會自動觸發 Vercel 部署。

---

## 🔍 確認使用最新版本

### 檢查 Commit：

```bash
# 查看最新的 commit
git log --oneline -1

# 應該看到：
# 0bf9eee fix: update vercel.json to override Production Overrides
```

### 檢查部署日誌：

在 Vercel Dashboard → Deployments → 點擊最新部署 → Build Logs：

**應該看到：**
```
Commit: 0bf9eee
Message: fix: update vercel.json to override Production Overrides
```

**如果看到不同的 commit，表示不是最新版本。**

---

## ⚠️ 重要：確保使用最新設定

手動重新部署時，Vercel 會：
1. ✅ 使用最新的 commit（最新代碼）
2. ✅ 使用最新的 `vercel.json`（最新設定）
3. ⚠️ **但可能仍使用舊的 Production Overrides**（如果 `vercel.json` 無法覆蓋）

### 確認方式：

檢查 Build Logs 中的指令：

**✅ 正確（使用 vercel.json）：**
```
Running: cd ../.. && pnpm install --frozen-lockfile
Running: cd ../.. && pnpm --filter web build
```

**❌ 錯誤（使用 Production Overrides）：**
```
Running: pnpm install
Running: pnpm build
```

---

## 🎯 推薦操作

### 立即手動重新部署：

1. **前往 Vercel Dashboard**
2. **找到最新的部署**（commit `0bf9eee`）
3. **點擊 "Redeploy"**
4. **選擇 Preview 環境**
5. **檢查 Build Logs** 確認使用正確的指令

### 如果 Build Logs 顯示使用 Production Overrides：

聯繫 Vercel 支援移除 Production Overrides，或使用 Vercel CLI：

```bash
vercel --prod --force
```

---

## 📋 手動重新部署檢查清單

- [ ] 確認已推送最新 commit（`0bf9eee`）
- [ ] 確認 `vercel.json` 已更新
- [ ] 手動觸發重新部署
- [ ] 檢查 Build Logs 確認使用正確指令
- [ ] 確認部署成功

---

## 💡 快速指令

```bash
# 查看最新 commit
git log --oneline -1

# 如果需要在本地重新部署
vercel --prod --force

# 或透過空 commit 觸發
git commit --allow-empty -m "trigger redeploy"
git push origin chore/cleanup-tutor-safe
```


