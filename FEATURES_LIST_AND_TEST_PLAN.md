# 📋 功能清單與測試計劃

> **目標**: 列出所有實作的功能並提供測試方法

---

## 🎯 核心功能清單

### 1. 🎮 對戰系統 (Battle System)

#### 1.1 PVE 對戰模式
- **功能**: 玩家 vs AI 對戰
- **位置**: `apps/web/app/(app)/play/page.tsx`
- **組件**: `SystemBattleModal`, `PVETrainingModal`
- **API**: 
  - `/api/play/pve/questions` (POST)
  - `/api/play/questions/seed` (POST)
  - `/api/play/battle/events` (POST)
- **WebSocket**: `wss://battle-ws.fly.dev/ws/battle`
- **狀態**: ✅ 已實作（包含 async recursion loop 修復）

#### 1.2 PVP 對戰模式
- **功能**: 玩家 vs 玩家對戰
- **位置**: `apps/web/app/(app)/play/page.tsx`
- **組件**: `CustomBattleModal`
- **API**: `/api/play/matchmaking/`
- **狀態**: ✅ 已實作

#### 1.3 UGC 合約對戰
- **功能**: 使用用戶自創題目的對戰
- **位置**: `apps/web/app/(app)/play/page.tsx`
- **組件**: `UGCContractModal`
- **API**: `/api/play/ugc-questions/`
- **狀態**: ✅ 已實作

#### 1.4 對戰結果與進度
- **功能**: 顯示對戰結果、進度更新、獎勵發放
- **組件**: `BattleResultModal`, `GamifiedMatchResultModal`
- **API**: `/api/play/progression/apply-battle` (POST)
- **狀態**: ✅ 已實作

---

### 2. 📚 學習功能

#### 2.1 Ask 頁面（AI 問答）
- **功能**: AI 輔助學習、問題解答、重點整理
- **位置**: `apps/web/app/(app)/ask/page.tsx`
- **組件**: `AnySubjectSolver`, `ExplanationCard`, `ExplainCardV2`
- **API**: 
  - `/api/ai/route-solver` (POST)
  - `/api/ai/solve` (POST)
  - `/api/explain` (POST)
- **狀態**: ✅ 已實作

#### 2.2 Backpack（學習筆記）
- **功能**: 保存學習內容、檔案管理、筆記整理
- **位置**: `apps/web/app/(app)/backpack/page.tsx`
- **組件**: `BackpackContent`, `FileCard`, `AnswerCardV2`
- **API**: 
  - `/api/backpack/save` (POST)
  - `/api/backpack/upload` (POST)
  - `/api/backpack/route.ts` (GET)
- **狀態**: ✅ 已實作

#### 2.3 Error Book（錯題本）
- **功能**: 錯題收集、複習、統計
- **位置**: `apps/web/app/(app)/error-book/page.tsx`
- **API**: `/api/error-book` (GET/POST)
- **狀態**: ✅ 已實作

#### 2.4 Solve 系統（解題詳解）
- **功能**: 題目詳解、知識點分析、解題策略
- **組件**: `ExplainCardV2`, `ExplainCard`
- **API**: `/api/solve` (POST)
- **狀態**: ✅ 已實作

---

### 3. 🎯 任務與進度系統

#### 3.1 每日任務（Today Task）
- **功能**: 每日學習任務、進度追蹤
- **組件**: `TodayTaskCard`
- **API**: `/api/missions/` (GET/POST)
- **狀態**: ✅ 已實作

#### 3.2 進度系統（Progression）
- **功能**: XP、等級、金幣、連續天數
- **API**: 
  - `/api/play/progression/status` (GET)
  - `/api/play/progression/apply-battle` (POST)
  - `/api/play/progression/chests` (GET)
- **狀態**: ✅ 已實作

#### 3.3 排行榜（Leaderboard）
- **功能**: 玩家排名、ELO 分數
- **API**: `/api/play/progression/leaderboard` (GET)
- **狀態**: ✅ 已實作

---

### 4. 🐣 Chick 系統（AI 伴侶）

