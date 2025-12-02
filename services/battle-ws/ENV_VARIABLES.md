# 🔐 環境變數管理文檔

## 📋 概述

本文檔說明 WebSocket 服務器所需的所有環境變數，以及如何在不同環境中設置。

## 🌍 環境變數列表

### 必需的環境變數

| 變數名 | 說明 | 默認值 | 範例 |
|--------|------|--------|------|
| `NEXTJS_API_URL` | Next.js API 基礎 URL | `http://localhost:3000` | `https://your-app.vercel.app` |
| `INTERNAL_API_KEY` | 內部 API 認證密鑰（與 Next.js 共享） | 無 | `your-secret-key-123` |

### 可選的環境變數

| 變數名 | 說明 | 默認值 | 範例 |
|--------|------|--------|------|
| `REDIS_URL` | Redis 連接 URL（用於匹配系統） | 無 | `redis://localhost:6379` |
| `BATTLE_EVENTS_API_URL` | Battle Events API 完整 URL | `{NEXTJS_API_URL}/api/play/battle/events` | `https://your-app.vercel.app/api/play/battle/events` |
| `BATTLE_EVENTS_API_KEY` | Battle Events API 認證密鑰 | 無 | `your-battle-events-key` |
| `NEXTJS_INTERNAL_API_KEY` | 備用 API Key 變數名（與 `INTERNAL_API_KEY` 相同） | 無 | `your-secret-key-123` |
| `RUST_LOG` | Rust 日誌級別 | `info` | `debug`, `info`, `warn`, `error` |

## 🔧 設置方法

### 本地開發環境

創建 `.env` 文件在 `services/battle-ws/` 目錄：

```bash
# services/battle-ws/.env

# Next.js API（本地開發）
NEXTJS_API_URL=http://localhost:3000

# API Key（與 Next.js .env.local 中的相同）
INTERNAL_API_KEY=dev-secret-key-change-in-production

# Redis（可選，如果本地運行 Redis）
REDIS_URL=redis://localhost:6379

# 日誌級別（開發時使用 debug）
RUST_LOG=debug
```

### Fly.io 生產環境

使用 Fly.io CLI 設置 secrets：

```bash
cd services/battle-ws

# 設置必需的環境變數
flyctl secrets set NEXTJS_API_URL=https://your-app.vercel.app
flyctl secrets set INTERNAL_API_KEY=your-production-secret-key

# 設置可選的環境變數
flyctl secrets set REDIS_URL=redis://your-redis-url:6379
flyctl secrets set BATTLE_EVENTS_API_URL=https://your-app.vercel.app/api/play/battle/events
flyctl secrets set RUST_LOG=info
```

### 查看已設置的環境變數

```bash
# Fly.io
flyctl secrets list

# 本地（查看 .env 文件）
cat services/battle-ws/.env
```

## 🔄 環境變數使用位置

### 1. Next.js API URL (`NEXTJS_API_URL`)

**使用位置：**
- `src/pve_api_client.rs` - 獲取 PVE 題目
- `src/onboarding_api_client.rs` - 獲取 onboarding 題目
- `src/progression_api_client.rs` - 獲取用戶進度

**代碼示例：**
```rust
let api_url = env::var("NEXTJS_API_URL")
    .unwrap_or_else(|_| "http://localhost:3000".to_string());
```

### 2. Internal API Key (`INTERNAL_API_KEY`)

**使用位置：**
- 所有對 Next.js API 的請求

**代碼示例：**
```rust
let api_key = env::var("INTERNAL_API_KEY")
    .or_else(|_| env::var("NEXTJS_INTERNAL_API_KEY"))
    .ok();
```

### 3. Redis URL (`REDIS_URL`)

**使用位置：**
- `src/main.rs` - 初始化 Redis 連接池
- `src/redis_pool.rs` - Redis 連接管理

**代碼示例：**
```rust
let redis_url = env::var("REDIS_URL").ok();
init_redis_pool(redis_url.as_deref()).await;
```

### 4. Battle Events API (`BATTLE_EVENTS_API_URL`, `BATTLE_EVENTS_API_KEY`)

**使用位置：**
- `src/battle_event_sender.rs` - 發送戰鬥事件

**代碼示例：**
```rust
let api_url = env::var("BATTLE_EVENTS_API_URL")
    .unwrap_or_else(|_| "http://localhost:3000/api/play/battle/events".to_string());
let api_key = env::var("BATTLE_EVENTS_API_KEY").ok();
```

## 🔐 安全建議

### 1. 不要提交敏感信息到 Git

```bash
# .gitignore 應該包含
.env
.env.local
.env.*.local
```

### 2. 使用不同的 API Key

- **開發環境**：使用簡單的 key（如 `dev-secret-key`）
- **生產環境**：使用強隨機 key（至少 32 字符）

### 3. 定期輪換 API Key

建議每 3-6 個月更換一次生產環境的 API Key。

### 4. 限制 API Key 權限

在 Next.js API 中驗證 API Key，確保只有 WebSocket 服務器可以調用。

## 📝 環境變數檢查清單

部署前確認：

- [ ] `NEXTJS_API_URL` 設置為生產環境 URL
- [ ] `INTERNAL_API_KEY` 設置且與 Next.js 配置一致
- [ ] `BATTLE_EVENTS_API_URL` 設置（或使用默認值）
- [ ] `REDIS_URL` 設置（如果使用 Redis）
- [ ] `RUST_LOG` 設置為 `info`（生產環境）
- [ ] 所有敏感信息使用 secrets 管理，未提交到 Git

## 🐛 常見問題

### Q: 環境變數未生效？

**A:** 檢查：
1. 變數名拼寫是否正確（區分大小寫）
2. 是否重新啟動了服務器
3. 是否在正確的環境中設置（本地 vs 生產）

### Q: API Key 驗證失敗？

**A:** 確認：
1. WebSocket 服務器的 `INTERNAL_API_KEY` 與 Next.js API 的 `INTERNAL_API_KEY` 相同
2. 沒有多餘的空格或換行符
3. 使用正確的環境變數名稱

### Q: Redis 連接失敗？

**A:** 檢查：
1. `REDIS_URL` 格式是否正確：`redis://host:port` 或 `rediss://host:port`（SSL）
2. Redis 服務器是否運行
3. 網絡連接是否正常

---

**最後更新：** 2025-01-XX



























