# Rust WebSocket 服務器 - 完整設置指南

## 📋 目錄結構

```
services/battle-ws/
├── Cargo.toml          # 項目配置和依賴
├── src/
│   └── main.rs         # WebSocket 服務器主程序
├── README.md           # 完整技術文檔
└── QUICKSTART.md       # 快速開始指南
```

## 🚀 快速開始

### 步驟 1: 安裝 Rust

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 驗證安裝
rustc --version
cargo --version
```

### 步驟 2: 編譯並運行服務器

```bash
cd services/battle-ws
cargo run
```

**預期輸出：**
```
[INFO] Battle WebSocket server starting on ws://0.0.0.0:8080/ws/battle
```

### 步驟 3: 設置前端環境變數

在 `apps/web/.env.local` 添加：
```env
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws/battle
```

### 步驟 4: 測試連接

1. 啟動 Next.js：`cd apps/web && pnpm dev`
2. 訪問 `http://localhost:3000/play`
3. 打開瀏覽器控制台
4. 應該看到：`[PlayProvider] WebSocket connected`

## 📡 消息協議

### 客戶端 → 服務器

```json
// 1. 認證
{ "type": "AUTH", "userId": "user_123" }

// 2. 開始匹配
{ "type": "START_MATCH", "match_type": "RANKED", "subject": "math" }

// 3. 提交答案
{ 
  "type": "SUBMIT_ANSWER", 
  "match_id": "match_123", 
  "question_index": 0, 
  "answer": "A" 
}
```

### 服務器 → 客戶端

```json
// 1. 匹配成功
{
  "type": "MATCH_FOUND",
  "match_id": "match_123",
  "question_list": [
    {
      "id": "q1",
      "question_text": "題目內容",
      "options": ["選項 A", "選項 B", "選項 C", "選項 D"],
      "correct_answer": "A",
      "difficulty": 3,
      "time_limit": 10
    }
  ]
}

// 2. 答題結果
{
  "type": "ANSWER_RESULT",
  "player1_score": 5,
  "player2_score": 3
}

// 3. 錯誤
{
  "type": "ERROR",
  "message": "錯誤信息"
}
```

## 🔧 開發命令

```bash
# 編譯（不運行）
cargo build

# 運行（開發模式）
cargo run

# 運行（發布模式，優化）
cargo run --release

# 檢查代碼（不編譯）
cargo check

# 格式化代碼
cargo fmt

# 運行測試
cargo test
```

## 🐛 故障排除

### 問題 1: 端口被占用

```bash
# macOS/Linux
lsof -ti:8080 | xargs kill -9

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### 問題 2: 編譯錯誤

```bash
# 更新 Rust
rustup update

# 清理並重新編譯
cargo clean
cargo build
```

### 問題 3: 連接失敗

1. **檢查服務器是否運行**
   ```bash
   # 應該看到進程
   ps aux | grep battle-ws
   ```

2. **檢查端口是否監聽**
   ```bash
   # macOS/Linux
   lsof -i :8080
   
   # 應該看到 LISTEN 狀態
   ```

3. **檢查環境變數**
   - 確認 `NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws/battle`
   - 重啟 Next.js 開發服務器

4. **檢查瀏覽器控制台**
   - 查看 WebSocket 連接錯誤信息
   - 檢查網絡請求是否被阻止

### 問題 4: 消息格式錯誤

- 確認 JSON 格式正確
- 確認消息類型匹配（AUTH, START_MATCH, SUBMIT_ANSWER）
- 查看服務器日誌了解詳細錯誤

## 📊 性能目標

- **連接延遲**: < 50ms
- **消息處理**: < 10ms
- **並發連接**: 支持數千個同時連接
- **內存使用**: 優化中

## 🔒 安全考慮

當前版本（MVP）：
- ✅ 基本錯誤處理
- ✅ 消息格式驗證
- ⏳ 認證機制（待完善）
- ⏳ Rate Limiting（待實作）
- ⏳ 防作弊機制（待實作）

## 📝 下一步開發

1. **集成數據庫**
   - 連接 Supabase/PostgreSQL
   - 實作真實的匹配邏輯
   - 存儲對戰記錄

2. **實作匹配算法**
   - ELO 評分系統
   - 技能匹配
   - 等待時間優化

3. **題目生成**
   - 調用 AI 題庫生成 API
   - 知識點分析
   - 難度動態調整

4. **完善對戰流程**
   - 題目倒計時管理
   - 實時分數同步
   - 對戰結束處理

## 📚 相關資源

- [Tokio 文檔](https://tokio.rs/)
- [tokio-tungstenite 文檔](https://docs.rs/tokio-tungstenite/)
- [Rust WebSocket 指南](https://rust-lang.github.io/async-book/)

---

**現在可以開始測試 WebSocket 連接了！** 🎉
