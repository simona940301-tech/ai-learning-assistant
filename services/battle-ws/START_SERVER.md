# Battle WebSocket 服務器啟動指南

## 🚀 快速啟動

### 方法 1: 直接運行（推薦用於開發）

```bash
cd services/battle-ws
cargo run
```

**預期輸出**：
```
[WARN] Failed to initialize Redis pool: ... Matchmaking will use fallback logic.
[INFO] Battle WebSocket server starting on ws://0.0.0.0:8080/ws/battle
```

**注意**：
- Redis 警告是正常的，可以忽略
- 服務器會持續運行，直到按 `Ctrl+C` 停止
- 保持這個終端窗口打開

---

### 方法 2: 後台運行（用於測試）

```bash
cd services/battle-ws
cargo run > /tmp/battle-ws.log 2>&1 &
echo $! > /tmp/battle-ws.pid
```

**檢查狀態**：
```bash
# 檢查進程
ps aux | grep battle-ws | grep -v grep

# 檢查端口
lsof -i :8080

# 查看日誌
tail -f /tmp/battle-ws.log
```

**停止服務器**：
```bash
kill $(cat /tmp/battle-ws.pid)
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
ps aux | grep battle-ws | grep -v grep
# 應顯示運行中的進程
```

### 3. 測試 WebSocket 連接（瀏覽器控制台）
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/battle');
ws.onopen = () => console.log('✅ 連接成功');
ws.onerror = (e) => console.error('❌ 連接失敗', e);
ws.onclose = (e) => console.log('關閉:', e.code, e.reason);
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
# 查找並終止占用端口的進程
lsof -ti:8080 | xargs kill -9

# 或手動查找
lsof -i :8080
kill -9 <PID>
```

### 問題 2: 編譯錯誤

**解決方案**：
```bash
cd services/battle-ws
cargo clean
cargo build
cargo run
```

### 問題 3: Redis 連接失敗

**這是正常的**！服務器會自動使用 fallback 邏輯，功能完全正常。

---

## 📝 下一步

服務器啟動成功後：

1. **啟動前端**（新終端）：
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **訪問測試頁面**：
   - 打開 `http://localhost:3000/play`
   - 開啟瀏覽器開發者工具（Console）

3. **執行端到端測試**：
   - 按照 `services/battle-ws/E2E_TEST_GUIDE.md` 進行測試

---

**現在請在新的終端窗口中運行 `cargo run`！** 🎉

