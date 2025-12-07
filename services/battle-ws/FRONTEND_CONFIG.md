# 🌐 前端配置說明

## ❓ 為什麼要更新前端配置？

### 當前狀況

**本地開發環境：**
- WebSocket 服務器運行在：`ws://localhost:8080`
- 前端連接：`ws://localhost:8080/ws/battle`
- ✅ 本地開發時可以正常使用

**部署到生產環境後：**
- WebSocket 服務器運行在：`wss://battle-ws.fly.dev`
- 前端仍然連接：`ws://localhost:8080/ws/battle` ❌
- ❌ **問題**：用戶的瀏覽器無法連接到 `localhost:8080`（因為服務器在雲端）

### 解決方案

需要告訴前端應用：**生產環境的 WebSocket 服務器在哪裡**

這就是為什麼需要更新前端配置的原因。

## 🔧 如何更新前端配置

### 步驟 1: 獲取 WebSocket URL

部署 Fly.io 後，獲取 WebSocket URL：

```bash
flyctl info
# 輸出：Hostname: battle-ws.fly.dev
# WebSocket URL: wss://battle-ws.fly.dev/ws/battle
```

### 步驟 2: 設置環境變數

在 **Next.js 項目**中設置環境變數：

#### 開發環境（`.env.local`）

```bash
# apps/web/.env.local

# 本地開發：連接到本地 WebSocket 服務器
NEXT_PUBLIC_BATTLE_WS_URL=ws://localhost:8080/ws/battle
```

#### 生產環境（Vercel 環境變數）

1. 登入 Vercel Dashboard
2. 選擇你的項目
3. 進入 **Settings** → **Environment Variables**
4. 添加：

```
NEXT_PUBLIC_BATTLE_WS_URL = wss://battle-ws.fly.dev/ws/battle
```

**重要：**
- 使用 `wss://`（WebSocket Secure），不是 `ws://`
- URL 必須包含完整路徑 `/ws/battle`

### 步驟 3: 前端代碼自動使用

前端代碼已經配置好，會自動讀取環境變數：

```typescript
// apps/web/lib/play-context.tsx
const WS_URL = process.env.NEXT_PUBLIC_BATTLE_WS_URL || 'ws://localhost:8080/ws/battle'
```

**工作原理：**
- 開發環境：讀取 `.env.local` → `ws://localhost:8080/ws/battle`
- 生產環境：讀取 Vercel 環境變數 → `wss://battle-ws.fly.dev/ws/battle`

## 📋 配置檢查清單

部署前確認：

- [ ] Fly.io WebSocket 服務器已部署
- [ ] 獲取了 WebSocket URL（`wss://battle-ws.fly.dev/ws/battle`）
- [ ] Vercel 環境變數已設置 `NEXT_PUBLIC_BATTLE_WS_URL`
- [ ] 本地 `.env.local` 配置正確（開發用）
- [ ] 重新部署 Next.js 應用（讓環境變數生效）

## 🔍 驗證配置

### 方法 1: 檢查瀏覽器控制台

1. 打開生產環境的 Web App
2. 打開瀏覽器開發者工具（F12）
3. 查看 Console，應該看到：
   ```
   [PlayProvider] 🔌 Connecting to WebSocket: wss://battle-ws.fly.dev/ws/battle
   [PlayProvider] ✅ WebSocket connected
   ```

### 方法 2: 檢查網絡請求

1. 打開瀏覽器開發者工具 → Network
2. 過濾：WS（WebSocket）
3. 應該看到連接到 `wss://battle-ws.fly.dev/ws/battle`
4. 狀態應該是 **101 Switching Protocols**（連接成功）

## 🐛 常見問題

### Q: 為什麼本地開發不需要更新？

**A:** 因為：
- 本地開發時，WebSocket 服務器也在本地運行
- 前端和服務器都在同一台機器上
- 使用 `localhost:8080` 可以正常連接

### Q: 生產環境為什麼要用 `wss://`？

**A:** 
- `ws://` = 未加密的 WebSocket（不安全）
- `wss://` = 加密的 WebSocket（HTTPS 的 WebSocket 版本）
- 瀏覽器要求 HTTPS 網站必須使用 `wss://`
- Fly.io 自動提供 HTTPS/WSS 支持

### Q: 環境變數設置後還是連不上？

**A:** 檢查：
1. **重新部署 Next.js**：環境變數更改後需要重新部署
2. **變數名正確**：必須是 `NEXT_PUBLIC_BATTLE_WS_URL`（注意 `NEXT_PUBLIC_` 前綴）
3. **URL 格式正確**：必須是 `wss://domain.com/ws/battle`（包含協議和路徑）
4. **Fly.io 服務器運行中**：`flyctl status` 確認服務器狀態

### Q: 可以同時支持開發和生產嗎？

**A:** 可以！這就是環境變數的作用：

- **開發環境**（`.env.local`）：
  ```
  NEXT_PUBLIC_BATTLE_WS_URL=ws://localhost:8080/ws/battle
  ```

- **生產環境**（Vercel）：
  ```
  NEXT_PUBLIC_BATTLE_WS_URL=wss://battle-ws.fly.dev/ws/battle
  ```

前端代碼會自動根據環境使用正確的 URL。

## 📝 總結

**為什麼要更新前端配置？**

因為：
1. ✅ 本地開發：前端連接本地服務器（`localhost:8080`）
2. ✅ 生產環境：前端需要連接雲端服務器（`wss://battle-ws.fly.dev`）
3. ✅ 環境變數讓同一套代碼可以在不同環境使用不同的配置

**更新步驟：**
1. 部署 Fly.io WebSocket 服務器
2. 獲取 WebSocket URL
3. 在 Vercel 設置環境變數
4. 重新部署 Next.js 應用

完成後，用戶就可以在生產環境使用線上對戰功能了！🎉











































