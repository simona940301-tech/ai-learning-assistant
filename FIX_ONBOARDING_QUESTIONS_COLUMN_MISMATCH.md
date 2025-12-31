# 🎯 Onboarding Questions 列名不匹配問題修復

## 問題確認

從 Supabase 截圖可以看到：
- 數據庫實際列名：`option_a_text`, `option_b_text` 等
- API 期望的列名：`option_a`, `option_b`, `option_c`, `option_d`
- Schema 定義的列名：`option_a`, `option_b`, `option_c`, `option_d`

## 根本原因

數據庫表的實際結構與 schema 定義不一致，導致：
1. API 查詢返回的數據中，`option_a` 等字段為 `undefined`
2. Challenge 頁面無法正確映射選項：
   ```typescript
   options: [selected.option_a, selected.option_b, selected.option_c, selected.option_d]
   // 這些都是 undefined，因為實際列名是 option_a_text 等
   ```
3. 最終導致題目無法正確顯示，觸發 fallback 機制

## 解決方案

### 方案 1: 重命名數據庫列（推薦）

在 Supabase SQL Editor 執行：

```sql
-- 檢查當前列名
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'onboarding_questions' 
AND column_name LIKE 'option%';

-- 如果列名是 option_a_text 等，需要重命名為 option_a 等
ALTER TABLE onboarding_questions 
  RENAME COLUMN option_a_text TO option_a;

ALTER TABLE onboarding_questions 
  RENAME COLUMN option_b_text TO option_b;

ALTER TABLE onboarding_questions 
  RENAME COLUMN option_c_text TO option_c;

ALTER TABLE onboarding_questions 
  RENAME COLUMN option_d_text TO option_d;
```

### 方案 2: 修改 API 代碼適配現有列名

如果不想修改數據庫結構，可以修改 API 查詢邏輯：

修改 `apps/web/app/api/onboarding/questions/route.ts`：

```typescript
// 在返回前，映射列名
const mappedQuestions = questions.map(q => ({
  ...q,
  option_a: q.option_a_text || q.option_a,
  option_b: q.option_b_text || q.option_b,
  option_c: q.option_c_text || q.option_c,
  option_d: q.option_d_text || q.option_d,
}))

return NextResponse.json({
  success: true,
  questions: mappedQuestions
})
```

或者在 Challenge 頁面修改映射邏輯：

修改 `apps/web/app/onboarding/challenge/page.tsx` 第 207 行：

```typescript
options: [
  selected.option_a || selected.option_a_text,
  selected.option_b || selected.option_b_text,
  selected.option_c || selected.option_c_text,
  selected.option_d || selected.option_d_text,
],
```

## 驗證步驟

### 步驟 1: 檢查實際列名

在 Supabase SQL Editor 執行：

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'onboarding_questions' 
AND column_name LIKE 'option%'
ORDER BY column_name;
```

### 步驟 2: 檢查實際數據

```sql
SELECT 
  id,
  LEFT(question_text, 50) as question_preview,
  option_a_text,
  option_b_text,
  option_a,
  option_b,
  correct_answer,
  difficulty_level
FROM onboarding_questions
LIMIT 3;
```

### 步驟 3: 測試 API 返回

在瀏覽器控制台執行：

```javascript
fetch('/api/onboarding/questions?difficulties=1,2,3&count=1')
  .then(res => res.json())
  .then(data => {
    console.log('API 響應:', data);
    if (data.questions && data.questions.length > 0) {
      const q = data.questions[0];
      console.log('題目數據:', q);
      console.log('option_a:', q.option_a);
      console.log('option_a_text:', q.option_a_text);
      console.log('所有選項字段:', {
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        option_a_text: q.option_a_text,
        option_b_text: q.option_b_text,
        option_c_text: q.option_c_text,
        option_d_text: q.option_d_text,
      });
    }
  });
```

## 推薦解決方案

**建議使用方案 1**（重命名列），因為：
1. 符合 schema 定義
2. 不需要修改業務邏輯代碼
3. 保持代碼一致性
4. 避免後續混淆

## 完整檢查清單

- [ ] 確認數據庫實際列名
- [ ] 執行列重命名 SQL（如果列名不匹配）
- [ ] 驗證 API 返回的數據結構
- [ ] 測試 Challenge 頁面能否正確顯示題目
- [ ] 確認不再使用 fallback 測試題

