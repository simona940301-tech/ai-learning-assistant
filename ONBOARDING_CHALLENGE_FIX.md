# Onboarding Challenge 題目載入修復報告

## 問題描述

用戶在手機上實測 onboarding challenge（新手挑戰）功能時，題目無法載入，顯示失敗。

## 根本原因

Onboarding challenge 系統嘗試從 `onboarding_questions` 表獲取題目，但該表並不存在於 production 資料庫中。實際上，所有對戰和練習題目都存儲在 `seed_questions` 表中。

## 修復方案

### 1. API 端點修復

修改 [apps/web/app/api/onboarding/questions/route.ts](apps/web/app/api/onboarding/questions/route.ts) 以使用 `seed_questions` 表：

**主要變更：**
- ✅ 從 `onboarding_questions` 改為 `seed_questions` 表
- ✅ 使用正確的欄位名稱：
  - `difficulty_level` (而非 `difficulty`)
  - `is_active` (而非 `deleted_at`)
- ✅ 保持與前端的相容性，返回 `difficulty_level` 欄位

### 2. 資料庫驗證

測試結果顯示：
- ✅ `seed_questions` 表包含 10+ 英文題目
- ✅ 難度分佈：
  - Difficulty 1: 14 題
  - Difficulty 2: 7 題
- ✅ 所有題目都有必要欄位（question_text, option_a/b/c/d, correct_answer）

### 3. 前端相容性

前端代碼 ([apps/web/app/onboarding/challenge/page.tsx](apps/web/app/onboarding/challenge/page.tsx:227)) 已經正確處理 API 返回的格式：
- 接收 `ApiQuestion` 類型（snake_case）
- 轉換為前端 `Question` 類型（camelCase）
- 正確處理 `difficulty_level` 欄位

## 測試結果

運行 `npx tsx test-onboarding-api.ts` 測試腳本：

```
✅ Found 10 seed_questions in database
✅ Found 21 questions with difficulty 1-3
✅ Successfully simulated API flow for 7 questions
✅ All questions have required fields
```

## 修復的檔案

1. [apps/web/app/api/onboarding/questions/route.ts](apps/web/app/api/onboarding/questions/route.ts)
   - 切換到 `seed_questions` 表
   - 修正欄位名稱
   - 添加錯誤處理

2. [test-onboarding-api.ts](test-onboarding-api.ts) (新增)
   - 驗證 API 修復的測試腳本

## 部署步驟

1. 確認修改已提交
2. 部署到 production
3. 在手機上測試 onboarding challenge 流程

## 預期結果

- ✅ 題目能正常載入
- ✅ 顯示 7 題學測英文題目
- ✅ AI 教練對戰功能正常運作
- ✅ 答題結果正確記錄

## 注意事項

目前 `seed_questions` 表中英文題目數量有限（約 21 題 difficulty 1-3）。建議：
- 未來可考慮增加更多題目
- 或實作題目池擴充機制
- 目前數量足夠支援 onboarding 流程（需要 7 題）

## 相關檔案

- API: [apps/web/app/api/onboarding/questions/route.ts](apps/web/app/api/onboarding/questions/route.ts)
- 前端: [apps/web/app/onboarding/challenge/page.tsx](apps/web/app/onboarding/challenge/page.tsx)
- Schema: [apps/web/supabase/schema.sql](apps/web/supabase/schema.sql#L233-L273)
- 測試: [test-onboarding-api.ts](test-onboarding-api.ts)
