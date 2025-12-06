# 校系標準智慧匯入系統 - 使用指南

## 📖 系統概述

這個系統可以讓您上傳校系標準表格的**圖片**,AI 會自動:
1. **辨識表格內容** (校系名稱、檢定標準等)
2. **轉換級距為級分** (頂標→13, 前標→12, 均標→10 等)
3. **匯入資料庫**
4. **自動計算 Dream School Ready Score**

---

## 🚀 使用流程

### 步驟 1: 準備圖片

拍攝或下載**校系標準表格圖片**,格式如下:

```
┌─────────┬──────┬────────────────┬──────┬──────────────────────┐
│ 校系代碼 │ 性別 │ 校系名稱        │ 名額 │ 檢定標準 (國英數社自) │
├─────────┼──────┼────────────────┼──────┼──────────────────────┤
│ 004012  │ 無   │ 中國文學系      │  8   │ 頂標 均標 -- -- 前標  │
│ 004022  │ 無   │ 外國語文學系    │ 13   │ 前標 頂標 -- -- 均標  │
│ 004032  │ 無   │ 歷史學系        │ 14   │ 前標 前標 -- -- 前標  │
└─────────┴──────┴────────────────┴──────┴──────────────────────┘
```

### 步驟 2: 開啟管理介面

訪問: ``

### 步驟 3: 上傳圖片

1. 點擊「選擇圖片」或直接拖拽圖片到上傳區
2. AI 會自動辨識內容 (約 10-30 秒)
3. 檢視辨識結果,確認資料正確

### 步驟 4: 匯入資料庫

點擊「匯入到資料庫」按鈕,系統會:
- ✅ 自動將「頂標」轉換為 `13` 級分
- ✅ 自動將「前標」轉換為 `12` 級分
- ✅ 自動將「均標」轉換為 `10` 級分
- ✅ 自動將「後標」轉換為 `9` 級分
- ✅ 自動將「底標」轉換為 `7` 級分
- ✅ 將 `--` 轉換為 `null` (不要求)

---

## 📊 級分標準對照表 (114學年度)

| 科目 | 頂標 | 前標 | 均標 | 後標 | 底標 |
|------|------|------|------|------|------|
| 國文 | 13   | 12   | 10   | 9    | 7    |
| 英文 | 13   | 11   | 8    | 4    | 3    |
| 數A  | 11   | 9    | 6    | 4    | 3    |
| 數B  | 12   | 10   | 6    | 4    | 3    |
| 社會 | 13   | 12   | 10   | 8    | 7    |
| 自然 | 13   | 12   | 9    | 7    | 5    |

---

## 🗂️ 資料格式說明

### 資料表: `department_requirements`

| 欄位名稱 | 類型 | 說明 | 範例 |
|---------|------|------|------|
| `university_name` | TEXT | 大學名稱 | "國立台灣大學" |
| `department_name` | TEXT | 科系名稱 | "電機工程學系" |
| `department_code` | TEXT | 校系代碼 | "004102" |
| `admission_quota` | INT | 招生名額 | 63 |
| `gender_requirement` | TEXT | 性別要求 | "無" / "男" / "女" |
| `requirement_chinese` | TEXT | 國文檢定標準 | "均標" |
| `requirement_english` | TEXT | 英文檢定標準 | "前標" |
| `requirement_math_a` | TEXT | 數學A檢定標準 | "頂標" |
| `requirement_math_b` | TEXT | 數學B檢定標準 | null |
| `requirement_social` | TEXT | 社會檢定標準 | null |
| `requirement_natural` | TEXT | 自然檢定標準 | "前標" |
| `requirement_english_listening` | TEXT | 英聽檢定標準 | "A" |
| `score_chinese` | INT | **國文級分** | 10 |
| `score_english` | INT | **英文級分** | 12 |
| `score_math_a` | INT | **數學A級分** | 13 |
| `score_math_b` | INT | **數學B級分** | null |
| `score_social` | INT | **社會級分** | null |
| `score_natural` | INT | **自然級分** | 12 |
| `score_english_listening` | TEXT | **英聽等級** | "A" |

**重點**:
- `requirement_*` 欄位儲存**原始文字** (頂標/前標)
- `score_*` 欄位儲存**轉換後的級分數值** (13/12/10)
- 系統會**自動進行轉換**,無需手動計算

---

## 🎯 Dream School 計算邏輯

當使用者設定目標大學和科系後,系統會:

### 1. 查詢該科系的英文要求

