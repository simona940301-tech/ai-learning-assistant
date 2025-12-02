# 📚 Onboarding Questions 設定指南

## 問題摘要

原本資料庫的 `onboarding_questions` 表格的 `difficulty_level` 欄位限制為 `1-3`，但我們需要插入難度 `1-5` 的題目。

## 解決方案

我已經創建了一個完整的 SQL 腳本來：
1. **修改資料庫約束**：將難度範圍從 1-3 擴展到 1-5
2. **插入所有 30 道題目**：包含完整詳解和標籤

## 📋 題目分佈

| 難度 | 題目數量 | 說明 |
|------|---------|------|
| 1 | 5 題 | 基礎詞彙 (建立信心) |
| 2 | 5 題 | 中等詞彙 (稍有挑戰) |
| 3 | 5 題 | 學術應用 (抽象概念) |
| 4 | 5 題 | 高階詞彙辨析 |
| 5 | 10 題 | 最高難度 (學測頂標水準) |
| **總計** | **30 題** | |

## 🚀 執行步驟

### 方法 1: 在 Supabase SQL Editor 執行 (推薦)

1. 前往您的 Supabase 專案
   - URL: https://umzqjgxsetsmwzhniemw.supabase.co

2. 進入 **SQL Editor**

3. 複製並貼上 `COMPLETE_ONBOARDING_SETUP.sql` 的完整內容

4. 點擊 **Run** 執行

5. 確認結果顯示：
   ```
   difficulty_level | question_count
   -----------------+---------------
                  1 |             5
                  2 |             5
                  3 |             5
                  4 |             5
                  5 |            10
   ```

### 方法 2: 使用本地腳本

```bash
# 1. 設定環境變數
source apps/web/.env.local

# 2. 使用 psql 執行 (需要先安裝 PostgreSQL client)
psql $DATABASE_URL -f COMPLETE_ONBOARDING_SETUP.sql
```

## 📝 題目特色

每道題目都包含：

1. **question_text**: 完整題目
2. **option_a/b/c/d**: 四個選項
3. **correct_answer**: 正確答案 (A/B/C/D)
4. **difficulty_level**: 難度等級 (1-5)
5. **subject**: 科目 ('english')
6. **explanation**: 完整詳解
   - 核心考點
   - 題幹翻譯
   - 選項分析
7. **knowledge_tags**: 知識標籤陣列
   - 例如：`['英文-詞彙題', '名詞', '基礎詞彙']`

## 🎯 Onboarding 出題邏輯

根據您的需求，系統會：

1. **第一題**：統一從難度 1 開始
2. **第二、三題**：根據前一題的答對與否動態調整難度
   - 答對 → 提升難度
   - 答錯 → 維持或降低難度
3. **完成三題後**：顯示錯題和完整詳解

這符合 **DDA (Dynamic Difficulty Adjustment)** 系統設計！

## 🔍 驗證插入

執行以下 SQL 查詢來驗證：

```sql
-- 查看各難度的題目數量
SELECT
  difficulty_level,
  COUNT(*) as question_count
FROM onboarding_questions
WHERE is_active = true AND subject = 'english'
GROUP BY difficulty_level
ORDER BY difficulty_level;

-- 預覽部分題目
SELECT
  difficulty_level,
  LEFT(question_text, 60) || '...' as question_preview,
  correct_answer,
  knowledge_tags
FROM onboarding_questions
WHERE is_active = true AND subject = 'english'
ORDER BY difficulty_level, created_at
LIMIT 10;
```

## 📂 相關檔案

- `COMPLETE_ONBOARDING_SETUP.sql` - 完整設定 SQL（包含 schema 修改和題目插入）
- `INSERT_ALL_ONBOARDING_QUESTIONS.sql` - 僅題目插入的 SQL
- `apps/web/supabase/migrations/023_expand_onboarding_difficulty.sql` - Migration 檔案

## ✅ 完成檢查清單

- [ ] 執行 SQL 腳本
- [ ] 驗證 30 道題目已成功插入
- [ ] 確認難度分佈正確 (1:5, 2:5, 3:5, 4:5, 5:10)
- [ ] 測試 onboarding 流程
- [ ] 確認詳解正確顯示

## 🐛 常見問題

### Q: 執行時出現 "constraint violation" 錯誤
A: 確保先執行 STEP 1 的約束修改，再執行題目插入

### Q: 題目數量不對
A: 檢查是否有重複插入，使用以下 SQL 清除後重新插入：
```sql
DELETE FROM onboarding_questions WHERE subject = 'english';
```

### Q: 詳解格式顯示異常
A: 檢查前端是否正確處理換行符號 `\n`

## 📞 需要協助？

如有任何問題，請參考：
- Supabase Dashboard: https://app.supabase.com
- 專案文檔：`apps/web/db/sql/021_onboarding_flow.sql`
