# MathA 解題系統設置指南

## 概述

本系統建立完整的數學解題邏輯，包含考點知識庫、題目庫、四個考點選一診斷、以及智能解題策略生成。

## 資料庫結構

### 核心表格

1. **subjects** - 學科（MathA, English）
2. **exams** - 考試（年份、標籤）
3. **keypoints** - 考點字典（策略模板、錯誤模式）
4. **questions** - 題目本體（詳解、答案）
5. **question_keypoints** - 題目-考點關聯（主/輔考點）
6. **keypoint_mcq_bank** - 考點診斷題庫

### 章節標準化

```
數與式｜多項式函數｜指數與對數｜數列與級數｜排列組合｜機率｜
數據分析｜三角｜直線與圓｜平面向量｜空間向量｜
空間中的平面與直線｜矩陣｜二次曲線
```

## 設置步驟

### 1. 資料庫 Schema

```bash
# 推送數學資料庫 schema
npm run db:push:math
```

### 2. 匯入資料

```bash
# 匯入考點知識庫和題目庫
npm run import:math
```

### 3. 環境變數

確保 `.env.local` 包含：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

## API 端點

### 1. 四個考點選一診斷

**POST** `/api/warmup/keypoint-mcq`

```json
{
  "subject": "MathA",
  "weakness_distribution": {
    "三角": 0.8,
    "向量": 0.6
  }
}
```

回傳：
```json
{
  "mcq": {
    "id": "uuid",
    "stem": "以下哪一個是「餘弦定理」的正確敘述？",
    "choices": [
      {"key": "A", "text": "c^2=a^2+b^2-2ab cos C"},
      {"key": "B", "text": "a/sinA=b/sinB=c/sinC"},
      {"key": "C", "text": "c^2=a^2+b^2+2ab cos C"},
      {"key": "D", "text": "cos C=(a^2+b^2-c^2)/(2ab)"}
    ],
    "answer": "A",
    "difficulty": "中",
    "tags": ["三角"]
  }
}
```

### 2. 解題策略生成

**POST** `/api/solve`

```json
{
  "question_id": "uuid"
}
```

或

```json
{
  "prompt": "三角形 ABC 中，已知兩邊與夾角，求第三邊長度。"
}
```

回傳：
```json
{
  "strategy_name": "餘弦定理",
  "steps": [
    {"title": "步驟 1", "detail": "辨識三邊或兩邊夾角"},
    {"title": "步驟 2", "detail": "代公式"},
    {"title": "步驟 3", "detail": "檢查鈍角"}
  ],
  "checks": ["單位與範圍"],
  "hints": ["注意：畫圖輔助"],
  "keypoints": {
    "primary": "餘弦定理",
    "auxiliary": ["向量內積"]
  }
}
```

## 資料格式

### 考點知識庫 (keypoints.jsonl)

```json
{
  "subject": "MathA",
  "category": "三角",
  "code": "TRIG_COS_LAW",
  "name": "餘弦定理",
  "description": "c^2=a^2+b^2-2ab cos C",
  "strategy_template": {
    "steps": ["辨識三邊或兩邊夾角", "代公式", "檢查鈍角"],
    "checks": ["單位與範圍"]
  },
  "error_patterns": [
    {"pattern": "夾角誤判", "note": "畫圖輔助"}
  ]
}
```

### 題目庫 (questions.jsonl)

```json
{
  "exam": {"year": 108, "label": "數學A"},
  "number": "10",
  "qtype": "multiple",
  "prompt": "三角形 ABC 中，已知兩邊與夾角，求第三邊長度。",
  "options": [
    {"key": "1", "text": "使用正弦定理"},
    {"key": "2", "text": "使用餘弦定理"}
  ],
  "answer": ["2"],
  "difficulty": "中",
  "objectives": ["餘弦定理應用"],
  "source_units": ["三角"],
  "rationale": {"2": "兩邊與夾角→餘弦定理"},
  "solution": {
    "outline": ["辨認型態", "代入公式"],
    "steps": [
      {"title": "公式", "detail": "c^2=a^2+b^2-2ab cos C"}
    ]
  },
  "keypoints": [
    {"code": "TRIG_COS_LAW", "role": "primary", "weight": 1.0}
  ],
  "meta": {
    "source_pdf": "108數學解析.pdf",
    "page_hint": "多選10"
  }
}
```

## 新增年度 PDF 解析

### 1. 準備資料

1. 將 PDF 解析內容轉換為 JSONL 格式
2. 確保包含以下欄位：
   - `exam`: 年份和標籤
   - `prompt`: 題幹
   - `options`: 選項（如適用）
   - `answer`: 答案
   - `difficulty`: 難度
   - `objectives`: 測驗目標
   - `source_units`: 命題出處
   - `solution`: 詳解步驟
   - `keypoints`: 考點關聯

### 2. 更新考點

如需要新考點，在 `keypoints.jsonl` 中新增：

```json
{
  "subject": "MathA",
  "category": "新章節",
  "code": "NEW_CONCEPT_CODE",
  "name": "新考點名稱",
  "description": "考點描述",
  "strategy_template": {
    "steps": ["步驟1", "步驟2"],
    "checks": ["檢查點"]
  },
  "error_patterns": [
    {"pattern": "常見錯誤", "note": "注意事項"}
  ]
}
```

### 3. 匯入新資料

```bash
# 將新資料追加到現有檔案
cat new_questions.jsonl >> data/mathA_questions_sample.jsonl

# 重新匯入
npm run import:math
```

## 驗收標準

1. **資料完整性**：任一年度能查到題目分布含各章節
2. **考點關聯**：隨機抽 10 題，皆有至少 1 個 primary 考點
3. **診斷功能**：`/warmup/keypoint-mcq` 回傳 4 個語義相近選項
4. **解題策略**：`/solve` 輸出步驟序列，含檢核清單與錯誤提醒

## 故障排除

### 常見問題

1. **環境變數未設置**：檢查 `.env.local` 檔案
2. **資料庫連接失敗**：確認 Supabase URL 和 Service Role Key
3. **匯入失敗**：檢查 JSONL 格式是否正確
4. **API 錯誤**：查看終端錯誤訊息和 Supabase 日誌

### 日誌檢查

```bash
# 查看匯入日誌
npm run import:math

# 檢查資料庫連接
curl -X POST http://localhost:3000/api/warmup/keypoint-mcq \
  -H "Content-Type: application/json" \
  -d '{"subject": "MathA"}'
```

## 擴展指南

### 新增科目

1. 在 `subjects` 表格新增科目
2. 建立對應的考點和題目資料
3. 更新 API 以支援新科目

### 增強 AI 功能

1. 使用 embeddings 進行語意搜尋
2. 整合更多 LLM 模型
3. 添加個人化學習路徑

## 技術架構

- **前端**：Next.js 14 + TypeScript + Tailwind CSS
- **後端**：Next.js API Routes + Supabase
- **資料庫**：PostgreSQL + pgvector（語意搜尋）
- **AI**：OpenAI GPT-4o-mini
- **部署**：Vercel + Supabase Cloud
