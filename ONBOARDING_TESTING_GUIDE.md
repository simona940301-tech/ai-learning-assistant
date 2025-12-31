# Onboarding 流程測試指南

## 🎉 實作完成項目

### ✅ 資料庫 Schema
- [x] `onboarding_sessions` 表
- [x] `onboarding_questions` 表
- [x] `scorecard_questions` 表
- [x] `onboarding_task_configs` 表
- [x] Helper Functions
- [x] RLS Policies

### ✅ 前端頁面 (STEP 1-6)
- [x] `/onboarding` - 登入頁 (已更新重定向)
- [x] `/onboarding/welcome` - STEP 1: 歡迎頁
- [x] `/onboarding/challenge` - STEP 2: 2-3題小測驗
- [x] `/onboarding/reward` - STEP 3: 完成頁面與獎勵
- [x] `/onboarding/goal-setup` - STEP 4: 選擇夢想學校與科系
- [x] `/onboarding/basic-info` - STEP 5: 基礎資料收集
- [x] `/onboarding/daily-mission` - STEP 6: 生成今日任務

### ✅ API Routes
- [x] `GET/POST/PUT /api/onboarding/session` - Session 管理
- [x] `GET /api/onboarding/questions` - 獲取題目
- [x] `POST /api/onboarding/complete` - 完成 onboarding

### ✅ 依賴安裝
- [x] `canvas-confetti` - 彩帶動畫
- [x] `@types/canvas-confetti` - TypeScript 類型定義

---

## 🧪 測試流程

### 準備工作

1. **確認資料庫已設置**:
   - SQL migration 已執行
   - 測試題目已插入
   - 大學科系資料已存在

2. **啟動開發伺服器**:
   ```bash
   cd "/Users/simonac/Desktop/moonshot idea"
   pnpm --filter web dev
   ```

3. **準備測試帳號**:
   - 新註冊一個測試帳號
   - 或使用現有帳號但重設 `onboarding_completed` 為 false

---

### 完整流程測試

#### 🔐 STEP 0: 登入
**URL**: http://localhost:3000/onboarding

**測試點**:
- [ ] Google OAuth 登入正常
- [ ] Email/Password 登入正常
- [ ] 登入後自動檢查 onboarding 狀態
- [ ] 未完成 onboarding 的用戶重定向到 `/onboarding/welcome`
- [ ] 已完成 onboarding 的用戶重定向到 `/play`

**預期結果**:
- 新用戶登入後自動導向 `/onboarding/welcome`

---

#### 🎉 STEP 1: 歡迎頁
**URL**: http://localhost:3000/onboarding/welcome

**測試點**:
- [ ] 頁面動畫正常顯示
- [ ] 「開始挑戰」按鈕可點擊
- [ ] 點擊後創建 `onboarding_sessions` 記錄
- [ ] 重定向到 `/onboarding/challenge`

**心理學檢查**:
- [ ] 文案強調「30秒」(Minimum Commitment)
- [ ] 只有一個 CTA 按鈕
- [ ] 視覺設計吸引人

**資料庫檢查**:
```sql
SELECT * FROM onboarding_sessions
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC LIMIT 1;
```
預期: `current_step = 1`, `status = 'in_progress'`

---

#### 📝 STEP 2: 2-3題小測驗
**URL**: http://localhost:3000/onboarding/challenge

**測試點**:
- [ ] 題目正確載入 (應該有 2-3 題)
- [ ] 第1題相對簡單 (difficulty = 1)
- [ ] 第2題稍有挑戰 (difficulty = 2)
- [ ] 第3題 (可選,difficulty = 3)
- [ ] 選擇答案後可確認
- [ ] 答對顯示綠色提示
- [ ] 答錯顯示柔和提示 (不是大紅叉)
- [ ] 進度條正確顯示
- [ ] 最後一題完成後重定向到 `/onboarding/reward`

**互動測試**:
1. 第1題: 選擇正確答案
2. 第2題: 刻意選錯答案
3. 第3題: 選擇正確答案

**資料庫檢查**:
```sql
SELECT challenge_score, challenge_results
FROM onboarding_sessions
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC LIMIT 1;
```
預期: `challenge_score = 2`, `challenge_results` 包含 3 個結果

---

#### 🎁 STEP 3: 獎勵頁面
**URL**: http://localhost:3000/onboarding/reward

**測試點**:
- [ ] 彩帶動畫自動觸發 (canvas-confetti)
- [ ] 顯示獎勵: XP、徽章、驚喜獎勵
- [ ] 獎勵數值根據分數正確計算
- [ ] 「下一步」按鈕可點擊
- [ ] 重定向到 `/onboarding/goal-setup`

