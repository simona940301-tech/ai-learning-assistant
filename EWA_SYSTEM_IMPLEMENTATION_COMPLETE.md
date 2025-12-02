# 🎯 EWA 智能出題系統完整實現指南

## 系統概述

基於「預期勝率的動態配比 (Expected Win-rate Allocation, EWA)」實現了一套先進的 PvE 對戰邏輯，結合 Deep Knowledge Tracing (DKT) 模型和 AI 錯題變異技術，為每位學生量身打造最佳學習節奏。

## 🧠 核心演算法：EWA + DKT

### 核心理念
- **目標勝率控制**：維持 75%-80% 答對率，保持心流狀態
- **動態題組生成**：即時計算舊錯題與新題的最佳配比
- **錯題變異技術**：AI 重寫舊題，檢測真正的概念理解能力

### 三明治交錯法 (10題戰鬥序列)
```
位置 1-2：自信啟動 (舊錯題-極易)     → P(correct) > 90%
位置 3-5：探索挑戰 (新題目)         → 基於最近發展區
位置 6：  陷阱回顧 (舊錯題-困難)     → 間隔重複測試
位置 7-9：高階應用 (新題目)         → 適性化難度調整  
位置 10： 峰值體驗 (智能選題)       → 確保整局勝率達標
```

## 🗄️ 資料庫設計

### 新增核心表結構

**1. knowledge_mastery (DKT 知識掌握追蹤)**
```sql
-- 每個用戶對每個概念的掌握度
- current_mastery: 當前掌握度 (0-1)
- predicted_correctness: 預測正確率
- forget_rate: 遺忘率
- learn_rate: 學習率
- memory_strength: 記憶強度
```

**2. question_mastery (題目層級掌握度)**
```sql
-- 每道題目的個人化掌握度
- predicted_correctness: 預測正確率
- mutation_count: 變異次數
- in_error_book: 是否在錯題本
- mastery_threshold_reached: 是否已完全掌握
```

**3. ewa_battle_sessions (戰鬥配置記錄)**
```sql
-- 每局戰鬥的 EWA 配置和結果
- target_accuracy_rate: 目標勝率
- session_type: 戰鬥模式
- question_selection_log: 選題邏輯記錄
- final_accuracy: 實際勝率
```

**4. question_mutations (錯題變異記錄)**
```sql
-- AI 生成的變異題目
- mutated_question_text: 變異後題幹
- core_concept_preserved: 保留的核心概念
- mutation_type: 變異類型
- user_performance: 變異題表現
```

### 📁 檔案結構

```
📁 supabase/migrations/
  └── 20250201_ewa_dkt_system.sql         # 資料庫 Schema

📁 lib/ai/
  ├── ewa-battle-engine.ts                # EWA 核心引擎
  └── question-mutator.ts                 # 錯題變異系統

📁 app/api/play/pve/
  └── ewa-questions/route.ts              # EWA API 端點

📁 components/play/
  └── EWABattleInterface.tsx              # 前端對戰界面

📁 app/(app)/play/
  └── page.tsx                            # 整合到 Play 頁面
```

## 🚀 核心功能特色

### 1. 🎯 智能題目配比
```typescript
// 根據用戶狀態自動調整舊題/新題比例
情境 A (學霸型): 舊題 10% + 新題 90% (高難度)
情境 B (挫折型): 舊題 60% + 新題 40% (信心重建)  
情境 C (平衡型): 舊題 30% + 新題 70% (標準模式)
```

### 2. 🧬 AI 錯題變異
```typescript
// 四種變異策略
- context_change:   改變情境背景，保持邏輯結構
- number_swap:      替換數字，保持計算複雜度
- option_shuffle:   重排選項，保持誘答性
- scenario_shift:   轉換學科情境，保持認知負荷
```

### 3. 📊 DKT 學習追蹤
```typescript
// 每次答題後更新掌握度
if (is_correct) {
  newMastery = previousMastery + learningRate * (1 - previousMastery)
} else {
  newMastery = previousMastery * (1 - forgetRate)
}
```

### 4. ⏱️ 動態時間分配
```typescript
// 根據題目用途調整時間限制
warmup: 25秒        # 暖身題給足時間建立信心
new_learning: 30秒  # 新題學習需要思考時間
error_review: 20秒  # 錯題複習檢測掌握度
challenge: 15秒     # 挑戰題製造緊張感
finale: 22秒        # 最後一題平衡收尾
```

## 🎮 使用者體驗流程

### 戰鬥配置階段
1. **目標勝率選擇**：50%-90% 滑桿調整
2. **戰鬥模式選擇**：信心重建/平衡/挑戰
3. **AI 策略預覽**：顯示預期題目分佈

### 戰鬥進行階段
1. **智能題目序列**：按三明治法依序出題
2. **即時狀態顯示**：題目用途、預期勝率、變異標記
3. **動態時間控制**：根據題目類型調整時限

