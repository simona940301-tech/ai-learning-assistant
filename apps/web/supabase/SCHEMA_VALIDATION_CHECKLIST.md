# ✅ Schema 驗證清單 (T10.5)

> 用於驗證 `schema.sql` 與實際 Supabase 資料庫的一致性

---

## 🔍 驗證步驟

### Step 1: 登入 Supabase Dashboard
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇正確的專案
3. 進入 **Table Editor** 頁面

### Step 2: 核對表清單

**預期表數量：60 張**

勾選已驗證的表：

#### User & Profile Domain (8)
- [ ] `profiles`
- [ ] `follows`
- [ ] `user_badges`
- [ ] `user_achievements`
- [ ] `battle_progression_state`
- [ ] `battle_badge_definitions`
- [ ] `battle_achievement_definitions`
- [ ] `transactions`

#### Questions & Packs Domain (13 - now complete with question_sets)
- [ ] `packs`
- [ ] `pack_chapters`
- [ ] `pack_questions`
- [ ] `user_pack_installations`
- [ ] `seed_questions`
- [ ] `question_explanations`
- [ ] `ugc_questions`
- [ ] `error_book`
- [ ] `user_answers`
- [ ] `question_sets` ✅ (added in T10.2 update)
- [ ] `user_question_sets` ✅ (added in T10.2 update)
- [ ] `question_set_reviews` ✅ (added in T10.2 update)

#### Battle & Progression Domain (6)
- [ ] `battle_events`
- [ ] `match_history`
- [ ] `match_queue`
- [ ] `contract_escrows`
- [ ] `battle_chests`
- [ ] `battle_streak_milestones`

#### RAG & Files Domain (7)
- [ ] `files`
- [ ] `file_pages`
- [ ] `doc_chunks`
- [ ] `citations`
- [ ] `rag_documents`
- [ ] `file_analysis`
- [ ] `exam_question_bank`

#### Backpack & Notebook Domain (5)
- [ ] `backpack_items` (LEGACY)
- [ ] `backpack_notes` (LEGACY)
- [ ] `notebook_entries`
- [ ] `ai_interactions`

#### Missions Domain (5)
- [ ] `missions`
- [ ] `user_missions`
- [ ] `mission_logs`
- [ ] `user_question_history`
- [ ] `daily_missions`

#### Onboarding Domain (4)
- [ ] `onboarding_sessions`
- [ ] `onboarding_questions`
- [ ] `scorecard_questions`
- [ ] `onboarding_task_configs`

#### Community & Store Domain (8)
- [ ] `posts`
- [ ] `post_likes`
- [ ] `comments`
- [ ] `store_items`
- [ ] `user_purchases`
- [ ] `tasks` (LEGACY)
- [ ] `class_challenges`
- [ ] `class_challenge_participants`

#### Chick, Analytics & Concepts Domain (6)
- [ ] `chick_messages`
- [ ] `analytics_events`
- [ ] `concepts`
- [ ] `concept_edges`
- [ ] `solve_sessions`
- [ ] `solve_options`

---

### Step 3: 核對 Extensions

在 **Database** → **Extensions** 頁面確認：

- [ ] `uuid-ossp` 已啟用
- [ ] `vector` (pgvector) 已啟用

---

### Step 4: 核對關鍵欄位

抽查以下表的欄位：

#### `profiles` 表
- [ ] 有 `chick_iq`, `chick_fatigue`, `chick_emotion_state` 欄位
- [ ] 有 `onboarding_completed`, `target_university` 欄位
- [ ] 有 `focus_stats` (JSONB) 欄位

#### `pack_questions` 表
- [ ] 有 `stem`, `choices`, `answer`, `explanation` 欄位
- [ ] 有 `is_blacklisted`, `is_ugc` 欄位

#### `doc_chunks` 表
- [ ] 有 `embedding` 欄位 (type: vector(1536))
- [ ] 有 IVFFlat 索引

#### `notebook_entries` 表
- [ ] 有 `source_type`, `subject` 欄位
- [ ] 有 `tags` (TEXT[]) 欄位

---

### Step 5: 核對 RLS 狀態

在每個表的 **Policies** 標籤確認：

- [ ] 所有表都已啟用 RLS (`Row Level Security: Enabled`)
- [ ] 每個表都有適當的 policy

---

## 📋 發現的差異記錄

| 表/欄位 | 預期 | 實際 | 狀態 | 解決方案 |
|---------|------|------|------|----------|
| _範例_ | `profiles.focus_stats` | 不存在 | ⚠️ | 執行 migration |
| | | | | |
| | | | | |
| | | | | |

---

## 🔧 修復差異

如果發現差異，請：

1. **缺少的表**：檢查對應的 migration 是否已執行
2. **缺少的欄位**：執行 `ALTER TABLE` 或對應的 migration
3. **記錄差異**：在上方表格中記錄

### 常用 SQL 檢查

```sql
-- 列出所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 檢查特定表的欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 檢查是否有 pgvector
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 檢查 RLS 狀態
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## ✅ 驗證完成

- [ ] 所有 62 張表都存在
- [ ] Extensions 都已啟用
- [ ] 關鍵欄位驗證通過
- [ ] RLS 都已啟用
- [ ] 差異已記錄/修復

**驗證者**: _______________  
**日期**: _______________  
**狀態**: ⬜ 通過 / ⬜ 有差異需處理

---

**下一步**：如果驗證通過，更新 `ENGINEERING_ROADMAP_Q1_2025.md` 標記 T10.5 完成






































