# 🔧 Onboarding Questions 列名不匹配修復指南

## 🎯 問題診斷結果

根據 Supabase 截圖和代碼分析，發現根本問題：

### 問題現象
- 數據庫表中有 **45 條記錄**
- 但 Challenge 頁面仍顯示 fallback 測試題

### 根本原因
**列名不匹配**：
- 數據庫實際列名：`option_a_text`, `option_b_text`, `option_c_text`, `option_d_text`
- 代碼期望列名：`option_a`, `option_b`, `option_c`, `option_d`

這導致 Challenge 頁面在映射選項時：
```typescript
options: [selected.option_a, selected.option_b, selected.option_c, selected.option_d]
// 所有值都是 undefined，因為列名是 option_a_text 等
```

## ✅ 解決方案

### 方案 1: 重命名數據庫列（推薦）⭐

在 Supabase SQL Editor 執行 `fix-column-names.sql` 文件，或執行以下 SQL：

```sql
-- 檢查當前列名
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'onboarding_questions' 
AND column_name LIKE 'option%'
ORDER BY column_name;

-- 如果確實是 option_a_text 等，執行重命名
ALTER TABLE onboarding_questions RENAME COLUMN option_a_text TO option_a;
ALTER TABLE onboarding_questions RENAME COLUMN option_b_text TO option_b;
ALTER TABLE onboarding_questions RENAME COLUMN option_c_text TO option_c;
ALTER TABLE onboarding_questions RENAME COLUMN option_d_text TO option_d;
```

### 方案 2: 修改代碼適配現有列名

如果不想修改數據庫結構，可以修改 Challenge 頁面的映射邏輯。

修改 `apps/web/app/onboarding/challenge/page.tsx` 第 207 行：

```typescript
// 原本：
options: [selected.option_a, selected.option_b, selected.option_c, selected.option_d],

// 修改為（支持兩種列名）：
options: [
  selected.option_a || selected.option_a_text,
  selected.option_b || selected.option_b_text,
  selected.option_c || selected.option_c_text,
  selected.option_d || selected.option_d_text,
],
```

## 🔍 驗證步驟

### 步驟 1: 確認列名

在 Supabase SQL Editor 執行：

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'onboarding_questions' 
AND column_name LIKE 'option%'
ORDER BY column_name;
```

### 步驟 2: 測試 API 返回

在瀏覽器控制台執行：

```javascript
fetch('/api/onboarding/questions?difficulties=1,2,3&count=1')
  .then(res => res.json())
  .then(data => {
    console.log('API 響應:', data);
    if (data.questions && data.questions.length > 0) {
      const q = data.questions[0];
      console.log('第一題數據:', q);
      console.log('選項字段:', {
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
      });
      // 檢查是否有值
      if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) {
        console.error('❌ 選項字段為空！這就是問題所在！');
      } else {
        console.log('✅ 選項字段有值');
      }
    }
  });
```

### 步驟 3: 驗證 Challenge 頁面

1. 訪問 `/onboarding/challenge`
2. 檢查是否仍顯示 "這是第 1 道測試題"
3. 如果顯示真正的題目，表示修復成功 ✅

## 📋 完整檢查清單

- [ ] 確認數據庫列名（執行步驟 1）
- [ ] 執行列重命名 SQL（方案 1）或修改代碼（方案 2）
- [ ] 驗證 API 返回的數據結構（執行步驟 2）
- [ ] 測試 Challenge 頁面（執行步驟 3）
- [ ] 確認不再使用 fallback 測試題

## 🚀 快速修復

如果你確認列名確實是 `option_a_text` 等，直接執行：

1. 打開 Supabase SQL Editor
2. 執行 `fix-column-names.sql` 文件
3. 刷新 Challenge 頁面
4. 應該就能看到真正的題目了！

## 📝 相關文件

- 修復 SQL: `fix-column-names.sql`
- Challenge 頁面: `apps/web/app/onboarding/challenge/page.tsx` (第 207 行)
- API 端點: `apps/web/app/api/onboarding/questions/route.ts`
- Schema 定義: `supabase/schema.sql` (第 1097 行)

