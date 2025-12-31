# Onboarding Questions 問題診斷報告

## 問題描述
Onboarding challenge 頁面無法載入真正的測驗題，而是使用 fallback 測試題。

## 根本原因分析

### 1. API 查詢邏輯 (`/api/onboarding/questions`)
- 查詢表：`onboarding_questions`
- 查詢條件：
  - `is_active = true`
  - `subject = 'english'` (默認)
  - `difficulty_level IN (1,2,3)` (根據用戶程度動態)
  - 限制：`count * 3` 題（但只返回 `count` 題）

### 2. Challenge 頁面邏輯
```typescript
// 第 187-192 行
const response = await fetch(
  `/api/onboarding/questions?difficulties=${uniqueDifficulties.join(',')}&count=7`
)
const data = await response.json()

if (data.success && data.questions && data.questions.length >= 7) {
  // 使用真正的題目
} else {
  // Fallback - 使用測試題
  setQuestions(generateFallbackQuestions())
}
```

### 3. 可能的原因

#### 原因 A: 數據庫表為空
- **症狀**：API 返回 `success: true`，但 `questions: []`
- **解決方案**：執行導入腳本

#### 原因 B: API 查詢失敗
- **症狀**：API 返回 `success: false` 或 500 錯誤
- **檢查點**：
  - 表是否存在
  - 字段名稱是否匹配
  - RLS 權限是否正確

#### 原因 C: 查詢條件不匹配
- **症狀**：表中有數據，但查詢結果為空
- **檢查點**：
  - `is_active` 是否為 `true`
  - `subject` 是否為 `'english'`
  - `difficulty_level` 是否在 1-3 範圍內

#### 原因 D: 數據格式不匹配
- **症狀**：有數據但無法正確解析
- **檢查點**：
  - 字段名稱是否正確：`question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`, `difficulty_level`
  - 數據類型是否正確

## 診斷步驟

### 步驟 1: 檢查數據庫表是否存在且有數據

在 Supabase SQL Editor 執行：

```sql
-- 檢查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'onboarding_questions'
);

-- 檢查表中有多少題目
SELECT 
  COUNT(*) as total_questions,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_questions,
  COUNT(CASE WHEN subject = 'english' THEN 1 END) as english_questions,
  COUNT(CASE WHEN is_active = true AND subject = 'english' THEN 1 END) as active_english_questions
FROM onboarding_questions;

-- 按難度分組檢查
SELECT 
  difficulty_level,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active = true AND subject = 'english' THEN 1 END) as active_count
FROM onboarding_questions
GROUP BY difficulty_level
ORDER BY difficulty_level;
```

### 步驟 2: 測試 API 端點

在瀏覽器控制台執行：

```javascript
// 測試基本查詢
fetch('/api/onboarding/questions?count=7')
  .then(res => res.json())
  .then(data => {
    console.log('API Response:', data);
    console.log('Questions count:', data.questions?.length || 0);
    if (data.questions && data.questions.length > 0) {
      console.log('First question:', data.questions[0]);
    }
  });

// 測試帶難度過濾的查詢
fetch('/api/onboarding/questions?difficulties=1,2,3&count=7')
  .then(res => res.json())
  .then(data => {
    console.log('API Response with difficulties:', data);
    console.log('Questions count:', data.questions?.length || 0);
  });
```

### 步驟 3: 檢查 API 日誌

在開發服務器終端查看是否有錯誤：
- `[OnboardingQuestionsAPI] Failed to fetch questions:`
- `[OnboardingQuestionsAPI] Error:`

### 步驟 4: 驗證導入狀態

檢查是否已執行導入：

```sql
-- 檢查最近導入的題目
SELECT 
  id,
  LEFT(question_text, 50) as question_preview,
  difficulty_level,
  subject,
  is_active,
  created_at
FROM onboarding_questions
ORDER BY created_at DESC
LIMIT 10;
```

## 解決方案

### 方案 1: 如果表為空，執行導入

**使用 API 導入（推薦）：**
```bash
# 需要管理員權限
curl -X POST http://localhost:3000/api/internal/onboarding-questions/import \
  -H "Cookie: your-session-cookie"
```

**或直接執行 SQL：**
執行 `apps/web/db/sql/021_onboarding_seed_questions.sql` 文件

### 方案 2: 如果表有數據但查詢失敗

檢查：
1. 字段名稱是否正確
2. RLS 權限設置
3. API 查詢邏輯是否正確

### 方案 3: 如果數據格式不匹配

檢查並修復數據格式：
- 確保所有必填字段都有值
- 確保 `difficulty_level` 在 1-3 範圍內
- 確保 `subject` 為 'english'
- 確保 `is_active` 為 `true`

## 預期結果

成功導入後應該有：
- 總題數：15 題
- 難度 1：5 題
- 難度 2：5 題  
- 難度 3：5 題
- 科目：全部為 'english'
- 狀態：全部為 `is_active = true`

