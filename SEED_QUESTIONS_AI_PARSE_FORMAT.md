# Seed Questions AI 解析標準格式

## 概述

此文件說明如何使用 AI 自動解析功能匯入歷屆試題。AI 會自動從純文字中提取以下資訊：

- **年份**：考試年份（如 2024、113 學年度）
- **類別**：GSAT（學測）、AST（指考）、OTHER（模考）
- **科目**：chinese（國文）、english（英文）、math（數學）、science（自然）、social（社會）
- **題目**：題號、題目文字、四個選項、正確答案
- **難度**：1-5（1最簡單，5最難）
- **標籤**：知識點標籤（如 ["英文-詞彙題", "英文-自然/季節"]）
- **詳解**：解題步驟和說明

## 標準格式範例

### 範例 1：完整格式（推薦）

```
2024 學測英文試題

【題目 1】
1. Mangoes are a _____ fruit that grows in tropical regions.
(A) mature
(B) usual
(C) seasonal
(D) particular

答案：C
難度：3
標籤：英文-詞彙題, 英文-自然/季節

【詳解】
核心考點：形容詞詞義辨析
題幹翻譯：芒果是一種生長在熱帶地區的_____水果。
判斷詞義：seasonal 表示季節性的，符合題意。
結論：答案為 (C) seasonal。

【題目 2】
2. The teacher asked the students to _____ their homework before class.
(A) turn in
(B) turn on
(C) turn off
(D) turn up

答案：A
難度：2
標籤：英文-片語動詞

【詳解】
核心考點：片語動詞 turn in 的用法
題幹翻譯：老師要求學生在上課前_____作業。
判斷詞義：turn in 表示繳交，符合題意。
結論：答案為 (A) turn in。
```

### 範例 2：簡化格式（AI 也能解析）

```
113 學年度學測英文

1. Mangoes are a _____ fruit that grows in tropical regions.
(A) mature (B) usual (C) seasonal (D) particular
答案：C

2. The teacher asked the students to _____ their homework before class.
(A) turn in (B) turn on (C) turn off (D) turn up
答案：A
```

### 範例 3：多科目混合（AI 會自動判斷科目）

```
2024 學測試題

【英文科】
1. Mangoes are a _____ fruit...
(A) mature (B) usual (C) seasonal (D) particular
答案：C

【數學科】
2. 若 x + y = 10，且 x - y = 4，則 x = ?
(A) 3 (B) 5 (C) 7 (D) 9
答案：C
```

## 欄位對應關係

### seed_questions 表欄位

| 欄位名稱 | 說明 | 範例 | 必填 |
|---------|------|------|------|
| `source` | 來源標識 | `GSAT_2024` | ✅ |
| `source_year` | 年份 | `2024` | ⚠️ |
| `source_type` | 類別 | `GSAT` / `AST` / `OTHER` | ⚠️ |
| `paper_number` | 試卷編號 | `1` | ❌ |
| `question_number` | 題號 | `1`, `7`, `選填C` | ✅ |
| `subject` | 科目 | `chinese` / `english` / `math` / `science` / `social` | ✅ |
| `question_text` | 題目文字 | `Mangoes are a _____ fruit...` | ✅ |
| `option_a` | 選項 A | `mature` | ✅ |
| `option_b` | 選項 B | `usual` | ✅ |
| `option_c` | 選項 C | `seasonal` | ✅ |
| `option_d` | 選項 D | `particular` | ✅ |
| `correct_answer` | 正確答案 | `A` / `B` / `C` / `D` | ✅ |
| `difficulty_level` | 難度等級 | `1-5` | ✅ |
| `knowledge_tags` | 知識點標籤 | `["英文-詞彙題", "英文-自然/季節"]` | ⚠️ |
| `is_active` | 是否啟用 | `true` | ✅ |

### question_explanations 表欄位

| 欄位名稱 | 說明 | 範例 | 必填 |
|---------|------|------|------|
| `question_id` | 題目 ID | UUID | ✅ |
| `explanation_text` | 詳解文字 | `核心考點：...` | ⚠️ |
| `option_analysis` | 選項分析 | JSONB | ❌ |

## 對戰系統欄位對應

對戰系統從 `seed_questions` 表讀取以下欄位：

```typescript
{
  id: string,                    // seed_questions.id
  question_text: string,          // seed_questions.question_text
  option_a: string,               // seed_questions.option_a
  option_b: string,               // seed_questions.option_b
  option_c: string,               // seed_questions.option_c
  option_d: string,               // seed_questions.option_d
  correct_answer: string,         // seed_questions.correct_answer
  difficulty_level: number,      // seed_questions.difficulty_level
  subject: string,                // seed_questions.subject
}
```

## 錯題本欄位對應

錯題本（`error_book` 表）使用：

```typescript
{
  user_id: string,                // 用戶 ID
  question_id: string,            // seed_questions.id
  status: 'active',               // 狀態
  last_attempted_at: timestamp,   // 最後嘗試時間
}
```

## 使用說明

1. **進入匯入頁面**：`/admin/import-questions`
2. **選擇「AI 自動解析」標籤**
3. **（選填）設定基本資訊**：考試類型、年份（AI 會自動提取，但提供預設值可提高準確度）
4. **貼上試題文字**：將整年試題的純文字貼到文字框中
5. **點擊「開始 AI 解析」**：AI 會自動提取所有題目資訊並匯入資料庫

## 注意事項

1. **文字格式**：雖然 AI 可以解析各種格式，但使用標準格式可以提高準確度
2. **科目判斷**：AI 會根據題目內容自動判斷科目，如果無法判斷會使用預設值
3. **難度等級**：如果無法判斷，預設為 3（中等難度）
4. **詳解**：如果有詳解，AI 會自動提取並存入 `question_explanations` 表
5. **錯誤處理**：如果某些題目解析失敗，會顯示錯誤詳情，但成功的題目仍會匯入

## 最佳實踐

1. **提供上下文**：在文字開頭明確標示年份和類別（如「2024 學測英文試題」）
2. **清晰格式**：使用清晰的題號、選項標記（如 `(A)`, `(B)`）
3. **完整資訊**：盡量包含詳解，有助於後續學習
4. **檢查結果**：匯入後檢查結果，確認所有題目都正確解析

## 技術細節

- **AI 模型**：使用 GPT-4o 進行解析
- **解析方式**：JSON 格式輸出，自動驗證和轉換
- **錯誤處理**：部分題目解析失敗不影響其他題目的匯入
- **詳解處理**：詳解會自動存入 `question_explanations` 表，與題目建立關聯

