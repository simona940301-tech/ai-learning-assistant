# 📊 PLMS Database Schema Overview

> **版本**: v2.0 (T10.2 Consolidation)  
> **最後更新**: 2025-01  
> **主要 Schema 文件**: `apps/web/supabase/schema.sql`

---

## 快速導覽

### 📂 SQL 來源目錄

| 路徑 | 檔案數 | 說明 |
|------|--------|------|
| `apps/web/supabase/schema.sql` | 1 | ⭐ **主要 Schema 藍圖** (完整定義) |
| `apps/web/supabase/migrations/` | 15 | Supabase migrations |
| `supabase/migrations/` | 34 | 完整 migrations (Packs, Missions, Progression 等) |
| `apps/web/db/sql/` | 41 | 完整 SQL migrations |
| `apps/web/db/migrations/` | 10 | 額外 migrations (Question Sets, Elite RAG 等) |
| `db/sql/` | 4 | 核心 Concepts/Solve schema |

### 📊 Schema 總覽

| 指標 | 數值 |
|------|------|
| **總表數量** | 60 張 |
| **Domain 數量** | 10 個 |
| **使用 pgvector** | 是 (embedding vector(1536)) |

---

## Domain 架構

### 1. Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for RAG
```

### 2. User & Profile Domain (8 tables)

| Table | 用途 | 關鍵欄位 |
|-------|------|----------|
| `profiles` | 用戶核心 | id, username, xp, coins, level, streak, chick_*, onboarding_* |
| `follows` | 社群追蹤 | follower_id, following_id |
| `user_badges` | 用戶徽章 | user_id, badge_code, awarded_at |
| `user_achievements` | 用戶成就 | user_id, achievement_code, progress |
| `battle_progression_state` | 對戰進度 | xp_multiplier, daily_streak_count |
| `battle_badge_definitions` | 徽章定義 | code, name, description, rarity |
| `battle_achievement_definitions` | 成就定義 | code, reward_xp, reward_gold |
| `transactions` | 虛擬貨幣交易 | amount, transaction_type, status |

### 3. Questions & Packs Domain (13 tables)

| Table | 用途 | 關鍵欄位 |
|-------|------|----------|
| **`packs`** | 題包 | title, subject, skill, grade, status |
| `pack_chapters` | 題包章節 | pack_id, title, order |
| **`pack_questions`** | 題目 | stem, choices, answer, explanation, difficulty |
| `user_pack_installations` | 用戶安裝 | user_id, pack_id, installed_at |
| **`seed_questions`** | 官方題庫 | source, question_text, correct_answer, knowledge_tags |
| `question_explanations` | 題目詳解 | question_id, explanation_text |
| **`ugc_questions`** | UGC 題目 | designer_id, question_text, review_status |
| **`error_book`** | 錯題本 | user_id, question_id, status, last_attempted_at |
| `user_answers` | 答題記錄 | user_id, question_id, is_correct |
| `question_sets` | 題本集合 | title, question_ids, subject |
| `user_question_sets` | 用戶下載題本 | user_id, set_id, progress_data |
| `question_set_reviews` | 題本評論 | set_id, rating, review_text |

### 4. Battle & Progression Domain (6 tables)

| Table | 用途 | 關鍵欄位 |
|-------|------|----------|
| **`battle_events`** | 對戰事件 (Rust) | match_id, question_id_array, is_correct_array, final_scores |
| `match_history` | 對戰歷史 | player1_id, player2_id, winner_id, scores |
| `match_queue` | 匹配隊列 | user_id, match_type, status |
| `contract_escrows` | 合約鎖定 | amount, status, contract_type |
| `battle_chests` | 寶箱系統 | chest_type, status, rewards |
| `battle_streak_milestones` | 連續登入獎勵 | milestone_days, reward_* |

### 5. RAG & Files Domain (7 tables)

| Table | 用途 | 關鍵欄位 |
|-------|------|----------|
| **`files`** | 上傳檔案 | storage_path, ocr_status, embed_status |
| `file_pages` | OCR 結果 | file_id, page_no, text |
| **`doc_chunks`** | 向量 chunks | content, embedding vector(1536), anchor |
| `citations` | 引用標記 | answer_id, file_id, page_no |
| `rag_documents` | RAG 索引 | filename, summary, keywords, status |
| `file_analysis` | Elite RAG 分析 | quick_summary, exam_predictions |
| `exam_question_bank` | AI 生成考題 | question_text, correct_answer, confidence_score |

### 6. Backpack & Notebook Domain (4 tables)

| Table | 用途 | 狀態 |
|-------|------|------|
| `backpack_items` | 書包項目 | ⚠️ LEGACY - 待整合 |
| `backpack_notes` | AI 筆記 | ⚠️ LEGACY - 待整合 |
| **`notebook_entries`** | 新版筆記本 | ✅ 主要使用 |
| `ai_interactions` | AI 互動記錄 | - |

### 7. Missions & Daily Tasks Domain (5 tables)

| Table | 用途 | 關鍵欄位 |
|-------|------|----------|
| **`missions`** | 任務模板 | target_skill, num_questions, mission_type |
| **`user_missions`** | 用戶任務實例 | question_ids, status, correct_count |
| `mission_logs` | 任務事件日誌 | event_type, payload |
| `user_question_history` | 題目去重 | question_id, shown_at, context |
| **`daily_missions`** | 每日任務 | missions jsonb, all_completed |

### 8. Onboarding Domain (4 tables)

| Table | 用途 | 關鍵欄位 |
|-------|------|----------|
| `onboarding_sessions` | 新手引導 session | current_step, challenge_score, status |
| `onboarding_questions` | 挑戰題庫 | question_text, difficulty_level |
| `scorecard_questions` | 學習分數卡 | section, response_type |
| `onboarding_task_configs` | 個人化配置 | weak_areas, daily_task_size |

### 9. Community & Store Domain (8 tables)

| Table | 用途 | 關鍵欄位 |
|-------|------|----------|
| `posts` | 社群貼文 | content, images, likes |
| `post_likes` | 貼文按讚 | post_id, user_id |
| `comments` | 貼文留言 | post_id, content |
| `store_items` | 商店項目 | title, price, is_free |
| `user_purchases` | 購買記錄 | user_id, item_id |
| `tasks` | 任務 | ⚠️ LEGACY - 待整合 |
| `class_challenges` | 班級挑戰 | pack_id, deadline, status |
| `class_challenge_participants` | 挑戰參與者 | score, rank |

### 10. Chick, Analytics & Concepts Domain (6 tables)

| Table | 用途 | 關鍵欄位 |
|-------|------|----------|
| `chick_messages` | 小雞訊息 | type, text, state_snapshot |
| `analytics_events` | 分析事件 | event_name, payload |
| `concepts` | 概念/考點 | name, definition, embedding vector(1536) |
| `concept_edges` | 概念關聯 | src_id, dst_id, relation |
| `solve_sessions` | 解題 session | prompt, source_meta |
| `solve_options` | 解題選項 | label, is_answer |

---

## 核心表關係圖

```
profiles
    ├── follows (follower_id, following_id)
    ├── user_badges
    ├── user_achievements
    ├── battle_progression_state
    │
    ├── user_pack_installations → packs → pack_chapters → pack_questions
    ├── error_book → pack_questions
    ├── user_answers → pack_questions
    │
    ├── battle_events
    ├── match_history
    ├── transactions
    ├── battle_chests
    │
    ├── files → file_pages → doc_chunks
    │        → file_analysis → exam_question_bank
    │        → citations
    ├── rag_documents
    ├── notebook_entries
    │
    ├── user_missions → missions
    ├── mission_logs
    ├── daily_missions
    │
    ├── onboarding_sessions
    ├── onboarding_task_configs
    │
    ├── posts → post_likes, comments
    └── chick_messages
