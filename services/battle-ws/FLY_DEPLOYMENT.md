# 🚀 Fly.io 部署指南

## 📋 前置需求

1. **安裝 Fly.io CLI**
   ```bash
   # macOS
   curl -L https://fly.io/install.sh | sh
   
   # 或使用 Homebrew
   brew install flyctl
   
   # 驗證安裝
   flyctl version
   ```

2. **登入 Fly.io**
   ```bash
   flyctl auth login
   ```

## 🔧 環境變數設置

### 必需的環境變數

在部署前，需要設置以下環境變數：

```bash
# Next.js API URL（生產環境）
NEXTJS_API_URL=https://your-nextjs-app.vercel.app

# API 認證密鑰（與 Next.js API 共享）
INTERNAL_API_KEY=your-secret-api-key-here

# Battle Events API URL（可選，默認使用 NEXTJS_API_URL + /api/play/battle/events）
BATTLE_EVENTS_API_URL=https://your-nextjs-app.vercel.app/api/play/battle/events

# Battle Events API Key（可選）
BATTLE_EVENTS_API_KEY=your-battle-events-api-key

# Redis URL（可選，如果使用 Redis 匹配系統）
REDIS_URL=redis://your-redis-url:6379
```

### 設置環境變數的方法

#### 方法 1: 使用 Fly.io CLI（推薦）

```bash
cd services/battle-ws

# 設置環境變數
flyctl secrets set NEXTJS_API_URL=https://your-nextjs-app.vercel.app
flyctl secrets set INTERNAL_API_KEY=your-secret-api-key-here
flyctl secrets set BATTLE_EVENTS_API_URL=https://your-nextjs-app.vercel.app/api/play/battle/events

# 如果使用 Redis
flyctl secrets set REDIS_URL=redis://your-redis-url:6379
```

#### 方法 2: 使用 fly.toml（不推薦，敏感信息會暴露）

不建議在 `fly.toml` 中設置敏感環境變數，因為會提交到 Git。

## 🚀 部署步驟

### 步驟 1: 初始化 Fly.io 應用（首次部署）

```bash
cd services/battle-ws

# 初始化（會創建 fly.toml，如果還沒有）
flyctl launch

# 選擇：
# - App name: battle-ws（或自定義名稱）
# - Region: hkg（香港）或其他地區
# - 不要部署數據庫（我們使用外部 Supabase）
```

### 步驟 2: 設置環境變數

```bash
# 設置所有必需的環境變數
flyctl secrets set NEXTJS_API_URL=https://your-nextjs-app.vercel.app
flyctl secrets set INTERNAL_API_KEY=your-secret-api-key-here
```

### 步驟 3: 部署應用

```bash
# 構建並部署
flyctl deploy

# 或使用 watch 模式（自動重新部署）
flyctl deploy --watch
```

### 步驟 4: 驗證部署

```bash
# 查看應用狀態
flyctl status

# 查看日誌
flyctl logs

# 查看環境變數（不顯示值）
flyctl secrets list
```

## 🌐 獲取 WebSocket URL

部署成功後，Fly.io 會自動分配一個域名：

```bash
# 查看應用信息
flyctl info

# 輸出示例：
# Hostname: battle-ws.fly.dev
# WebSocket URL: wss://battle-ws.fly.dev/ws/battle
```

**重要**：記下這個 URL，需要在 Next.js 前端配置中使用。

## 🔄 更新部署

```bash
# 重新部署（自動構建最新代碼）
flyctl deploy

# 重啟應用（不重新構建）
flyctl apps restart battle-ws

# 查看部署歷史
flyctl releases list
```

## 📊 監控和日誌

```bash
# 實時日誌
flyctl logs

# 查看特定時間範圍的日誌
flyctl logs --since 1h

# 查看應用指標（CPU、記憶體等）
flyctl status

# SSH 進入容器（調試用）
flyctl ssh console
```

## 🔧 故障排除

### 問題 1: 構建失敗

```bash
# 檢查 Dockerfile 是否正確
docker build -t battle-ws-test .

# 本地測試構建
docker run -p 8080:8080 battle-ws-test
```

### 問題 2: 連接失敗

1. **檢查環境變數**
   ```bash
   flyctl secrets list
   ```

2. **檢查日誌**
   ```bash
   flyctl logs
   ```

3. **檢查健康檢查**
   ```bash
   curl https://battle-ws.fly.dev/health
   ```

### 問題 3: WebSocket 連接被拒絕

1. **確認端口配置**
   - 檢查 `fly.toml` 中的 `internal_port = 8080`
   - 確認應用監聽 `0.0.0.0:8080`

2. **檢查防火牆**
   - Fly.io 自動處理，無需手動配置

## 💰 成本估算

- **免費額度**：3 個共享 CPU 機器，256MB RAM
- **超出後**：約 $5-10/月（取決於流量）

## 🔐 安全建議

1. **使用 secrets 管理敏感信息**
   ```bash
   flyctl secrets set INTERNAL_API_KEY=xxx
   ```

2. **啟用 HTTPS**
   - Fly.io 自動提供 HTTPS/WSS

3. **限制 API 訪問**
   - 使用 API Key 驗證
   - 設置 IP 白名單（如果需要）

## 📝 下一步

部署完成後，需要：

1. **更新前端配置**（見 `FRONTEND_CONFIG.md`）
2. **測試 WebSocket 連接**
3. **監控性能和錯誤**

---

**部署完成後，WebSocket URL 格式：**
```
wss://battle-ws.fly.dev/ws/battle
```

將此 URL 設置到 Next.js 的環境變數 `NEXT_PUBLIC_BATTLE_WS_URL` 中。













































