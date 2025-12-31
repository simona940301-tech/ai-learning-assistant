# 遊戲模式題目匯入格式規範

## 概述

本文檔說明如何為三種遊戲模式匯入題目：
- **偵探檔案 (Detective's Log)**: 碎片閱讀、證據判讀、邏輯推理
- **實習編輯 (Editor Mode)**: 克漏字、拖放式填空
- **無限練習 (Infinite Practice)**: TikTok 式刷題

---

## 一、無限練習 (Infinite Practice)

### 格式說明
無限練習使用標準的 `seed_questions` 格式，與現有的對戰系統完全兼容。

### 標準格式範例

```
2024 學測英文試題

📝 題目 1
1. Mangoes are a _____ fruit that grows in tropical regions.
(A) mature
(B) usual
(C) seasonal
(D) particular

答案：C 難度：3 標籤：英文-詞彙題, 英文-自然/季節

🧠 詳解
核心考點：形容詞詞義辨析
題幹翻譯：芒果是一種生長在熱帶地區的_____水果。
判斷詞義：seasonal 表示季節性的，符合題意。
結論：答案為 (C) seasonal。

📝 題目 2
2. The teacher asked the students to _____ their homework before class.
(A) turn in
(B) turn on
(C) turn off
(D) turn up

答案：A 難度：2 標籤：英文-片語動詞

🧠 詳解
核心考點：片語動詞 turn in 的用法
題幹翻譯：老師要求學生在上課前_____作業。
判斷詞義：turn in 表示繳交，符合題意。
結論：答案為 (A) turn in。
```

### 欄位對應

| 欄位 | 說明 | 範例 | 必填 |
|------|------|------|------|
| `source` | 來源標識 | `GSAT_2024_Paper_1` | ✅ |
| `source_year` | 年份 | `2024` | ✅ |
| `source_type` | 類別 | `GSAT` / `AST` / `OTHER` | ✅ |
| `question_number` | 題號 | `1`, `7`, `選填C` | ✅ |
| `subject` | 科目 | `english` / `chinese` / `math` / `science` / `social` | ✅ |
| `question_text` | 題目文字 | `Mangoes are a _____ fruit...` | ✅ |
| `option_a` | 選項 A | `mature` | ✅ |
| `option_b` | 選項 B | `usual` | ✅ |
| `option_c` | 選項 C | `seasonal` | ✅ |
| `option_d` | 選項 D | `particular` | ✅ |
| `correct_answer` | 正確答案 | `A` / `B` / `C` / `D` | ✅ |
| `difficulty_level` | 難度等級 | `1-5` | ✅ |
| `knowledge_tags` | 知識點標籤 | `["英文-詞彙題"]` | ⚠️ |

---

## 二、實習編輯 (Editor Mode)

### 格式說明
Editor Mode 使用克漏字格式，需要標記空格位置和干擾選項。

### 標準格式範例

```
2024 學測英文 - Editor Mode

📝 題目 1
主題：環境保護

文章：
Climate change is one of the most {1:pressing} issues of our time. Scientists have been {2:warning} us about its effects for decades. We must take {3:action} now to protect our planet for future generations.

空格 1: pressing
選項: pressing (正確), urgent (高干擾), important (中干擾), serious (低干擾)
難度: 3
標籤: 英文-詞彙題, 英文-環境議題

空格 2: warning
選項: warning (正確), telling (高干擾), informing (中干擾), saying (低干擾)
難度: 2
標籤: 英文-動詞用法

空格 3: action
選項: action (正確), steps (高干擾), measures (中干擾), moves (低干擾)
難度: 3
標籤: 英文-名詞搭配

🧠 詳解
本文探討氣候變遷議題，測試學生對環境相關詞彙的掌握度。
```

### 欄位對應

| 欄位 | 說明 | 範例 | 必填 |
|------|------|------|------|
| `source` | 來源標識 | `GSAT_2024_Editor_1` | ✅ |
| `source_year` | 年份 | `2024` | ✅ |
| `source_type` | 類別 | `GSAT` / `AST` / `OTHER` | ✅ |
| `subject` | 科目 | `english` / `chinese` | ✅ |
| `article_text` | 文章內容（含空格標記） | `Climate change is...` | ✅ |
| `blanks` | 空格資訊陣列 | JSON 格式 | ✅ |
| `difficulty_level` | 整體難度 | `1-5` | ✅ |
| `knowledge_tags` | 知識點標籤 | `["英文-克漏字"]` | ✅ |

**Blanks JSON 格式：**
```json
[
  {
    "blank_id": 1,
    "correct_answer": "pressing",
    "options": [
      {"text": "pressing", "interference_level": "correct"},
      {"text": "urgent", "interference_level": "high"},
      {"text": "important", "interference_level": "medium"},
      {"text": "serious", "interference_level": "low"}
    ],
    "difficulty": 3,
    "tags": ["英文-詞彙題"]
  }
]
```

---

## 三、偵探檔案 (Detective's Log)

### 格式說明
Detective Mode 需要長篇文章、證據片段和推理題目。

### 標準格式範例

```
2024 學測國文 - Detective Mode

📝 案件 1
案件名稱：失落的古詩真跡

背景故事：
某博物館收藏了一幅據稱是唐代詩人李白的真跡，但近期有學者質疑其真實性。你需要透過分析各種證據，判斷這幅作品的真偽。

證據 A：書法風格分析
文字內容：此作品筆觸流暢，氣勢磅礴，與李白豪放的詩風相符。然而，部分字體結構與唐代書法習慣略有出入。
重要性：高
類型：專家鑑定

證據 B：紙張材質檢測
文字內容：經碳14檢測，紙張年代約在唐代中期，與李白生活年代吻合。但紙張製作工藝顯示使用了宋代才出現的技術。
重要性：極高
類型：科學檢測

證據 C：詩文內容
文字內容：詩作內容為「床前明月光，疑是地上霜」，確實是李白的名作《靜夜思》。但詩句版本與現存最早的宋代刻本略有差異。
重要性：中
類型：文獻比對

推理題目：
根據以上證據，這幅作品最可能是：
(A) 李白真跡
(B) 唐代仿作
(C) 宋代臨摹
(D) 現代偽作

答案：C
難度：4
標籤：國文-古詩詞, 國文-文獻鑑定, 邏輯推理

🧠 詳解
核心考點：綜合證據分析與邏輯推理
關鍵證據：證據 B 顯示紙張使用了宋代技術，這是決定性證據。
推理過程：雖然紙張年代檢測顯示唐代，但製作工藝卻是宋代，說明這是宋代人使用舊紙臨摹的作品。
結論：答案為 (C) 宋代臨摹。
```

### 欄位對應

| 欄位 | 說明 | 範例 | 必填 |
|------|------|------|------|
| `source` | 來源標識 | `GSAT_2024_Detective_1` | ✅ |
| `source_year` | 年份 | `2024` | ✅ |
| `source_type` | 類別 | `GSAT` / `AST` / `OTHER` | ✅ |
| `case_name` | 案件名稱 | `失落的古詩真跡` | ✅ |
| `background_story` | 背景故事 | 長文本 | ✅ |
| `evidences` | 證據陣列 | JSON 格式 | ✅ |
| `question_text` | 推理題目 | `根據以上證據...` | ✅ |
| `option_a` ~ `option_d` | 選項 | 標準格式 | ✅ |
| `correct_answer` | 正確答案 | `A` / `B` / `C` / `D` | ✅ |
| `difficulty_level` | 難度等級 | `1-5` | ✅ |
| `knowledge_tags` | 知識點標籤 | `["國文-古詩詞"]` | ✅ |

**Evidences JSON 格式：**
```json
[
  {
    "evidence_id": "A",
    "title": "書法風格分析",
    "content": "此作品筆觸流暢...",
    "importance": "high",
    "type": "專家鑑定"
  }
]
```

---

## 四、CSV 批量匯入格式

### Infinite Practice CSV

```csv
source,source_year,source_type,question_number,subject,question_text,option_a,option_b,option_c,option_d,correct_answer,difficulty_level,knowledge_tags
GSAT_2024_Paper_1,2024,GSAT,1,english,"Mangoes are a _____ fruit that grows in tropical regions.",mature,usual,seasonal,particular,C,3,"英文-詞彙題,英文-自然/季節"
```

### Editor Mode CSV

```csv
source,source_year,source_type,subject,article_text,blanks_json,difficulty_level,knowledge_tags
GSAT_2024_Editor_1,2024,GSAT,english,"Climate change is one of the most {1:pressing} issues...","[{""blank_id"":1,""correct_answer"":""pressing"",...}]",3,"英文-克漏字"
```

---

## 五、使用說明

### 匯入步驟

1. **訪問匯入頁面**: `/admin/import-game-questions`
2. **選擇遊戲模式**: 點擊對應的 Tab（偵探檔案 / 實習編輯 / 無限練習）
3. **設定基本資訊**: 來源類型、年份、試卷編號
4. **輸入題目內容**: 
   - 文字貼上：直接貼上格式化的文字
   - CSV 上傳：上傳 CSV 檔案
   - AI 解析：讓 AI 自動提取資訊
5. **預覽結果**: 檢查解析後的題目
6. **確認匯入**: 點擊「開始匯入」

### 注意事項

1. **格式一致性**: 請嚴格遵守格式規範，確保解析成功率
2. **編碼問題**: 使用 UTF-8 編碼，避免中文亂碼
3. **必填欄位**: 確保所有必填欄位都有值
4. **難度設定**: 難度等級 1-5，1 最簡單，5 最難
5. **標籤規範**: 使用一致的標籤命名，便於後續篩選

### 最佳實踐

1. **批量匯入**: 一次匯入整份試卷，提高效率
2. **詳解完整**: 盡量提供詳細的解題步驟
3. **標籤精確**: 使用精確的知識點標籤，便於 AI 弱點追蹤
4. **測試驗證**: 匯入後在遊戲中測試，確保題目正常顯示

---

## 六、技術細節

### 資料庫表結構

所有遊戲模式的題目都存儲在 `seed_questions` 表中，通過 `knowledge_tags` 和 `source` 欄位區分不同的遊戲模式。

### API Endpoints

- `POST /api/internal/seed-questions/import` - 匯入題目
- `GET /api/play/questions/seed` - 獲取題目列表
- `GET /api/play/questions/details` - 獲取題目詳情

### 錯誤處理

- **解析失敗**: 顯示具體的錯誤行號和原因
- **驗證失敗**: 列出所有不符合規範的欄位
- **部分成功**: 成功的題目會匯入，失敗的會列出詳情
