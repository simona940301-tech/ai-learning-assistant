# 🚀 Onboarding 流程部署指南

## ✅ 檢查清單總覽

- [ ] 1. 執行資料庫 Migration
- [ ] 2. 插入種子數據
- [ ] 3. 驗證 API Routes
- [ ] 4. 測試完整流程
- [ ] 5. 部署到 Production

---

## 📦 1. 資料庫 Migration

### **方法 A: 使用 Supabase Dashboard**（推薦）

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 進入 **SQL Editor**
4. 複製並執行 `apps/web/db/sql/021_onboarding_flow_safe.sql`
5. 檢查執行結果

### **方法 B: 使用 psql CLI**

```bash
# 設定環境變數
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# 執行 migration
psql $SUPABASE_DB_URL -f apps/web/db/sql/021_onboarding_flow_safe.sql

# 檢查是否成功
psql $SUPABASE_DB_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'onboarding%';"
```

### **預期輸出**

```
         tablename
---------------------------
 onboarding_sessions
 onboarding_questions
 onboarding_task_configs
(3 rows)
```

---

## 🌱 2. 插入種子數據

### **執行種子腳本**

#### 使用 Supabase Dashboard

1. 進入 **SQL Editor**
2. 複製並執行 `apps/web/db/sql/021_onboarding_seed_questions.sql`
3. 檢查插入結果

#### 使用 psql CLI

```bash
psql $SUPABASE_DB_URL -f apps/web/db/sql/021_onboarding_seed_questions.sql
```

### **驗證種子數據**

```sql
-- 檢查題目數量
SELECT
  difficulty_level,
  COUNT(*) as question_count
FROM onboarding_questions
WHERE is_active = true AND subject = 'english'
GROUP BY difficulty_level
ORDER BY difficulty_level;

-- 預期結果:
-- difficulty_level | question_count
-- -----------------+---------------
--                1 |             5
--                2 |             5
--                3 |             5
```

---

## 🔧 3. 驗證 API Routes

### **測試 API 端點**

```bash
# 設定基礎 URL
BASE_URL="http://localhost:3000"  # 或你的 production URL

# 1. 測試獲取題目 (需要先啟動 dev server)
curl "$BASE_URL/api/onboarding/questions?count=3"

# 預期回應:
# {
#   "data": [
#     {
#       "id": "...",
#       "question_text": "...",
#       "option_a": "...",
#       "option_b": "...",
#       "option_c": "...",
#       "option_d": "...",
#       "correct_answer": "A",
#       "difficulty_level": 1
#     },
#     ...
#   ]
# }
```

### **檢查 RLS Policies**

```sql
-- 查看所有 onboarding 相關的 policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename LIKE 'onboarding%'
ORDER BY tablename, cmd;

-- 預期看到:
-- onboarding_sessions: SELECT, INSERT, UPDATE (users)
-- onboarding_questions: SELECT (all), ALL (admin)
-- onboarding_task_configs: SELECT, ALL (users)
```

---

## 🧪 4. 端到端測試

### **測試流程**

```bash
# 1. 啟動 dev server
cd apps/web
pnpm dev

# 2. 在瀏覽器中測試
# 開啟 http://localhost:3000/onboarding
```

### **測試檢查清單**

#### Phase 1: 登入/註冊
- [ ] 使用 Google OAuth 登入
- [ ] 使用 Email/密碼註冊
- [ ] 檢查是否導向 `/onboarding/welcome`

#### Phase 2: 歡迎頁
- [ ] 顯示「開始 3 題訓練」
- [ ] 點擊「開始」按鈕
- [ ] 檢查是否創建 `onboarding_sessions` 記錄
- [ ] 導向 `/onboarding/challenge`

#### Phase 3: 訓練戰
- [ ] 顯示 3 題題目
- [ ] 顯示 AI 對手狀態
- [ ] 可以正常答題
- [ ] 記錄答題結果到 `challenge_results`
- [ ] 完成後導向 `/onboarding/reward`

#### Phase 4: 獎勵頁
- [ ] 顯示彩帶動畫
- [ ] 顯示 XP 獎勵
- [ ] 顯示徽章
- [ ] 顯示驚喜獎勵
- [ ] 檢查 `profiles` 表是否更新 XP/金幣
- [ ] 導向 `/onboarding/goal-setup`

#### Phase 5: 目標設定
- [ ] 選擇考試年
- [ ] 選擇優先科目
- [ ] 搜尋並選擇大學
- [ ] 搜尋並選擇科系
- [ ] 測試「我還在探索」選項
- [ ] 導向 `/onboarding/basic-info`

#### Phase 6: 基本資料
- [ ] 選擇年級
- [ ] 調整模考程度滑桿
- [ ] 檢查描述文字更新
- [ ] 導向 `/onboarding/daily-mission`

#### Phase 7: 任務生成
- [ ] 顯示個人化任務清單
- [ ] 顯示獎勵預覽
- [ ] 檢查 `onboarding_task_configs` 是否創建
- [ ] 檢查 `profiles.onboarding_completed = true`
- [ ] 導向 `/play`

#### Phase 8: 進入遊戲
- [ ] 顯示遊戲模式選擇
- [ ] 可以開始第一場遊戲
- [ ] 不再顯示 onboarding 流程

---

## 🗄️ 5. 資料庫驗證查詢

### **檢查流程完整性**

