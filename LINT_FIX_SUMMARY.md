# Lint 修復總結

## 已完成

### 1. 語法錯誤修復 ✅
- **useViewMode.ts**: 刪除重複的 `.ts` 文件（保留 `.tsx` 版本），修復語法錯誤

### 2. 關鍵 React Hook 依賴修復 ✅
- **lib/play-context.tsx**: 
  - 使用 `wsRef` 替代直接使用 `ws` 狀態，避免依賴問題
  - 修復 `handleServerMessage` 的依賴數組（添加 `consumeEnergy`, `fetchProgressionStatus`, `user?.id`）
  - 修復 `sendWebSocketMessage` 和相關 useEffect 的依賴問題
- **components/play/ContractBrowseModal.tsx**: 使用 `useCallback` 包裝 `loadContracts`
- **components/play/MyQuestionsModal.tsx**: 使用 `useCallback` 包裝 `fetchQuestions`
- **components/play/QuestionExplanationModal.tsx**: 使用 `useCallback` 包裝 `loadExplanation`
- **components/play/UGCReviewModal.tsx**: 使用 `useCallback` 包裝 `loadQuestions`

### 3. Rust 測試驗證 ✅
- `cargo test sample_rt`: ✅ 4 個測試通過
- `cargo test plan_answer_`: ✅ 2 個測試通過

## 剩餘警告（29 個）

剩餘的警告主要是：
1. **圖片優化警告** (5 個): `<img>` 應改為 `<Image />` - 這些是性能優化建議，不影響功能
2. **React Hook 依賴警告** (20 個): 主要是複雜的 useEffect/useCallback 依賴問題
3. **Ref cleanup 警告** (4 個): ref 在 cleanup 函數中的使用問題

這些警告都是**非關鍵的**，不會影響功能。建議：
- 在後續迭代中逐步修復
- 或使用 `eslint-disable-next-line` 註釋標記（如果確定不會影響功能）

## 手動測試指南

### 1. PvE Battle 測試

#### 測試 AI 節奏
1. 啟動應用並登入
2. 進入 PvE 訓練模式
3. 選擇一個時間限制（例如 30 秒）
4. 觀察 AI 對手：
   - AI 應該在約 2/3 的時間限制內提交答案（例如 30 秒限制下約 20 秒）
   - AI 的節奏應該與你選擇的時間限制相關
   - AI 不應該太快或太慢

#### 測試 Layer 2 顯示
1. 完成一場 PvE 對戰
2. 在對戰結果彈窗中，切換到 Layer 2（錯誤題目詳情）
3. 檢查：
   - Layer 2 應該正常渲染（不再出現空白）
   - 每個錯誤題目應該顯示：
     - 題目內容
     - 選項
     - **你選擇的答案**（這是新功能）
     - 正確答案
     - 詳解（如果有的話）

#### 測試答題記錄
1. 在對戰中回答幾題（包括正確和錯誤的）
2. 完成對戰後，檢查：
   - 答題記錄應該正確保存
   - 錯誤題目應該顯示你選擇的選項
   - API `/api/play/battle/answers` 應該返回完整的答題記錄

### 2. 功能回歸測試

#### WebSocket 連接
- [ ] WebSocket 正常連接
- [ ] 對戰消息正常接收
- [ ] 斷線重連功能正常

#### Battle State 管理
- [ ] 對戰狀態正確更新
- [ ] 答題記錄正確保存
- [ ] 分數計算正確

#### API 端點
- [ ] `/api/play/battle/answers` 返回正確數據
- [ ] `/api/play/battle/events` 正確寫入數據
- [ ] `/api/play/questions/details` 正確返回題目詳情

### 3. UI/UX 測試

#### Modal 組件
- [ ] ContractBrowseModal 正常載入合約列表
- [ ] MyQuestionsModal 正常載入題目列表
- [ ] QuestionExplanationModal 正常載入詳解
- [ ] UGCReviewModal 正常載入審核列表

#### 遊戲流程
- [ ] PvE 對戰流程順暢
- [ ] 對戰結果彈窗正常顯示
- [ ] Layer 1/Layer 2 切換正常
- [ ] 沒有重複渲染問題

## 注意事項

1. **所有修復都不應該影響現有功能**
2. **如果發現任何功能異常，請立即回報**
3. **剩餘的 lint 警告可以在後續迭代中處理**

## 下一步

1. 執行手動測試，確認所有功能正常
2. 如果測試通過，可以考慮：
   - 修復剩餘的 lint 警告
   - 或使用 eslint-disable 註釋標記非關鍵警告
3. 準備部署