**獎勵計算檢查**:
- 分數 3/3: XP = 50, 金幣 = 100
- 分數 2/3: XP = 40, 金幣 = 50
- 分數 1/3: XP = 30, 體力 = 2

**資料庫檢查**:
```sql
-- 檢查 profiles 是否獲得獎勵
SELECT user_wallet_balance, daily_energy_count
FROM profiles
WHERE id = '<your-user-id>';

-- 檢查是否獲得徽章
SELECT * FROM user_badges
WHERE user_id = '<your-user-id>'
AND badge_code = 'rookie_warrior';
```

---

#### 🎯 STEP 4: 選擇夢想學校與科系
**URL**: http://localhost:3000/onboarding/goal-setup

**測試點**:
- [ ] 「我還在摸索我的方向」按鈕顯眼
- [ ] 點擊「摸索方向」後顯示鼓勵訊息
- [ ] 學校列表正確載入
- [ ] 搜尋功能正常
- [ ] 選擇學校後顯示科系列表
- [ ] 科系搜尋功能正常
- [ ] 「下一步」按鈕在選擇後才啟用
- [ ] 重定向到 `/onboarding/basic-info`

**測試路徑**:

**路徑 1: 選擇目標**
1. 搜尋「台灣大學」
2. 選擇「國立台灣大學」
3. 搜尋「資訊」
4. 選擇「資訊工程學系」
5. 點擊「下一步」

**路徑 2: 摸索方向**
1. 點擊「我還在摸索我的方向」
2. 點擊「下一步」

**資料庫檢查**:
```sql
SELECT target_university, target_department, is_exploring
FROM onboarding_sessions
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC LIMIT 1;
```

---

#### 📊 STEP 5: 基礎資料收集
**URL**: http://localhost:3000/onboarding/basic-info

**測試點**:
- [ ] 年級選擇按鈕正常
- [ ] 滑桿可拖動 (1-15)
- [ ] 滑桿數值即時顯示
- [ ] 滑桿描述隨數值變化
- [ ] 「完成並生成你的今日任務」按鈕文案正確
- [ ] 選擇年級後才能繼續
- [ ] 重定向到 `/onboarding/daily-mission`

**測試數據**:
1. 選擇「高二」
2. 拖動滑桿到 7 (中等程度)
3. 點擊「完成並生成你的今日任務」

**資料庫檢查**:
```sql
SELECT current_grade, mock_exam_level
FROM onboarding_sessions
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC LIMIT 1;
```
預期: `current_grade = '高二'`, `mock_exam_level = 7`

---

#### ✨ STEP 6: 生成今日任務
**URL**: http://localhost:3000/onboarding/daily-mission

**測試點**:
- [ ] 顯示「正在分析」載入畫面
- [ ] 任務清單正確生成 (3-4個任務)
- [ ] 任務根據挑戰結果調整
- [ ] 獎勵預覽顯示 (+50 XP + 隨機獎勵)
- [ ] 「開始今天的任務」按鈕可點擊
- [ ] 點擊後完成 onboarding
- [ ] 重定向到 `/play`

**任務生成邏輯測試**:
- 分數低 (0-1): 應該多單字題,少閱讀題
- 分數高 (3): 應該有閱讀挑戰題

**資料庫檢查**:
```sql
-- 檢查 session 已完成
SELECT status, completed_at
FROM onboarding_sessions
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC LIMIT 1;

-- 檢查 profile 已更新
SELECT onboarding_completed
FROM profiles
WHERE id = '<your-user-id>';

-- 檢查任務配置已創建
SELECT * FROM onboarding_task_configs
WHERE user_id = '<your-user-id>';
```

預期結果:
- `onboarding_sessions.status = 'completed'`
- `profiles.onboarding_completed = true`
- `onboarding_task_configs` 記錄存在

---

## 🐛 常見問題排查

### 問題 1: 題目無法載入

**症狀**: Challenge 頁面顯示「準備題目中...」但一直不載入

**檢查**:
```sql
-- 檢查是否有啟用的題目
SELECT COUNT(*) FROM onboarding_questions WHERE is_active = true;

-- 應該至少有 9 題 (每個難度 3 題)
```

**解決方案**:
- 確認已執行 EXECUTE_ONBOARDING_MIGRATION.md 中的題目插入 SQL
- 檢查 RLS policies 是否正確

---

### 問題 2: 彩帶動畫不顯示

