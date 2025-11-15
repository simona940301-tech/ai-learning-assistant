# 🚀 開發預覽指南 (已更新)

## ✅ 預覽環境已就緒

**開發伺服器**: http://127.0.0.1:3000

---

## 🔑 自動登入設置

### ✅ Mock 用戶已永久啟用

在開發環境（`NODE_ENV=development`）中，你的 UUID 會**自動登入**，無需任何手動操作！

**Mock 用戶 ID**: `e770f9cd-52a7-43de-b983-70f6f78d2f53`

**技術實現**:
- 文件: [apps/web/lib/auth-context.tsx](apps/web/lib/auth-context.tsx:24)
- 邏輯: 開發環境自動返回 Mock 用戶，跳過 Supabase 認證
- 日誌: 瀏覽器 Console 會顯示 `🔧 Development mode: Auto-login as...`

---

## 📋 主要預覽頁面

### Preview Hub（總覽）
http://127.0.0.1:3000/preview

- 查看所有 Batch 1.5 功能開關
- 快速訪問所有主要頁面
- API 端點診斷面板

### Play / 對戰系統
http://127.0.0.1:3000/play

**功能**:
- ✅ Elo 排名系統（預設 1000）
- ✅ Daily Energy 體力管理（8 點體力）
- ✅ 個人訓練模式 (PVE)
  - 從 Supabase `seed_questions` 表抽取題目
  - AI 對手使用 DDA 算法自動答題
  - 實時分數更新和對手狀態
- ✅ 匹配系統（知識點輪播）
- ✅ DDA 難度視覺化
- ✅ 對戰結果頁面（獎勵動畫）
- ✅ 知識曲線熱力圖

**注意**: 完整對戰功能需要啟動 Rust WebSocket 伺服器（已啟動）

### 其他頁面
- **Backpack**: http://127.0.0.1:3000/backpack
- **Ask**: http://127.0.0.1:3000/ask
- **Community**: http://127.0.0.1:3000/community
- **Store**: http://127.0.0.1:3000/store
- **Profile**: http://127.0.0.1:3000/profile

### Dev Tools（開發工具）
http://127.0.0.1:3000/dev-tools

- 查看 Mock 用戶狀態（永久啟用）
- 快速導航連結
- 環境變數資訊

---

## ⚠️ 必須完成：資料庫遷移

**唯一阻塞問題**: `coins` 欄位未創建

在 Supabase Dashboard 執行：

```sql
-- 添加 coins 欄位
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_coins ON profiles(coins);

COMMENT ON COLUMN profiles.coins IS 'User wallet balance (coins for rewards)';
```

**Supabase 專案**: https://umzqjgxsetsmwzhniemw.supabase.co  
**SQL 檔案**: `supabase/migrations/20250127_add_coins_field.sql`

---

## 🎮 測試 PVE 訓練模式

### 步驟
1. 訪問: http://127.0.0.1:3000/play （自動登入）
2. 點擊「系統對戰」
3. 選擇「個人訓練模式」
4. 選擇學科（可選）和作答時間（20秒/30秒）
5. 點擊「開始訓練」

### 預期流程
1. **WebSocket 連接**: 前端發送 `START_MATCH` 消息
2. **題目獲取**: Rust 伺服器調用 `/api/play/questions/seed` 從 Supabase 抽取 10 題
3. **對戰開始**: 顯示倒數計時（大廳確認）
4. **AI 對手**: 使用 DDA 算法自動答題，模擬真實對手
5. **分數更新**: 實時顯示雙方分數和連勝狀態
6. **對戰結束**: 顯示結果、Elo 變化、金幣獎勵、知識曲線

---

## 🎯 AI 對手能力

**文件**: `services/battle-ws/src/ai_answer_planner.rs`

**特點**:
- **DDA 算法**: 根據玩家表現動態調整難度
- **真實延遲**: 200ms - 5000ms 答題時間
- **連勝判斷**: 會故意輸掉防止玩家連輸過多
- **掌握度追蹤**: 記錄每個知識點的掌握度

---

## 🔧 開發工具使用

### 查看 Mock 用戶狀態
訪問: http://127.0.0.1:3000/dev-tools

顯示：
- ✅ 開發環境永久啟用
- User ID: e770f9cd-52a7-43de-b983-70f6f78d2f53
- 💡 無需手動啟用提示

### 如何臨時停用（如需測試真實登入）
修改 [apps/web/lib/auth-context.tsx](apps/web/lib/auth-context.tsx:24)：
```typescript
const DEV_MODE = false // 改為 false 即可停用
```

---

## 🐛 常見問題

### Q: 顯示「請先登錄」？
A: 檢查瀏覽器 Console 是否有 `🔧 Development mode: Auto-login` 日誌。如果沒有，刷新頁面。

### Q: Play 頁面出現 `coins does not exist` 錯誤？
A: 執行資料庫遷移（見上方 SQL）

### Q: WebSocket 連接失敗？
A: 確認 Rust 伺服器正在運行：
```bash
lsof -i:8080  # 應該顯示 battle-ws 進程
```

### Q: 點擊「開始訓練」後沒反應？
A: 
1. 檢查 Browser Console 的 WebSocket 訊息
2. 檢查 Rust 伺服器日誌（`services/battle-ws` 終端）
3. 確認 `seed_questions` 表有資料

---

## 📊 環境變數

### Next.js (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://umzqjgxsetsmwzhniemw.supabase.co
NEXT_PUBLIC_BATTLE_WS_URL=ws://localhost:8080/ws/battle
NODE_ENV=development  # 自動啟用 Mock 用戶
```

### Rust (services/battle-ws/.env)
```bash
NEXTJS_API_URL=http://localhost:3000
INTERNAL_API_KEY=dev-internal-api-key-1762922305
RUST_LOG=info
```

---

## 📝 最近更新

- ✅ Mock 用戶永久啟用（無需手動操作）
- ✅ 新增 `/api/play/questions/seed` API
- ✅ Rust 編譯錯誤已修復
- ✅ Dev Tools 頁面更新

---

**最後更新**: 2025-11-14 09:30 (UTC+8)

**下一步**: 執行資料庫遷移後即可完整預覽！