#### 4.1 Chick 互動
- **功能**: AI 伴侶對話、狀態管理、情緒系統
- **API**: 
  - `/api/chick/messages` (GET)
  - `/api/chick/interact` (POST)
  - `/api/chick/status` (GET)
- **狀態**: ✅ 已實作

#### 4.2 Chick 學習動作
- **功能**: 記錄學習行為、觸發 Chick 反應
- **API**: `/api/chick/action` (POST)
- **狀態**: ✅ 已實作

---

### 5. 👤 用戶系統

#### 5.1 個人資料（Profile）
- **功能**: 用戶資料、頭像、統計
- **位置**: `apps/web/app/(app)/profile/page.tsx`
- **API**: `/api/profile` (GET/POST)
- **狀態**: ✅ 已實作

#### 5.2 頭像系統（Avatar）
- **功能**: 頭像生成、上傳、分析
- **API**: 
  - `/api/avatar/generate` (POST)
  - `/api/avatar/analyze` (POST)
  - `/api/profile/upload-avatar` (POST)
- **狀態**: ✅ 已實作

#### 5.3 登入/註冊
- **功能**: 用戶認證、Session 管理
- **位置**: `apps/web/app/(auth)/login/page.tsx`
- **API**: `/api/auth/login-hook` (POST)
- **狀態**: ✅ 已實作

---

### 6. 🏪 商店系統（Store）

#### 6.1 題包商店
- **功能**: 題包瀏覽、安裝、管理
- **位置**: `apps/web/app/(app)/store/page.tsx`
- **API**: 
  - `/api/packs` (GET)
  - `/api/packs/install` (POST)
  - `/api/packs/installed` (GET)
- **狀態**: ✅ 已實作

---

### 7. 🎓 入門引導（Onboarding）

#### 7.1 新用戶引導
- **功能**: 目標設定、能力評估、任務介紹
- **位置**: `apps/web/app/onboarding/`
- **API**: `/api/onboarding/` (POST)
- **狀態**: ✅ 已實作

---

### 8. 🌐 社群功能（Community）

#### 8.1 社群貼文
- **功能**: 發文、瀏覽、互動
- **位置**: `apps/web/app/(app)/community/page.tsx`
- **API**: `/api/community/posts` (GET/POST)
- **狀態**: ✅ 已實作

---

## 🧪 測試計劃

### 階段 1: 環境準備（5 分鐘）

#### 1.1 啟動開發服務器
```bash
# 啟動 Next.js 開發服務器
cd /Users/simonac/Desktop/moonshot-idea
pnpm dev:web
```

**檢查項目**:
- [ ] 服務器成功啟動（http://localhost:3000）
- [ ] 無編譯錯誤
- [ ] 無類型錯誤

#### 1.2 檢查環境變數
```bash
# 檢查 .env.local 檔案
cat apps/web/.env.local | grep -E "NEXT_PUBLIC|SUPABASE|OPENAI"
```