```typescript
// 範例: 台大電機工程學系
{
  university_name: "國立台灣大學",
  department_name: "電機工程學系",
  score_english: 12  // 前標
}
```

### 2. 動態調整計算參數

```typescript
englishRequirement = {
  requiredGradeLevel: 12,  // 要求級分
  passScore: 60,
  excellentScore: 90
}

minReadyScore = 50 + (12 * 3) = 86  // 最低達標分數
```

### 3. 計算使用者的 Ready Score

- 使用者的難度加權準確率 → 模擬級分 (U_grade)
- 模擬級分 → Academic Ready Score (0-100)
- 加上行為加成 + 模考調整 → 最終分數
- 最終分數 / 最低達標分數 = **Ready %**

### 4. 顯示在首頁

```
Dream School Ready: 82.5%http://your-domain.com/admin/import-departments-smart
目標: 國立台灣大學 · 電機工程學系
目標分數: 86.0
```

---

## 📝 CSV 手動匯入格式

如果不使用圖片 OCR,也可以手動準備 CSV 檔案:

```csv
university_name,department_name,department_code,admission_quota,gender_requirement,requirement_chinese,requirement_english,requirement_math_a,requirement_math_b,requirement_social,requirement_natural,requirement_english_listening
國立台灣大學,電機工程學系,004102,63,無,均標,均標,前標,--,--,前標,--
國立台灣大學,資訊工程學系,004092,18,無,均標,均標,前標,--,--,前標,--
國立台灣大學,機械工程學系,004112,11,無,均標,頂標,前標,--,--,前標,A
```

**注意**:
- 使用 `--` 表示不要求
- 系統會自動將級距轉換為分數

---

## 🧪 測試範例

### 測試案例 1: 台大電機工程學系

**輸入數據**:
```json
{
  "university_name": "國立台灣大學",
  "department_name": "電機工程學系",
  "requirement_english": "均標",
  "score_english": null  // 系統會自動轉換
}
```

**預期結果**:
```json
{
  "score_english": 10,  // 均標 = 10 級分
  "minReadyScore": 80   // 50 + (10 * 3)
}
```

### 測試案例 2: 台大醫學系

**輸入數據**:
```json
{
  "university_name": "國立台灣大學",
  "department_name": "醫學系",
  "requirement_english": "頂標",
  "score_english": null
}
```

**預期結果**:
```json
{
  "score_english": 13,  // 頂標 = 13 級分
  "minReadyScore": 89   // 50 + (13 * 3)
}
```

---

## 🔧 技術架構

### 核心檔案

1. **級分轉換邏輯**: `/apps/web/lib/gsat-standards.ts`
2. **智慧 OCR API**: `/apps/web/app/api/admin/departments/ocr-smart/route.ts`
3. **匯入 API**: `/apps/web/app/api/internal/departments/import/route.ts`
4. **Dream School API**: `/apps/web/app/api/profile/dream-school-progress/route.ts`
5. **管理介面**: `/apps/web/app/admin/import-departments-smart/page.tsx`

### API 端點

| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/admin/departments/ocr-smart` | POST | 圖片 OCR 辨識 |
| `/api/internal/departments/import` | POST | 匯入校系資料 |
| `/api/profile/dream-school-progress` | GET | 查詢 Dream School 進度 |

---

## ❓ 常見問題

### Q1: OCR 辨識失敗怎麼辦?

**A**: 嘗試以下方法:
1. 確保圖片清晰,表格線條完整
2. 裁剪掉多餘的背景
3. 使用較高解析度的圖片
4. 或改用手動 CSV 匯入

### Q2: 可以一次匯入多個大學嗎?

**A**: 可以!每張圖片可以包含同一所大學的多個科系。如果要匯入多所大學,需要分次上傳圖片。

### Q3: 如果某個科系沒有數學A要求怎麼辦?

**A**: 在表格中用 `--` 表示,系統會自動將其轉換為 `null`,表示不要求。

### Q4: 英聽標準怎麼處理?

**A**: 英聽標準不是級分,而是等級 (A/B/C/F),系統會保持原格式儲存。

### Q5: 資料匯入後可以修改嗎?

**A**: 可以。再次上傳相同大學和科系的資料,系統會使用 `upsert` 自動更新。

---

## 🎉 完成!

現在您可以:
1. ✅ 上傳校系標準圖片
2. ✅ AI 自動辨識並轉換級距為級分
3. ✅ 一鍵匯入到資料庫
4. ✅ 使用者的 Dream School Ready Score 會自動使用實際標準計算

**需要幫助?** 請聯繫技術支援或查看詳細文檔。
