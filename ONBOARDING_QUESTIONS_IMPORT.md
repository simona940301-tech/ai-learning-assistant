# Onboarding Questions 匯入指南

## 概述

Onboarding questions 用於 7 題測驗流程，需要匯入到 `onboarding_questions` 表中。

## 方法 1: 使用 API 匯入（推薦）

### 步驟

1. **確保已登入為管理員**

2. **執行 API 請求**：

```bash
curl -X POST http://localhost:3000/api/internal/onboarding-questions/import \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

或使用瀏覽器開發者工具：

```javascript
fetch('/api/internal/onboarding-questions/import', {
  method: 'POST',
  credentials: 'include',
})
  .then(res => res.json())
  .then(data => console.log(data))
```

### API 回應

成功時會返回：
```json
{
  "success": true,
  "message": "成功匯入 15 道 onboarding 題目",
  "total": 15,
  "byDifficulty": {
    "1": 5,
    "2": 5,
    "3": 5
  }
}
```

## 方法 2: 直接執行 SQL

如果 API 無法使用，可以直接在 Supabase SQL Editor 執行：

### 檔案位置

- `apps/web/db/sql/021_onboarding_seed_questions.sql` - 15 題（難度 1-3，符合 schema）

### 執行步驟

1. 打開 Supabase Dashboard
2. 進入 SQL Editor
3. 複製 `021_onboarding_seed_questions.sql` 的內容
4. 執行 SQL

### 驗證匯入

執行以下 SQL 檢查：

```sql
SELECT
  difficulty_level,
  COUNT(*) as question_count
FROM onboarding_questions
WHERE is_active = true AND subject = 'english'
GROUP BY difficulty_level
ORDER BY difficulty_level;
```

預期結果：
```
difficulty_level | question_count
-----------------+---------------
               1 |             5
               2 |             5
               3 |             5
```

## 題目規格

- **總數**: 15 題
- **難度分布**:
  - 難度 1: 5 題（簡單題 - 建立信心）
  - 難度 2: 5 題（中等題 - 稍有挑戰）
  - 難度 3: 5 題（挑戰題 - 測試實力）
- **科目**: 英文 (english)
- **格式**: 四選一選擇題 (A, B, C, D)

## 注意事項

1. **難度限制**: 資料庫 schema 限制 `difficulty_level` 必須在 1-3 之間
2. **重複匯入**: API 會檢查是否已有題目，避免重複匯入
3. **權限要求**: 只有管理員可以執行匯入

## 故障排除

### 問題：API 返回 401 錯誤

**解決方案**: 確保已登入且 session cookie 有效

### 問題：API 返回 403 錯誤

**解決方案**: 確保用戶角色為 `admin`

### 問題：API 返回「題目已存在」錯誤

**解決方案**: 
- 如果需要重新匯入，先刪除現有題目：
  ```sql
  DELETE FROM onboarding_questions WHERE subject = 'english';
  ```
- 然後重新執行匯入

### 問題：SQL 執行失敗

**解決方案**: 
- 檢查 `onboarding_questions` 表是否存在
- 檢查欄位是否符合 schema
- 確認 `difficulty_level` 在 1-3 範圍內

## 相關檔案

- API 端點: `apps/web/app/api/internal/onboarding-questions/import/route.ts`
- SQL 種子檔案: `apps/web/db/sql/021_onboarding_seed_questions.sql`
- 資料庫 Schema: `apps/web/db/sql/021_onboarding_flow.sql`

