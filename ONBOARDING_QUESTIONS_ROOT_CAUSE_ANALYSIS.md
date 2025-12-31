# Onboarding Questions 根本原因分析

## 🔍 問題現象

用戶在 onboarding challenge 頁面看到的題目是：
```
這是第 1 道測試題。請選擇 A。
```

這表示系統使用了 **fallback 測試題**，而不是真正的 onboarding 測驗題。

## 📊 根本原因分析

### 1. 數據流程

```
Challenge 頁面
    ↓
調用 API: GET /api/onboarding/questions?difficulties=1,2,3&count=7
    ↓
查詢數據庫: onboarding_questions 表
    ↓
檢查條件: is_active=true AND subject='english' AND difficulty_level IN (1,2,3)
    ↓
返回結果: data.success && data.questions.length >= 7 ?
    ├─ 是 → 使用真正的題目
    └─ 否 → 使用 generateFallbackQuestions() ❌ (當前狀態)
```

### 2. 關鍵代碼位置

#### Challenge 頁面邏輯
**文件**: `apps/web/app/onboarding/challenge/page.tsx`

```typescript
// 第 187-230 行
const response = await fetch(
  `/api/onboarding/questions?difficulties=${uniqueDifficulties.join(',')}&count=7`
)
const data = await response.json()

if (data.success && data.questions && data.questions.length >= 7) {
  // ✅ 使用真正的題目
  setQuestions(fetchedQuestions)
} else {
  // ❌ 使用 fallback 測試題（當前狀態）
  setQuestions(generateFallbackQuestions())
}
```

#### Fallback 函數
**文件**: `apps/web/app/onboarding/challenge/page.tsx` 第 614 行

```typescript
function generateFallbackQuestions(): Question[] {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `fallback-${i + 1}`,
    questionText: `這是第 ${i + 1} 道測試題。請選擇 ${['A', 'B', 'C', 'D'][i % 4]}。`,
    options: ['選項 A', '選項 B', '選項 C', '選項 D'],
    correctAnswer: ['A', 'B', 'C', 'D'][i % 4] as 'A' | 'B' | 'C' | 'D',
    difficulty: Math.floor(i / 2) + 1,
    timeLimit: 15,
    explanation: `這是第 ${i + 1} 題的解析。`,
  }))
}
```

#### API 查詢邏輯
**文件**: `apps/web/app/api/onboarding/questions/route.ts`

```typescript
// 第 26-50 行
let query = supabase
  .from('onboarding_questions')
  .select('*')
  .eq('is_active', true)           // 必須是啟用狀態
  .eq('subject', 'english')        // 必須是英文科目
  .in('difficulty_level', difficulties)  // 難度必須在 1,2,3 中

const { data: questions, error } = await query
  .order('total_shown', { ascending: true })
  .limit(count * 3)  // 獲取 21 題，但只返回 7 題
```

### 3. 可能的根本原因

#### 原因 A: 數據庫表為空 ⭐ (最可能)

**症狀**: `onboarding_questions` 表中沒有數據

**驗證方法**:
```sql
SELECT COUNT(*) FROM onboarding_questions;
-- 如果返回 0，表示表為空
```

**解決方案**: 執行導入腳本
- 方法 1: 使用 API 導入（需要管理員權限）
  ```bash
  POST /api/internal/onboarding-questions/import
  ```
- 方法 2: 直接在 Supabase SQL Editor 執行
  ```sql
  -- 執行文件: apps/web/db/sql/021_onboarding_seed_questions.sql
  ```

#### 原因 B: 查詢條件不匹配

**症狀**: 表中有數據，但查詢結果為空

**檢查點**:
1. `is_active` 是否為 `true`？
2. `subject` 是否為 `'english'`？
3. `difficulty_level` 是否在 1-3 範圍內？

**驗證方法**:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active,
  COUNT(CASE WHEN subject = 'english' THEN 1 END) as english,
  COUNT(CASE WHEN is_active = true AND subject = 'english' AND difficulty_level BETWEEN 1 AND 3 THEN 1 END) as match_conditions
FROM onboarding_questions;
```

#### 原因 C: API 查詢失敗

**症狀**: API 返回 `success: false` 或 500 錯誤

**檢查點**:
- 表是否存在？
- RLS (Row Level Security) 權限是否正確？
- 字段名稱是否匹配？

**驗證方法**: 查看開發服務器日誌
```
[OnboardingQuestionsAPI] Failed to fetch questions: ...
[OnboardingQuestionsAPI] Error: ...
```

#### 原因 D: 數據格式不匹配

**症狀**: 有數據但無法正確解析

**檢查點**:
- 必填字段是否有值？
- 字段類型是否正確？
- 難度值是否在有效範圍內？

## 🔧 診斷步驟

### 步驟 1: 快速檢查（在瀏覽器控制台）

```javascript
// 測試 API 是否正常返回
fetch('/api/onboarding/questions?difficulties=1,2,3&count=7')
  .then(res => res.json())
  .then(data => {
    console.log('API 響應:', data);
    console.log('題目數量:', data.questions?.length || 0);
    if (data.questions && data.questions.length >= 7) {
      console.log('✅ 題目充足，應該使用真正題目');
    } else {
      console.error('❌ 題目不足，會使用 fallback');
    }
  });