```

---

## 重要的 pgvector 表

這些表使用 `vector(1536)` 類型進行向量相似度搜索：

| Table | Column | Index | 用途 |
|-------|--------|-------|------|
| `doc_chunks` | embedding | IVFFlat (lists=100) | RAG 文件搜索 |
| `concepts` | embedding | IVFFlat (lists=100) | 概念匹配 |

**相關函數**：
- `search_doc_chunks(query_embedding, file_id_filter, match_threshold, match_count)`
- `match_concepts(query_embedding, match_threshold, match_count)`

---

## LEGACY 表 (待整合)

以下表標記為 LEGACY，計劃在 Roadmap P1 中整合：

| Table | 替代方案 | 狀態 |
|-------|----------|------|
| `backpack_items` | 整合到 `files` + `notebook_entries` | 待處理 |
| `backpack_notes` | 整合到 `notebook_entries` | 待處理 |
| `tasks` | 整合到 `missions` + `daily_missions` | 待處理 |

---

## 常見查詢範例

### 取得用戶的錯題本題目
```sql
SELECT pq.stem, pq.choices, pq.answer, eb.last_attempted_at
FROM error_book eb
JOIN pack_questions pq ON pq.id = eb.question_id
WHERE eb.user_id = :user_id AND eb.status = 'active'
ORDER BY eb.last_attempted_at ASC;
```

### 搜索相似文件 chunks
```sql
SELECT * FROM search_doc_chunks(
  :query_embedding,  -- vector(1536)
  :file_id,          -- UUID or NULL
  0.7,               -- match_threshold
  10                 -- match_count
);
```

### 取得用戶今日任務
```sql
SELECT * FROM daily_missions
WHERE user_id = :user_id 
  AND mission_date = CURRENT_DATE;
```

### 取得用戶已安裝的題包
```sql
SELECT p.* FROM packs p
JOIN user_pack_installations upi ON upi.pack_id = p.id
WHERE upi.user_id = :user_id AND upi.status = 'active';
```

---

## 維護指南

### 新增表時
1. 更新 `apps/web/supabase/schema.sql`
2. 在正確的 Domain 區塊中新增
3. 更新本文件的表清單
4. 確保 RLS policies 已設定

### 修改表結構時
1. 創建 migration 檔案到 `supabase/migrations/`
2. 同步更新 `schema.sql`
3. 記錄變更原因

### 檢查 Schema 一致性
```bash
# 比較 schema.sql 與實際資料庫
# (需要 Supabase CLI)
supabase db diff
```

---

## 相關文件

- **完整 Schema**: `apps/web/supabase/schema.sql`
- **Migration 指南**: `apps/web/db/sql/SQL_MIGRATION_GUIDE.md`
- **架構設計**: `ARCHITECTURE.md`
- **技術 Roadmap**: `ENGINEERING_ROADMAP_Q1_2025.md`

---

**文件完成日期**: 2025-01  
**下一步**: 執行 Roadmap P1 - 統一資料模型