```sql
-- 查看最近的 onboarding sessions
SELECT
  id,
  user_id,
  current_step,
  status,
  challenge_score,
  target_university,
  target_department,
  created_at,
  completed_at
FROM onboarding_sessions
ORDER BY created_at DESC
LIMIT 10;

-- 查看任務配置
SELECT
  user_id,
  weak_areas,
  daily_task_size,
  generated_from_challenge,
  created_at
FROM onboarding_task_configs
ORDER BY created_at DESC
LIMIT 10;

-- 查看已完成 onboarding 的用戶
SELECT
  id,
  email,
  onboarding_completed,
  target_university,
  target_department,
  created_at
FROM profiles
WHERE onboarding_completed = true
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚨 6. 常見問題排查

### **問題 1: Migration 失敗 - Index 已存在**

```bash
# 錯誤訊息:
# ERROR: relation "idx_onboarding_sessions_user" already exists

# 解決方法:
# 使用 021_onboarding_flow_safe.sql (已包含 IF NOT EXISTS 檢查)
```

### **問題 2: API 返回 401 Unauthorized**

```bash
# 檢查項目:
1. 確認用戶已登入
2. 檢查 Supabase Auth token
3. 驗證 RLS policies 是否正確

# Debug:
# 打開瀏覽器 DevTools → Network → 檢查 Request Headers
```

### **問題 3: 題目獲取失敗**

```sql
-- 檢查是否有 active 題目
SELECT COUNT(*) FROM onboarding_questions WHERE is_active = true;

-- 如果返回 0，重新執行種子腳本:
psql $SUPABASE_DB_URL -f apps/web/db/sql/021_onboarding_seed_questions.sql
```

### **問題 4: TypeScript 錯誤**

```bash
# 執行類型檢查
cd apps/web
npx tsc --noEmit

# 如果有錯誤，檢查是否已修復:
# - createServerClient → createClient
# - .onConflict([...]) → upsert(..., { onConflict })
```

---

## 📊 7. 監控與分析

### **關鍵指標**

```sql
-- Onboarding 完成率
SELECT
  COUNT(DISTINCT user_id) FILTER (WHERE status = 'completed') * 100.0 /
  COUNT(DISTINCT user_id) AS completion_rate_percent
FROM onboarding_sessions;

-- 平均完成時間
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60) AS avg_minutes
FROM onboarding_sessions
WHERE status = 'completed';

-- 各步驟流失率
SELECT
  current_step,
  COUNT(*) AS users_at_step,
  COUNT(*) FILTER (WHERE status = 'abandoned') AS abandoned
FROM onboarding_sessions
GROUP BY current_step
ORDER BY current_step;

-- 題目難度分析
SELECT
  difficulty_level,
  total_shown,
  total_correct,
  ROUND(correct_rate::numeric, 2) AS correct_rate
FROM onboarding_questions
WHERE total_shown > 0
ORDER BY difficulty_level;
```

---

## 🎯 8. Production 部署步驟

### **Pre-deployment Checklist**

- [ ] 所有 TypeScript 錯誤已修復
- [ ] 本地端到端測試通過
- [ ] Migration scripts 已測試
- [ ] 種子數據已準備
- [ ] 環境變數已設定

### **部署流程**

```bash
# 1. 在 Staging 環境測試
# 執行 migration
psql $STAGING_DB_URL -f apps/web/db/sql/021_onboarding_flow_safe.sql
psql $STAGING_DB_URL -f apps/web/db/sql/021_onboarding_seed_questions.sql

# 2. 部署前端到 Staging
vercel --env=staging

# 3. 在 Staging 測試完整流程

# 4. 部署到 Production
# 執行 migration
psql $PRODUCTION_DB_URL -f apps/web/db/sql/021_onboarding_flow_safe.sql
psql $PRODUCTION_DB_URL -f apps/web/db/sql/021_onboarding_seed_questions.sql

# 5. 部署前端到 Production
vercel --prod

# 6. 驗證 Production
curl https://your-domain.com/api/onboarding/questions?count=3
```

---

## 📝 9. Rollback 計劃

### **如果需要回滾**

```sql
-- 1. 停用 RLS policies (暫時)
ALTER TABLE onboarding_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_task_configs DISABLE ROW LEVEL SECURITY;

-- 2. 刪除 triggers
DROP TRIGGER IF EXISTS update_question_stats_on_completion ON onboarding_sessions;

-- 3. 刪除 functions
DROP FUNCTION IF EXISTS complete_onboarding(UUID, UUID);
DROP FUNCTION IF EXISTS generate_task_config_from_onboarding(UUID, UUID);
DROP FUNCTION IF EXISTS get_onboarding_question(INTEGER, TEXT, UUID[]);

-- 4. 刪除 tables (謹慎!)
DROP TABLE IF EXISTS onboarding_task_configs;
DROP TABLE IF EXISTS scorecard_questions;
DROP TABLE IF EXISTS onboarding_questions;
DROP TABLE IF EXISTS onboarding_sessions;
```

---

## ✅ 10. 部署完成確認

### **最終檢查清單**

- [ ] Migration 成功執行
- [ ] 種子數據已插入
- [ ] API Routes 正常運作
- [ ] RLS Policies 生效
- [ ] 測試帳號可完成流程
- [ ] 監控指標正常
- [ ] 錯誤日誌無異常

---

## 🎉 完成！

Onboarding 流程已成功部署！

**下一步**:
1. 監控用戶完成率
2. 收集用戶反饋
3. 分析流失率
4. 持續優化體驗

**聯絡方式**:
- 技術問題: [GitHub Issues](https://github.com/your-repo/issues)
- 產品反饋: product@yourcompany.com

---

**文檔版本**: v1.0
**最後更新**: 2025-11-22
**維護者**: PLMS Development Team
