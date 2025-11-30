# 用戶自創題目功能指南

## 📋 功能概述

用戶可以創建自己的題目並加入自訂對戰系統，讓社群成員互相學習和挑戰。

## 🎯 核心功能

### 1. **創建自訂題目**
- 用戶可以通過「內容貢獻與合約」→「創建自訂題目」創建題目
- 支援五大學科：國文、英文、數學、社會、自然
- 難度分級：1-5 級
- 可選提供「解題提示」幫助其他玩家學習

### 2. **題目審核機制**
- 題目提交後狀態為 `PENDING`（待審核）
- 管理員審核後可設為 `APPROVED`（已通過）或 `REJECTED`（已拒絕）
- 只有 `APPROVED` 的題目才能在對戰中使用

### 3. **我的自創題目管理**
- 查看所有自己創建的題目
- 按狀態篩選（全部/待審核/已通過/已拒絕）
- 查看題目詳情、使用次數、累計獎勵
- 可刪除 `PENDING` 狀態的題目

### 4. **加入自訂對戰**
- 創建房間時可選擇題目來源：
  - **系統題庫**：官方題目
  - **用戶自創題目**：社群貢獻的題目
  - **混合模式**：系統題目 + 用戶自創題目各 50%
- 開啟「啟用用戶自創題目」開關

## 🛠️ 技術架構

### API 路由

#### 提交題目
```
POST /api/play/ugc-questions/submit
```
**請求體:**
```json
{
  "questionText": "題目內容",
  "optionA": "選項 A",
  "optionB": "選項 B",
  "optionC": "選項 C",
  "optionD": "選項 D",
  "correctAnswer": "A",
  "userCreatedHint": "解題提示（可選）",
  "subject": "english",
  "difficulty": 3
}
```

#### 查詢自己的題目
```
GET /api/play/ugc-questions?status=PENDING&limit=50&offset=0
```

#### 更新題目
```
PATCH /api/play/ugc-questions/update
```
**請求體:**
```json
{
  "id": "question_id",
  "questionText": "更新後的題目",
  "userCreatedHint": "更新後的提示"
}
```

#### 刪除題目
```
DELETE /api/play/ugc-questions?id=question_id
```
**限制**: 只能刪除 `PENDING` 狀態的題目

#### 獲取已審核題目（對戰用）
```
GET /api/play/ugc-questions/approved?subject=english&limit=20
```

#### 獲取對戰題目（混合）
```
POST /api/play/questions/battle
```
**請求體:**
```json
{
  "subject": "english",
  "difficulty": 3,
  "numQuestions": 10,
  "questionSource": "MIXED",
  "enableUserCreatedQuestions": true
}
```

### 數據庫架構

#### ugc_questions 表
```sql
CREATE TABLE ugc_questions (
  id UUID PRIMARY KEY,
  designer_id UUID REFERENCES profiles(id),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  deceiver_option TEXT, -- 用戶自創提示
  subject TEXT NOT NULL,
  difficulty INTEGER DEFAULT 3,
  review_status TEXT DEFAULT 'PENDING', -- PENDING/APPROVED/REJECTED
  usage_count INTEGER DEFAULT 0,
  total_rewards DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 輔助函數

#### 增加使用計數
```sql
SELECT increment_ugc_usage_count(ARRAY['question_id_1', 'question_id_2']);
```

#### 批量審核題目
```sql
-- 批准題目
SELECT approve_ugc_questions(ARRAY['question_id_1', 'question_id_2']);