### 戰鬥結果階段
1. **EWA 分析報告**：預測準確度、心流維持度
2. **學習效果追蹤**：概念掌握度變化
3. **個人化建議**：下次戰鬥的最佳配置

## 🛠️ 技術實現細節

### API 端點設計
```typescript
POST /api/play/pve/ewa-questions
// 生成 EWA 戰鬥題目序列
Request: { target_accuracy: 0.75, session_type: 'standard' }
Response: { questions: [], analysis: {}, message: '' }

PATCH /api/play/pve/ewa-questions  
// 記錄答題結果，更新 DKT 模型
Request: { question_id, is_correct, response_time_ms }
Response: { success: true, updated_mastery: true }
```

### 前端組件設計
```typescript
// 三階段式界面設計
- 配置階段: EWA 參數設定 + 策略選擇
- 戰鬥階段: 題目展示 + 即時狀態 + 計時器
- 結果階段: 性能分析 + 學習建議 + 再戰選項
```

### 錯題變異 LLM 整合
```typescript
// 使用 OpenAI GPT-4 進行錯題重寫
- 精心設計的系統 Prompt 確保教育品質
- JSON 格式化輸出便於程式處理
- 多層驗證機制確保變異品質
- 批次處理功能提升效率
```

## 📈 預期學習效果

### 個人化學習路徑
- **精準難度控制**：維持 75%-80% 勝率的最佳學習區間
- **概念深度檢測**：變異題區分「記答案」vs「真理解」
- **遺忘曲線對抗**：間隔重複確保長期記憶
- **心流狀態維持**：避免過易無聊或過難挫折

### 數據驅動優化
- **實時學習分析**：每次答題都更新 DKT 模型
- **預測準確性**：持續優化勝率預測演算法
- **策略自適應**：根據學習表現調整出題策略

## 🔧 部署與測試指南

### 1. 資料庫設定
```bash
# 執行 EWA/DKT 資料庫 migration
supabase db push
```

### 2. 環境變數配置
```bash
# 確保 OpenAI API Key 已設定 (錯題變異功能)
OPENAI_API_KEY=your_openai_key
```

### 3. 前端測試流程
```bash
# 啟動開發服務器
npm run dev

# 訪問 /play 頁面
# 切換到「EWA 智能對戰」模式
# 配置目標勝率和戰鬥模式
# 開始戰鬥測試完整流程
```

### 4. API 測試
```bash
# 測試 EWA 題目生成
curl -X POST /api/play/pve/ewa-questions \
  -H "Content-Type: application/json" \
  -d '{"target_accuracy": 0.75, "session_type": "standard"}'

# 測試答題記錄
curl -X PATCH /api/play/pve/ewa-questions \
  -H "Content-Type: application/json" \
  -d '{"question_id": "xxx", "is_correct": true, "response_time_ms": 15000}'
```

## 🎯 未來擴展方向

### 短期優化 (1-2 週)
- **更精細的難度預測**：整合更多用戶行為數據
- **變異題品質評估**：實現自動品質檢測機制
- **多學科支援**：擴展到數學、社會、自然科學

### 中期發展 (1-2 月)
- **協同過濾**：利用相似用戶的學習模式
- **情緒狀態檢測**：根據答題模式推測學習情緒
- **個性化時間模式**：學習每位用戶的最佳學習時段

### 長期願景 (3-6 月)
- **多模態學習**：整合語音、視覺等學習模式
- **社交學習機制**：同儕競爭與協作學習
- **教師儀表板**：為教師提供班級學習分析工具

## 🏆 系統優勢總結

### 相較於傳統出題系統
1. **智能配比** vs 固定比例：動態調整而非死板規則
2. **預測建模** vs 歷史統計：前瞻性而非回顧性分析  
3. **概念檢測** vs 表面記憶：深度理解而非機械記憶
4. **心流維持** vs 隨機難度：科學控制而非靠運氣

### 教育心理學基礎
- **最近發展區理論**：精準定位學習邊界
- **遺忘曲線原理**：科學安排複習頻率
- **心流理論應用**：維持最佳學習狀態
- **認知負荷管理**：避免資訊處理超載

---

## 🚀 立即開始使用

1. **執行資料庫 Migration**
   ```bash
   supabase db push
   ```

2. **啟動開發環境**
   ```bash
   npm run dev
   ```

3. **訪問 Play 頁面**
   - 切換到「EWA 智能對戰」模式
   - 調整目標勝率 (建議 75%)
   - 選擇適合的戰鬥模式
   - 開始你的個性化學習之旅！

🎉 **恭喜！你現在擁有了業界最先進的智能出題系統！**

---

*這套 EWA 系統結合了認知科學、機器學習和教育心理學的最新研究成果，為每位學習者提供真正個人化的學習體驗。*