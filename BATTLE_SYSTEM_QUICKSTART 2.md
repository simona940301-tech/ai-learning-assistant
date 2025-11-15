# 系統對戰功能快速開始指南

## 🚀 快速啟動（3 步驟）

### 1️⃣ 啟動服務
```bash
# 啟動 Redis（如果尚未運行）
brew services start redis

# 啟動 battle-ws WebSocket 服務
cd services/battle-ws
RUST_LOG=info cargo run --release > battle-ws.log 2>&1 &

# 啟動 Next.js 開發服務器
cd /Users/simonac/Desktop/moonshot\ idea
pnpm --filter web dev
```

### 2️⃣ 訪問對戰頁面
打開瀏覽器訪問：http://localhost:3000/play

### 3️⃣ 開始 PVE 訓練
1. 點擊「系統對戰」卡片
2. 選擇「個人訓練模式」
3. 選擇學科和時間限制
4. 開始答題！

---

## 🧪 運行自動化測試

```bash
npx tsx test-battle-system.ts
```

測試會自動：
- 連接 WebSocket
- 啟動 PVE 模式
- 自動答題
- 顯示對戰結果

---

## 🔍 檢查服務狀態

```bash
# 檢查 Redis
redis-cli ping  # 應該返回 PONG

# 檢查 battle-ws
lsof -ti:8080  # 應該返回進程 ID

# 檢查 Next.js
lsof -ti:3000  # 應該返回進程 ID

# 查看 battle-ws 日誌
tail -f services/battle-ws/battle-ws.log
```

---

## 🛠️ 故障排除

### 問題：Port 已被佔用
```bash
# 清理 port 3000
lsof -ti:3000 | xargs kill -9

# 清理 port 8080
lsof -ti:8080 | xargs kill -9
```

### 問題：Redis 連接失敗
```bash
# 啟動 Redis
brew services start redis

# 檢查 Redis 狀態
brew services list | grep redis
```

### 問題：WebSocket 連接失敗
```bash
# 重啟 battle-ws
pkill -f battle-ws
cd services/battle-ws
RUST_LOG=info cargo run --release > battle-ws.log 2>&1 &
```

---

## 📖 進一步閱讀

- [完整測試報告](BATTLE_SYSTEM_TEST_REPORT.md)
- [題庫架構](apps/web/db/sql/018_seed_questions_schema.sql)
- [WebSocket 處理邏輯](services/battle-ws/src/ws_handler.rs)

---

## ⚡ 快速測試清單

- [ ] Redis 運行中？ (`redis-cli ping`)
- [ ] battle-ws 運行中？ (`lsof -ti:8080`)
- [ ] Next.js 運行中？ (`lsof -ti:3000`)
- [ ] WebSocket 連接正常？ (運行測試腳本)
- [ ] 可以訪問 /play 頁面？
- [ ] 可以開始 PVE 對戰？

全部 ✅ = 系統正常運作！