**需要確認的環境變數**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_BATTLE_WS_URL` (可選，本地測試可用 localhost)

---

### 階段 2: 核心功能測試（30 分鐘）

#### 2.1 對戰系統測試 ⭐ 重點

**測試步驟**:
1. 登入系統
2. 進入 Play 頁面 (`/play`)
3. 測試 PVE 對戰：
   - 點擊「系統對戰」
   - 選擇學科（English/Math）
   - 啟動對戰
   - 確認 WebSocket 連接成功
   - 答題並確認分數更新
   - 完成對戰並確認結果顯示

**檢查項目**:
- [ ] Play 頁面正常載入
- [ ] 可以選擇對戰模式
- [ ] WebSocket 連接成功（檢查瀏覽器 Console）
- [ ] 題目正常顯示
- [ ] 答題後分數更新
- [ ] AI 答題流程正常（async recursion loop 修復）
- [ ] 對戰結束後結果正確顯示
- [ ] 進度系統正常更新（XP、金幣）

**預期結果**:
- ✅ 所有對戰模式可以正常啟動
- ✅ WebSocket 連接穩定
- ✅ 分數計算正確
- ✅ 無 async recursion loop 錯誤

---

#### 2.2 Ask 頁面測試

**測試步驟**:
1. 進入 Ask 頁面 (`/ask`)
2. 輸入問題（例如：數學題目）
3. 選擇學科
4. 提交問題
5. 確認 AI 回應正常
6. 測試保存到 Backpack

**檢查項目**:
- [ ] 頁面正常載入
- [ ] 可以輸入問題
- [ ] AI 回應正常（無錯誤）
- [ ] 詳解顯示正確
- [ ] 可以保存到 Backpack
- [ ] 檔案上傳功能正常（如果有）

**預期結果**:
- ✅ AI 回應時間 < 10 秒
- ✅ 詳解格式正確
- ✅ 保存功能正常

---

#### 2.3 Backpack 測試

**測試步驟**:
1. 進入 Backpack 頁面 (`/backpack`)
2. 查看已保存的內容
3. 測試新增筆記
4. 測試檔案上傳
5. 測試刪除功能

**檢查項目**:
- [ ] 頁面正常載入
- [ ] 可以查看已保存的內容
- [ ] 可以新增筆記
- [ ] 檔案上傳功能正常
- [ ] 刪除功能正常

**預期結果**:
- ✅ 所有 CRUD 操作正常
- ✅ 檔案上傳成功
- ✅ 無資料遺失

---

#### 2.4 Error Book 測試

**測試步驟**:
1. 進入 Error Book 頁面 (`/error-book`)
2. 查看錯題列表
3. 測試複習功能
4. 測試標記為已掌握

**檢查項目**:
- [ ] 頁面正常載入
- [ ] 錯題列表顯示正確
- [ ] 可以複習錯題
- [ ] 標記功能正常

**預期結果**:
- ✅ 錯題管理功能正常
- ✅ 複習流程順暢

---

### 階段 3: 次要功能測試（20 分鐘）

#### 3.1 Profile 頁面測試
- [ ] 頁面正常載入
- [ ] 可以查看個人資料
- [ ] 可以更新資料
- [ ] 頭像上傳功能正常

#### 3.2 Store 頁面測試
- [ ] 頁面正常載入
- [ ] 可以瀏覽題包
- [ ] 可以安裝題包
- [ ] 已安裝題包顯示正確

#### 3.3 Community 頁面測試
- [ ] 頁面正常載入
- [ ] 可以瀏覽貼文
- [ ] 可以發文（如果有權限）

#### 3.4 Chick 系統測試
- [ ] Chick 組件正常顯示
- [ ] 可以與 Chick 互動
- [ ] 狀態更新正常

---

### 階段 4: API 端點測試（15 分鐘）

#### 4.1 Battle API 測試

**測試命令**:
```bash
# 測試 PVE Questions API
curl -X POST http://localhost:3000/api/play/pve/questions \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","subject":"english","numQuestions":10}'

# 測試 Battle Events API
curl -X POST http://localhost:3000/api/play/battle/events \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "match_id": "test-match",
    "match_type": "PVE_TRAINING",
    "question_id_array": ["q1", "q2"],
    "is_correct_array": [true, false],
    "final_scores": {"player1": 100, "player2": 80}
  }'
