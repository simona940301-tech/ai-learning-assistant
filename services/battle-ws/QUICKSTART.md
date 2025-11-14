# Battle WebSocket 服務器啟動指南

## 🚀 快速啟動（無 Redis）

### 步驟 1: 啟動 Rust WebSocket 服務器

```bash
cd services/battle-ws
cargo run
```

**預期輸出**：
```
[WARN] Failed to initialize Redis pool: ... Matchmaking will use fallback logic.
[INFO] Battle WebSocket server starting on ws://0.0.0.0:8080/ws/battle
```

**注意**：Redis 警告是正常的，服務器會使用 fallback 匹配邏輯。

---

## 🔧 可選：啟動 Redis（用於生產環境）

### macOS (Homebrew)
```bash
# 安裝 Redis
brew install redis

# 啟動 Redis
brew services start redis

# 驗證 Redis 運行
redis-cli ping
# 應返回: PONG
```

### Linux
```bash
# 安裝 Redis
sudo apt-get install redis-server  # Ubuntu/Debian
# 或
sudo yum install redis            # CentOS/RHEL

# 啟動 Redis
sudo systemctl start redis

# 驗證 Redis 運行
redis-cli ping
```

### Docker
```bash
docker run -d -p 6379:6379 redis:latest
```

---

## ✅ 驗證服務器運行

### 1. 檢查端口監聽
```bash
lsof -i :8080
# 應顯示 LISTEN 狀態
```

### 2. 檢查進程
```bash
ps aux | grep battle-ws
# 應顯示運行中的進程
```

### 3. 測試 WebSocket 連接
在瀏覽器控制台執行：
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/battle');
ws.onopen = () => console.log('✅ 連接成功');
ws.onerror = (e) => console.error('❌ 連接失敗', e);
```

---

## 🐛 故障排除

### 問題 1: 端口被占用

**錯誤信息**：
```
Error: Os { code: 48, kind: AddrInUse, message: "Address already in use" }
```

**解決方案**：
```bash
# 查找占用 8080 端口的進程
lsof -ti:8080

# 終止進程（替換 PID 為實際進程 ID）
kill -9 <PID>

# 或使用一行命令
lsof -ti:8080 | xargs kill -9
```

### 問題 2: Redis 連接失敗

**錯誤信息**：
```
ERROR battle_ws::redis_pool: Failed to initialize Redis pool
```

**解決方案**：
- **選項 A**：忽略警告（推薦用於開發測試）
  - 服務器會自動使用 fallback 匹配邏輯
  - 功能正常，只是匹配效率較低

- **選項 B**：啟動 Redis（推薦用於生產環境）
  ```bash
  # macOS
  brew services start redis
  
  # Linux
  sudo systemctl start redis
  
  # Docker
  docker run -d -p 6379:6379 redis:latest
  ```

### 問題 3: 編譯錯誤

**解決方案**：
```bash
# 清理並重新編譯
cd services/battle-ws
cargo clean
cargo build

# 或直接運行（會自動編譯）
cargo run
```

---

## 📝 環境變數（可選）

創建 `.env` 文件（在 `services/battle-ws/` 目錄下）：

```env
# Redis 連接 URL（可選）
REDIS_URL=redis://127.0.0.1:6379/

# 日誌級別（可選）
RUST_LOG=info
# 或更詳細的日誌
RUST_LOG=battle_ws=debug
```

---

## 🎯 下一步

服務器啟動成功後：

1. **啟動前端**：
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **執行端到端測試**：
   - 按照 `services/battle-ws/E2E_TEST_GUIDE.md` 進行測試
   - 訪問 `http://localhost:3000/play`

3. **觀察日誌**：
   - Rust 服務器終端會顯示所有 WebSocket 消息
   - 查找 `AI plan:` 日誌以驗證 DDA 參數

---

**現在可以重新啟動服務器了！** 🎉

