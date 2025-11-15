# ⚠️ 預覽設置 - 必須完成的步驟

## 🚨 當前阻塞問題

### 1. **資料庫遷移未執行** ❌
**錯誤**: `column profiles.coins does not exist`

**必須執行的 SQL** (在 Supabase Dashboard):
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

### 2. **需要啟用 Mock 用戶** ⏳
**步驟**:
1. 訪問: http://127.0.0.1:3000/dev-tools
2. 點擊 "Enable" 按鈕
3. 頁面自動重新載入

**Mock 用戶 ID**: `e770f9cd-52a7-43de-b983-70f6f78d2f53`

---

## ✅ 已完成的設置

- ✅ Next.js 開發伺服器 (http://127.0.0.1:3000)
- ✅ Rust WebSocket 伺服器 (ws://0.0.0.0:8080/ws/battle)
- ✅ Mock 用戶功能已實現
- ✅ alert-dialog UI 組件已創建
- ✅ Seed Questions API 端點已創建 (`/api/play/questions/seed`)
- ✅ Rust 編譯錯誤已修復

---

## 🎮 PVE 訓練模式流程

### 當前實現
1. **前端**: 用戶點擊"個人訓練模式" → 選擇學科/時間 → 發送 WebSocket 消息
   - 文件: `apps/web/components/play/PVETrainingModal.tsx`
   - 消息類型: `START_MATCH` with `match_type: "PVE_TRAINING"`

2. **Rust 伺服器**: 接收訊息 → 調用 Next.js API 獲取題目
   - 文件: `services/battle-ws/src/ws_handler.rs` (`handle_pve_match`)
   - API 調用: `POST /api/play/questions/seed`

3. **Next.js API**: 從 Supabase `seed_questions` 表獲取題目
   - 文件: `apps/web/app/api/play/questions/seed/route.ts`
   - 隨機選擇 10 題，返回給 Rust

4. **Rust 伺服器**: 創建對戰 → 啟動 AI 對手 → 發送 `LobbyConfirming` 消息

5. **前端**: 接收消息 → 進入對戰畫面
   - 文件: `apps/web/app/(app)/play/page.tsx`
   - 組件: `BattleQuestionV2.tsx`

### AI 對手能力
- **文件**: `services/battle-ws/src/ai_answer_planner.rs`
- **特點**:
  - 基於 DDA (Dynamic Difficulty Adjustment) 算法
  - 會根據玩家表現調整難度
  - 模擬真實答題延遲 (200ms - 5000ms)
  - 有連勝/連敗判斷邏輯

---

## 📋 預覽步驟 (完成遷移後)

### 步驟 1: 執行資料庫遷移
在 Supabase Dashboard 執行上面的 SQL

### 步驟 2: 啟用 Mock 用戶
訪問 http://127.0.0.1:3000/dev-tools 並啟用

### 步驟 3: 測試 PVE 訓練模式
1. 訪問: http://127.0.0.1:3000/play
2. 點擊「系統對戰」
3. 選擇「個人訓練模式」
4. 選擇學科（可選）和作答時間
5. 點擊「開始訓練」

### 預期結果
- ✅ 進入對戰大廳（倒數計時）
- ✅ 開始對戰（顯示題目）
- ✅ AI 對手自動答題
- ✅ 分數實時更新
- ✅ 對戰結束後顯示結果

---

## 🐛 已知問題

### 1. BackpackContent.tsx 語法錯誤
**錯誤**: `Unexpected token div`
**狀態**: 不影響 Play 系統預覽

### 2. analytics_events 表不存在
**錯誤**: `Could not find the table 'public.analytics_events'`
**狀態**: 不影響核心功能，僅分析數據未記錄

---

## 📊 環境變數檢查

### Rust 伺服器 (services/battle-ws/.env)
```bash
NEXTJS_API_URL=http://localhost:3000  # ✅ 正確
INTERNAL_API_KEY=dev-internal-api-key-1762922305  # ✅ 正確
RUST_LOG=info  # ✅ 正確
```

### Next.js (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://umzqjgxsetsmwzhniemw.supabase.co  # ✅ 正確
NEXT_PUBLIC_BATTLE_WS_URL=ws://localhost:8080/ws/battle  # ✅ 正確
```

---

## 🎯 立即行動清單

- [ ] **執行資料庫遷移** (最重要！)
- [ ] **啟用 Mock 用戶**
- [ ] **測試 PVE 訓練模式**

完成這兩步後，PVE 訓練模式即可正常運作！

---

**最後更新**: 2025-11-14 09:24 (UTC+8)