```

### 步驟 2: 檢查數據庫（在 Supabase SQL Editor）

```sql
-- 1. 檢查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'onboarding_questions'
);

-- 2. 檢查題目數量
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active,
  COUNT(CASE WHEN subject = 'english' THEN 1 END) as english,
  COUNT(CASE WHEN is_active = true AND subject = 'english' AND difficulty_level BETWEEN 1 AND 3 THEN 1 END) as available
FROM onboarding_questions;

-- 3. 按難度分組
SELECT 
  difficulty_level,
  COUNT(*) as total,
  COUNT(CASE WHEN is_active = true AND subject = 'english' THEN 1 END) as available
FROM onboarding_questions
GROUP BY difficulty_level
ORDER BY difficulty_level;

-- 4. 查看實際數據
SELECT 
  id,
  LEFT(question_text, 50) as question_preview,
  difficulty_level,
  subject,
  is_active
FROM onboarding_questions
LIMIT 5;
```

### 步驟 3: 檢查 API 日誌

查看開發服務器終端的錯誤信息：
- `[OnboardingQuestionsAPI] Failed to fetch questions:`
- `[OnboardingQuestionsAPI] Error:`

## ✅ 解決方案

### 解決方案 1: 如果表為空，導入數據

#### 方法 A: 使用 API 導入（推薦）

1. **確保已登入為管理員**

2. **在瀏覽器控制台執行**:
```javascript
fetch('/api/internal/onboarding-questions/import', {
  method: 'POST',
  credentials: 'include',
})
  .then(res => res.json())
  .then(data => {
    console.log('導入結果:', data);
    if (data.success) {
      console.log(`✅ 成功導入 ${data.total} 道題目`);
      console.log('難度分布:', data.byDifficulty);
    } else {
      console.error('❌ 導入失敗:', data.error);
    }
  });
```

#### 方法 B: 直接執行 SQL

在 Supabase SQL Editor 執行：
```sql
-- 執行文件: apps/web/db/sql/021_onboarding_seed_questions.sql
-- 或直接複製該文件的內容執行
```

### 解決方案 2: 如果查詢條件不匹配，修正數據

```sql
-- 確保所有題目都是啟用狀態
UPDATE onboarding_questions 
SET is_active = true 
WHERE is_active IS NULL OR is_active = false;

-- 確保科目都是 english
UPDATE onboarding_questions 
SET subject = 'english' 
WHERE subject IS NULL OR subject != 'english';

-- 檢查並修正難度值（必須在 1-3 範圍內）
UPDATE onboarding_questions 
SET difficulty_level = 2 
WHERE difficulty_level < 1 OR difficulty_level > 3;
```

### 解決方案 3: 如果 API 失敗，檢查權限

```sql
-- 檢查 RLS 政策
SELECT * FROM pg_policies 
WHERE tablename = 'onboarding_questions';

-- 如果沒有公開讀取權限，可能需要調整 RLS 政策
```

## 📋 預期結果

成功導入後應該有：
- ✅ 總題數：**15 題**
- ✅ 難度 1：**5 題**
- ✅ 難度 2：**5 題**
- ✅ 難度 3：**5 題**
- ✅ 科目：全部為 **'english'**
- ✅ 狀態：全部為 **is_active = true**

API 查詢應該返回：
- ✅ `success: true`
- ✅ `questions.length >= 7`
- ✅ Challenge 頁面使用真正的題目，而不是 fallback

## 🎯 快速診斷腳本

我已創建診斷腳本，可以在瀏覽器控制台使用：

1. 打開 `apps/web/scripts/diagnose-onboarding-questions.ts`
2. 將腳本內容複製到瀏覽器控制台
3. 執行 `diagnoseOnboardingQuestions()`

或者直接訪問診斷文檔：
- `apps/web/diagnose-onboarding-questions.md`

## 🔗 相關文件

- API 端點: `apps/web/app/api/onboarding/questions/route.ts`
- Challenge 頁面: `apps/web/app/onboarding/challenge/page.tsx`
- 導入 API: `apps/web/app/api/internal/onboarding-questions/import/route.ts`
- SQL 種子文件: `apps/web/db/sql/021_onboarding_seed_questions.sql`
- 表結構定義: `apps/web/db/sql/021_onboarding_flow.sql`

