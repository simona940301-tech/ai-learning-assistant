# 🚀 Fly.io 部署進度

## ✅ 已完成步驟

1. ✅ **安裝 Fly.io CLI**
   - CLI 已安裝在：`~/.fly/bin/flyctl`

2. ✅ **登入 Fly.io**
   - 帳號：simona940301@gmail.com
   - 狀態：已成功登入

3. ✅ **配置文件準備**
   - `fly.toml` - 已配置（區域：新加坡 sin）
   - `Dockerfile` - 已創建
   - `.dockerignore` - 已創建

## ✅ 步驟 1-2 已完成

### 應用已成功創建

- **應用名稱**：battle-ws
- **Hostname**：battle-ws.fly.dev
- **區域**：新加坡（sin）
- **Admin URL**：https://fly.io/apps/battle-ws
- **WebSocket URL**：wss://battle-ws.fly.dev/ws/battle

### 環境變數已設置

- ✅ `NEXTJS_API_URL` = `https://plms-learning.vercel.app`
- ✅ `INTERNAL_API_KEY` = `8dbdfedbd7eb8cfff5ebf2f35c48f100bdf6fec6e819ecdff7b5c0a3e3db3ab8`
- ✅ `BATTLE_EVENTS_API_URL` = `https://plms-learning.vercel.app/api/play/battle/events`
- ✅ `RUST_LOG` = `info`

## 🚀 步驟 3 進行中

### 部署 WebSocket 服務器

部署正在背景執行中，正在構建 Docker 鏡像...

### 需要您的 Next.js 應用 URL

在設置環境變數之前，我需要知道：
1. **您的 Next.js 應用在 Vercel 上的 URL**
   - 例如：`https://your-app.vercel.app`
   - 或：`https://your-custom-domain.com`

2. **API Key 已生成**
   - 已生成：`8dbdfedbd7eb8cfff5ebf2f35c48f100bdf6fec6e819ecdff7b5c0a3e3db3ab8`
   - 這個 key 需要同時設置在：
     - Fly.io secrets（WebSocket 服務器）
     - Vercel 環境變數（Next.js API）

## 📋 待執行步驟

### 步驟 1: 初始化應用（添加付款方式後）

```bash
cd services/battle-ws
~/.fly/bin/flyctl launch --copy-config --no-deploy --name battle-ws --region sin --no-db --no-redis -y
```

### 步驟 2: 設置環境變數

**需要準備的值：**

1. **NEXTJS_API_URL**
   - 你的 Next.js 應用 URL（Vercel）
   - 範例：`https://your-app.vercel.app`

2. **INTERNAL_API_KEY**
   - 內部 API 認證密鑰（與 Next.js 共享）
   - 需要生成一個強隨機密鑰（至少 32 字符）

**執行命令：**
```bash
# 設置 Next.js API URL（替換為你的實際 URL）
~/.fly/bin/flyctl secrets set NEXTJS_API_URL=https://your-app.vercel.app

# 設置 API Key（替換為你的實際密鑰）
~/.fly/bin/flyctl secrets set INTERNAL_API_KEY=your-secret-api-key-here

# 可選：設置 Battle Events API URL（如果不同）
~/.fly/bin/flyctl secrets set BATTLE_EVENTS_API_URL=https://your-app.vercel.app/api/play/battle/events

# 可選：設置 Redis URL（如果使用）
~/.fly/bin/flyctl secrets set REDIS_URL=redis://your-redis-url:6379
```

### 步驟 3: 部署應用

```bash
~/.fly/bin/flyctl deploy
```

### 步驟 4: 獲取 WebSocket URL

```bash
~/.fly/bin/flyctl info
```

**輸出示例：**
```
Hostname: battle-ws.fly.dev
WebSocket URL: wss://battle-ws.fly.dev/ws/battle
```

### 步驟 5: 更新前端配置

在 Vercel Dashboard 設置環境變數：
```
NEXT_PUBLIC_BATTLE_WS_URL = wss://battle-ws.fly.dev/ws/battle
```

然後重新部署 Next.js 應用。

## 🔑 需要準備的信息

在繼續之前，請準備：

1. **Next.js 應用 URL**
   - 你的 Vercel 部署 URL
   - 例如：`https://your-app.vercel.app`

2. **API Key**
   - 生成一個強隨機密鑰
   - 可以使用：`openssl rand -hex 32`
   - 或使用在線工具生成

3. **確認付款方式已添加**
   - 訪問：https://fly.io/dashboard/simona940301-gmail-com/billing

## 📝 注意事項

- **區域選擇**：已設置為新加坡（`sin`），最接近香港
- **資源配置**：256MB RAM，共享 CPU（免費額度）
- **環境變數**：使用 `flyctl secrets` 設置，不會暴露在代碼中
- **WebSocket URL**：部署後會自動分配 `wss://battle-ws.fly.dev`

## 🆘 如果遇到問題

1. **查看日誌**：`~/.fly/bin/flyctl logs`
2. **檢查狀態**：`~/.fly/bin/flyctl status`
3. **查看應用信息**：`~/.fly/bin/flyctl info`

---

**下一步：** 添加付款方式後，告訴我繼續執行步驟 1。

