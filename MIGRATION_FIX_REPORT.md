# Migration 執行順序修復報告

## 問題診斷

### 錯誤訊息
```
ERROR: 42P01: relation "user_missions" does not exist
LINE 265: FROM user_missions
```

### 根本原因
Migration 文件名稱使用字母排序導致執行順序錯誤：

**錯誤順序（字母排序）：**
```
20251026_create_analytics_events.sql
20251026_create_missions_schema.sql    ← 創建 user_missions
20251026_create_packs_schema.sql
20251026_enhance_missions_v2.sql
20251026_optimize_sampler_performance.sql ← 引用 user_missions (第265行)
20251026_update_packs_schema_v2.sql
```

問題：`optimize_sampler_performance.sql` 在第 265 行創建了一個 VIEW，引用 `user_missions` 表，但因為字母排序，這個文件可能在 `create_missions_schema.sql` 之前執行。

## 解決方案

### 重新命名文件以確保正確執行順序

**修復後的順序：**
```
20251026_00_create_analytics_events.sql     ← 分析事件（獨立）
20251026_01_create_packs_schema.sql         ← 創建 packs, pack_questions, user_pack_installations
20251026_02_create_missions_schema.sql      ← 創建 missions, user_missions, mission_logs
20251026_03_enhance_missions_v2.sql         ← 增強 user_missions, pack_questions
20251026_04_update_packs_schema_v2.sql      ← 更新 packs (添加 source, visibility)
20251026_05_optimize_sampler_performance.sql ← 優化函數和 VIEW
```

## 表依賴關係圖

```
┌─────────────────────────────────────────────────────────────────┐
│ 01_create_packs_schema.sql                                       │
│ ┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│ │   packs      │  │ pack_chapters    │  │ pack_questions     │ │
│ └──────┬───────┘  └────────┬─────────┘  └──────┬─────────────┘ │
│        │                   │                    │                │
│        │        ┌──────────┴────────────────────┘                │
│        │        │                                                │
│        │  ┌─────▼──────────────────┐                            │
│        └─►│ user_pack_installations │                            │
│           └────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ REFERENCES
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 02_create_missions_schema.sql                                    │
│ ┌──────────────┐                                                 │
│ │   missions   │                                                 │
│ └──────┬───────┘                                                 │
│        │ REFERENCES (optional)                                   │
│        │                                                          │
│  ┌─────▼────────────┐      ┌──────────────────────┐            │
│  │  user_missions   │◄─────┤   mission_logs       │            │
│  └──────────────────┘      └──────────────────────┘            │
│                                                                  │
│  ┌────────────────────────────┐                                 │
│  │  user_question_history     │                                 │
│  └────────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ ALTER TABLE
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 03_enhance_missions_v2.sql                                       │
│ - ALTER user_missions (add window_date, answerable_until)       │
│ - ALTER pack_questions (add blacklist columns)                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ ALTER TABLE
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 04_update_packs_schema_v2.sql                                    │
│ - ALTER packs (add source, visibility, source_name, source_id)  │
│ - CREATE class_challenges table                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ CREATE VIEW / FUNCTIONS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 05_optimize_sampler_performance.sql                              │
│ - CREATE indexes                                                 │
│ - CREATE FUNCTION sample_mission_questions_optimized()          │
│ - CREATE VIEW sampler_performance_metrics                       │
│   (引用 user_missions.metadata)  ← LINE 265                     │
└─────────────────────────────────────────────────────────────────┘
```

## 關鍵依賴點

### 1. pack_questions 表
- **創建於**: `01_create_packs_schema.sql`
- **被引用於**:
  - `02_create_missions_schema.sql` - 函數 `sample_pack_questions()`
  - `05_optimize_sampler_performance.sql` - 函數 `sample_mission_questions_optimized()`

### 2. user_missions 表
- **創建於**: `02_create_missions_schema.sql`
- **被修改於**: `03_enhance_missions_v2.sql`
- **被引用於**: `05_optimize_sampler_performance.sql` - VIEW `sampler_performance_metrics`

### 3. packs 表
- **創建於**: `01_create_packs_schema.sql`
- **被修改於**: `04_update_packs_schema_v2.sql`
- **被引用於**: 所有後續 migrations

## 驗證檢查清單

- [x] 文件名稱使用數字前綴 (00-05)
- [x] 表創建順序正確
- [x] ALTER TABLE 在 CREATE TABLE 之後
- [x] VIEW/FUNCTION 在所有表創建後
- [x] 所有 REFERENCES 指向已存在的表

## 後續步驟

1. **本地測試**:
   ```bash
   # 重置數據庫
   supabase db reset

   # 或手動執行 migrations
   psql -d your_db -f supabase/migrations/20251026_01_create_packs_schema.sql
   psql -d your_db -f supabase/migrations/20251026_02_create_missions_schema.sql
   # ... 等等
   ```

2. **生產部署**:
   - 確認 Supabase 會按照新的文件名順序執行
   - 如果已經部署過舊版本，需要創建新的 migration 來修復

3. **防止未來問題**:
   - 使用序號前綴命名所有 migrations
   - 在 PR 審查時檢查依賴關係
   - 建議添加 pre-commit hook 驗證 migration 順序

## 命名規範建議

```
YYYYMMDD_NN_description.sql
```

其中：
- `YYYYMMDD`: 日期
- `NN`: 兩位數序號 (00-99)
- `description`: 簡短描述

範例：
```
20251026_00_create_analytics_events.sql
20251026_01_create_packs_schema.sql
20251026_02_create_missions_schema.sql
```