-- 拒絕題目
SELECT reject_ugc_questions(ARRAY['question_id_1', 'question_id_2']);
```

#### 發放獎勵
```sql
SELECT reward_ugc_creator('question_id', 10.00);
```

## 📱 前端組件

### UGCSubmissionForm
創建自訂題目的表單組件
- 路徑: `apps/web/components/play/UGCSubmissionForm.tsx`
- 功能: 提交題目、驗證欄位、顯示成功狀態

### MyQuestionsModal
管理自創題目的組件
- 路徑: `apps/web/components/play/MyQuestionsModal.tsx`
- 功能: 列表顯示、狀態篩選、查看詳情、刪除題目

### CustomBattleModal
自訂對戰設定組件（已更新）
- 路徑: `apps/web/components/play/CustomBattleModal.tsx`
- 新增: 題目來源選擇、用戶自創題目開關

### UGCContractModal
內容貢獻入口組件（已更新）
- 路徑: `apps/web/components/play/UGCContractModal.tsx`
- 新增: 「我的自創題目」入口

## 🧪 測試流程

### 運行測試腳本
```bash
# 啟動開發伺服器
pnpm --filter web dev

# 在另一個終端運行測試
npx tsx test-ugc-flow.ts
```

### 手動測試步驟

1. **創建題目**
   - 進入「內容貢獻與合約」
   - 點擊「創建自訂題目」
   - 填寫題目資訊並提交

2. **查看題目**
   - 點擊「我的自創題目」
   - 查看待審核的題目

3. **審核題目（管理員）**
   ```sql
   UPDATE ugc_questions
   SET review_status = 'APPROVED'
   WHERE id = 'your_question_id';
   ```

4. **在對戰中使用**
   - 創建自訂對戰房間
   - 選擇「用戶自創題目」或「混合模式」
   - 開啟「啟用用戶自創題目」開關

5. **驗證題目出現**
   - 進入對戰
   - 確認看到用戶自創題目（標記 `is_ugc: true`）

## 🔒 安全性考慮

### Row Level Security (RLS)
- ✅ 用戶只能查看自己的 `PENDING` 題目
- ✅ 所有人都可以查看 `APPROVED` 題目
- ✅ 只能刪除自己的 `PENDING` 題目
- ✅ API 使用 Supabase Auth 驗證身份

### 驗證機制
- ✅ 題目文本、選項、正確答案必填
- ✅ 學科必須為五大學科之一
- ✅ 難度必須在 1-5 之間
- ✅ 正確答案必須為 A/B/C/D

## 🎁 獎勵機制

### 使用計數獎勵
- 每當題目在對戰中被使用，`usage_count` 增加
- 可設定每次使用發放獎勵（需實作）
- 獎勵累計在 `total_rewards` 欄位

### 審核通過獎勵（可選實作）
```sql
SELECT reward_ugc_creator('question_id', 100.00);
```

## 📊 數據分析

### 查詢熱門題目
```sql
SELECT
  id,
  question_text,
  subject,
  usage_count,
  total_rewards
FROM ugc_questions
WHERE review_status = 'APPROVED'
ORDER BY usage_count DESC
LIMIT 10;
```

### 查詢貢獻者排行
```sql
SELECT
  p.id,
  p.name,
  COUNT(uq.id) as question_count,
  SUM(uq.total_rewards) as total_earnings
FROM profiles p
JOIN ugc_questions uq ON p.id = uq.designer_id
WHERE uq.review_status = 'APPROVED'
GROUP BY p.id, p.name
ORDER BY question_count DESC
LIMIT 10;
```

## 🚀 未來擴展

### 計劃功能
- [ ] 題目評分系統（用戶可對題目評分）
- [ ] 題目檢舉機制
- [ ] 自動審核（AI 輔助）
- [ ] 題目編輯歷史
- [ ] 題目標籤系統
- [ ] 題目分享與收藏
- [ ] 批量導入題目
- [ ] 題目統計分析面板

### 優化方向
- [ ] 使用 Redis 快取熱門題目
- [ ] 題目推薦算法（基於難度、學科、正確率）
- [ ] 題目品質評估（基於使用數據）
- [ ] 自動檢測重複題目

## 📝 更新日誌

### v1.0.0 (2025-01-XX)
- ✅ 用戶自創題目提交功能
- ✅ 題目管理頁面（查看、刪除）
- ✅ 自訂對戰整合
- ✅ 審核機制
- ✅ 使用計數追蹤
- ✅ 完整 API 實作

---

**注意**: 此功能需要數據庫 migration 和 Supabase RLS 配置。請確保已執行所有相關 SQL 腳本。