```

**檢查項目**:
- [ ] API 返回正確的狀態碼（200）
- [ ] 返回資料格式正確
- [ ] 無 500 錯誤
- [ ] 認證機制正常（如果需要）

---

### 階段 5: WebSocket 測試（10 分鐘）

#### 5.1 本地 WebSocket 測試

**測試方法 1: 使用測試腳本**
```bash
cd /Users/simonac/Desktop/moonshot-idea
WS_URL=ws://localhost:8080/ws/battle npx tsx test-websocket-complete.ts
```

**測試方法 2: 瀏覽器 Console**
```javascript
// 在瀏覽器 Console 執行
const ws = new WebSocket('ws://localhost:8080/ws/battle')
ws.onopen = () => {
  console.log('✅ WebSocket 連接成功')
  ws.send(JSON.stringify({ type: 'AUTH', userId: 'test-user' }))
}
ws.onmessage = (e) => console.log('收到消息:', JSON.parse(e.data))
ws.onerror = (e) => console.error('❌ WebSocket 錯誤:', e)
```

**檢查項目**:
- [ ] WebSocket 連接成功
- [ ] 認證成功
- [ ] 可以發送消息
- [ ] 可以接收消息
- [ ] 無連接中斷

**注意**: 如果本地沒有運行 Battle-WS，可以測試連接到生產環境：
```javascript
const ws = new WebSocket('wss://battle-ws.fly.dev/ws/battle')
```

---

### 階段 6: 錯誤檢查（10 分鐘）

#### 6.1 瀏覽器 Console 檢查
- [ ] 打開瀏覽器開發者工具（F12）
- [ ] 檢查 Console 是否有錯誤
- [ ] 檢查 Network 標籤是否有失敗的請求
- [ ] 檢查是否有 404/500 錯誤

#### 6.2 服務器日誌檢查
- [ ] 檢查終端機的 Next.js 日誌
- [ ] 確認無嚴重錯誤
- [ ] 確認 API 請求正常

---

## 📊 測試檢查清單

### ✅ 必須通過的測試

#### 核心功能
- [ ] **對戰系統**: PVE 對戰可以正常啟動和完成
- [ ] **WebSocket**: 連接穩定，消息正常傳遞
- [ ] **Ask 頁面**: AI 回應正常
- [ ] **Backpack**: CRUD 操作正常

#### 關鍵修復
- [ ] **Async Recursion Loop**: 對戰流程無循環錯誤
- [ ] **API 端點**: 所有 Battle API 正常運作
- [ ] **環境變數**: 配置正確

### ⚠️ 建議測試的項目

- [ ] Error Book 功能
- [ ] Profile 頁面
- [ ] Store 頁面
- [ ] Community 頁面
- [ ] Chick 系統

---

## 🐛 常見問題排查

### 問題 1: WebSocket 連接失敗

**可能原因**:
- Battle-WS 服務未啟動（本地）
- 環境變數未設置
- 防火牆阻擋

**解決方法**:
```bash
# 檢查 Battle-WS 是否運行（本地）
cd services/battle-ws
cargo run

# 或使用生產環境 WebSocket URL
# 在 .env.local 設置：
NEXT_PUBLIC_BATTLE_WS_URL=wss://battle-ws.fly.dev/ws/battle
```

### 問題 2: API 返回 405 錯誤

**可能原因**:
- HTTP 方法不匹配（GET vs POST）
- API 路由未正確設置

**解決方法**:
- 檢查 API 路由檔案是否正確導出 `POST` 函數
- 確認請求使用正確的 HTTP 方法

### 問題 3: 類型錯誤

**可能原因**:
- TypeScript 類型定義不匹配
- 依賴版本不一致

**解決方法**:
```bash
# 重新安裝依賴
pnpm install

# 檢查類型
pnpm type-check
```

---

## 🎯 測試完成標準

### ✅ 可以提交的標準

1. **核心功能正常**:
   - ✅ 對戰系統可以正常使用
   - ✅ WebSocket 連接穩定
   - ✅ Ask 頁面 AI 回應正常
   - ✅ Backpack 功能正常

2. **無嚴重錯誤**:
   - ✅ 瀏覽器 Console 無錯誤
   - ✅ API 無 500 錯誤
   - ✅ 無類型錯誤（影響功能的）

3. **關鍵修復驗證**:
   - ✅ Async recursion loop 修復正常
   - ✅ Battle-WS 服務正常運行

### ⚠️ 需要修復的問題

如果發現以下問題，需要先修復：
- 🔴 對戰系統完全無法使用
- 🔴 WebSocket 連接持續失敗
- 🔴 API 大量 500 錯誤
- 🔴 頁面無法載入

---

## 📝 測試記錄模板

### 測試日期: _______________

#### 環境信息
- Node 版本: _______________
- pnpm 版本: _______________
- 瀏覽器: _______________

#### 測試結果

**對戰系統**:
- [ ] 通過
- [ ] 失敗（問題: _______________）

**WebSocket**:
- [ ] 通過
- [ ] 失敗（問題: _______________）

**Ask 頁面**:
- [ ] 通過
- [ ] 失敗（問題: _______________）

**Backpack**:
- [ ] 通過
- [ ] 失敗（問題: _______________）

**其他問題**:
_______________

---

**準備好開始測試了嗎？讓我們一步步來！** 🚀

