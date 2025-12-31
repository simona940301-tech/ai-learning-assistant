# ✅ Onboarding Questions 驗證步驟

## 第一步：列名驗證 ✅ (已完成)

從 SQL 查詢結果可以看到，列名已經正確：
- `option_a`
- `option_b`
- `option_c`
- `option_d`

這符合代碼期望！

## 第二步：驗證數據完整性

在 Supabase SQL Editor 執行：

```sql
-- 檢查數據數量和各難度分布
SELECT 
  difficulty_level,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
  COUNT(CASE WHEN subject = 'english' THEN 1 END) as english_count
FROM onboarding_questions
GROUP BY difficulty_level
ORDER BY difficulty_level;

-- 檢查符合查詢條件的題目數量
SELECT COUNT(*) as available_questions
FROM onboarding_questions
WHERE is_active = true 
  AND subject = 'english'
  AND difficulty_level BETWEEN 1 AND 3;
```

預期結果：
- 至少應該有 7 題以上的可用題目
- 難度 1, 2, 3 都應該有題目

## 第三步：測試 API 端點

在瀏覽器控制台執行：

```javascript
// 測試 API 是否正常返回數據
fetch('/api/onboarding/questions?difficulties=1,2,3&count=7')
  .then(res => res.json())
  .then(data => {
    console.log('=== API 響應 ===');
    console.log('Success:', data.success);
    console.log('題目數量:', data.questions?.length || 0);
    
    if (data.questions && data.questions.length > 0) {
      const q = data.questions[0];
      console.log('\n=== 第一題數據 ===');
      console.log('ID:', q.id);
      console.log('題目:', q.question_text?.substring(0, 50) + '...');
      console.log('選項 A:', q.option_a);
      console.log('選項 B:', q.option_b);
      console.log('選項 C:', q.option_c);
      console.log('選項 D:', q.option_d);
      console.log('正確答案:', q.correct_answer);
      console.log('難度:', q.difficulty_level);
      console.log('科目:', q.subject);
      console.log('啟用:', q.is_active);
      
      // 檢查選項是否都有值
      if (q.option_a && q.option_b && q.option_c && q.option_d) {
        console.log('\n✅ 所有選項字段都有值！');
      } else {
        console.error('\n❌ 選項字段缺失！');
        console.error('選項狀態:', {
          option_a: !!q.option_a,
          option_b: !!q.option_b,
          option_c: !!q.option_c,
          option_d: !!q.option_d,
        });
      }
      
      if (data.questions.length >= 7) {
        console.log('\n✅ 題目數量充足（≥7 題）');
      } else {
        console.warn('\n⚠️ 題目數量不足 7 題，會觸發 fallback');
      }
    } else {
      console.error('\n❌ API 未返回題目數據');
      if (data.error) {
        console.error('錯誤信息:', data.error);
      }
    }
  })
  .catch(error => {
    console.error('❌ API 請求失敗:', error);
  });
```

## 第四步：驗證 Challenge 頁面

1. 清除瀏覽器緩存（Cmd+Shift+R 或 Ctrl+Shift+R）
2. 訪問 `/onboarding/challenge`
3. 檢查是否顯示真正的題目，而不是 "這是第 1 道測試題"

如果仍顯示 fallback 測試題，打開瀏覽器控制台查看：
- Network 標籤中 `/api/onboarding/questions` 請求的響應
- Console 中的錯誤信息

## 可能還需要檢查的問題

### 問題 A: RLS (Row Level Security) 權限

如果 API 返回空數組，可能是 RLS 政策限制了查詢。

檢查 RLS 政策：

```sql
-- 檢查 onboarding_questions 表的 RLS 狀態
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'onboarding_questions';

-- 檢查 RLS 政策
SELECT * FROM pg_policies 
WHERE tablename = 'onboarding_questions';
```

如果需要，可以臨時禁用 RLS 進行測試：

```sql
-- 注意：這僅用於測試，生產環境應設置正確的 RLS 政策
ALTER TABLE onboarding_questions DISABLE ROW LEVEL SECURITY;
```

### 問題 B: 數據格式

確認數據格式正確：

```sql
-- 檢查是否有必填字段為空
SELECT 
  id,
  CASE WHEN question_text IS NULL THEN '❌' ELSE '✅' END as has_question,
  CASE WHEN option_a IS NULL THEN '❌' ELSE '✅' END as has_option_a,
  CASE WHEN option_b IS NULL THEN '❌' ELSE '✅' END as has_option_b,
  CASE WHEN option_c IS NULL THEN '❌' ELSE '✅' END as has_option_c,
  CASE WHEN option_d IS NULL THEN '❌' ELSE '✅' END as has_option_d,
  CASE WHEN correct_answer IS NULL THEN '❌' ELSE '✅' END as has_answer,
  difficulty_level,
  is_active,
  subject
FROM onboarding_questions
WHERE is_active = true 
  AND subject = 'english'
  AND difficulty_level BETWEEN 1 AND 3
LIMIT 10;
```

## 成功指標

✅ 列名匹配：`option_a`, `option_b`, `option_c`, `option_d`
✅ 數據存在：至少 7 題符合條件
✅ API 正常：返回 `success: true` 且 `questions.length >= 7`
✅ 選項完整：每題都有 `option_a`, `option_b`, `option_c`, `option_d` 值
✅ 頁面正常：Challenge 頁面顯示真正的題目

## 下一步

如果所有驗證都通過，但 Challenge 頁面仍顯示 fallback，請：
1. 檢查瀏覽器控制台的完整錯誤信息
2. 檢查 Network 標籤中 API 請求的完整響應
3. 檢查開發服務器終端的錯誤日誌