**症狀**: Reward 頁面沒有彩帶效果

**檢查**:
```bash
# 確認 canvas-confetti 已安裝
cat apps/web/package.json | grep canvas-confetti
```

**解決方案**:
```bash
pnpm --filter web add canvas-confetti
pnpm --filter web add -D @types/canvas-confetti
```

---

### 問題 3: 重定向失敗

**症狀**: 完成某個步驟後沒有自動跳轉

**檢查**:
- 開啟瀏覽器 Console,查看錯誤訊息
- 檢查 Supabase 資料庫連線
- 檢查 session ID 是否正確傳遞

**Debug 方法**:
```typescript
// 在頁面中加入 console.log
console.log('[OnboardingDebug] Session ID:', sessionId)
console.log('[OnboardingDebug] User:', user?.id)
```

---

### 問題 4: 獎勵未發放

**症狀**: 完成挑戰後帳戶餘額沒有增加

**檢查**:
```sql
-- 檢查 profiles 表
SELECT user_wallet_balance, daily_energy_count, level
FROM profiles
WHERE id = '<your-user-id>';

-- 檢查 user_badges 表
SELECT * FROM user_badges
WHERE user_id = '<your-user-id>';
```

**解決方案**:
- 檢查 `grantRewards` 函數是否正確執行
- 檢查 RLS policies 是否允許更新

---

## 📊 性能測試

### 頁面載入時間
每個頁面應該在 **< 2 秒**內載入完成

測試方法:
1. 打開瀏覽器 DevTools
2. Network tab
3. 重新載入頁面
4. 檢查 DOMContentLoaded 時間

---

### 動畫流暢度
所有動畫應該保持 **60 FPS**

測試方法:
1. 打開瀏覽器 DevTools
2. Performance tab
3. 錄製互動過程
4. 檢查 FPS 圖表

---

## ✅ 完整測試檢查清單

### 功能測試
- [ ] 新用戶可以完成整個 onboarding 流程
- [ ] 所有頁面重定向正確
- [ ] 資料正確儲存到資料庫
- [ ] 獎勵正確發放
- [ ] 任務配置正確生成
- [ ] 完成後 `onboarding_completed = true`

### UI/UX 測試
- [ ] 所有動畫流暢
- [ ] 響應式設計正常 (手機/平板/桌面)
- [ ] 深色模式正常
- [ ] 按鈕 hover 效果正常
- [ ] 載入狀態顯示正確
- [ ] 錯誤訊息友善

### 資料完整性
- [ ] `onboarding_sessions` 記錄完整
- [ ] `challenge_results` 正確記錄
- [ ] `onboarding_task_configs` 創建成功
- [ ] `profiles` 正確更新
- [ ] 獎勵 (XP, 金幣, 徽章) 正確發放

### 安全性測試
- [ ] 未登入用戶無法訪問頁面
- [ ] RLS 策略正確執行
- [ ] 用戶只能修改自己的資料
- [ ] API routes 有權限檢查

---

## 🚀 部署前檢查

- [ ] 所有測試通過
- [ ] 無 console 錯誤
- [ ] 無 TypeScript 錯誤
- [ ] 資料庫 migration 在 production 執行
- [ ] 環境變數正確設定
- [ ] Analytics 追蹤正常 (如果有)

---

## 📝 測試報告範本

```markdown
## Onboarding 流程測試報告

**測試日期**: 2025-11-17
**測試者**: [Your Name]
**環境**: Development

### 測試結果

#### STEP 1: 歡迎頁
- ✅ 動畫正常
- ✅ 重定向正確
- ⚠️ [如有問題,描述問題]

#### STEP 2: 小測驗
- ✅ 題目載入正常
- ✅ 答題互動正常
- ✅ 結果記錄正確

#### STEP 3: 獎勵頁面
- ✅ 彩帶動畫正常
- ✅ 獎勵顯示正確
- ✅ 獎勵發放成功

#### STEP 4: 目標設定
- ✅ 學校選擇正常
- ✅ 科系選擇正常
- ✅ 「摸索方向」選項正常

#### STEP 5: 基礎資料
- ✅ 年級選擇正常
- ✅ 滑桿功能正常

#### STEP 6: 任務生成
- ✅ 任務生成正常
- ✅ Onboarding 完成
- ✅ 重定向到 /play

### 問題清單
1. [描述問題]
2. [描述問題]

### 建議改進
1. [建議]
2. [建議]
```

---

**祝測試順利！如有任何問題,請參考 ONBOARDING_IMPLEMENTATION_PLAN.md** 🎉
