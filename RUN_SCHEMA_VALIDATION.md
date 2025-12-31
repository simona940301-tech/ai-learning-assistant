# 🔍 執行 Schema 驗證指南

> **目的**: 驗證 Supabase 資料庫中是否有完整的 60 張表
> **預計時間**: 5 分鐘

---

## 快速執行步驟

### 1. 登入 Supabase Dashboard

1. 前往 https://supabase.com/dashboard
2. 選擇你的專案
3. 點擊左側選單的 **SQL Editor**

### 2. 執行驗證腳本

1. 複製 `schema_validation_check.sql` 的所有內容
2. 貼到 SQL Editor 中
3. 點擊 **Run** 執行

### 3. 檢查驗證結果

腳本會輸出以下檢查結果：

#### ✅ 表數檢查
```
check_type         | expected_count | actual_count | status
總表數檢查         | 60             | 60           | ✅ 表數匹配
```

#### ✅ 詳細表存在檢查
每張表都會顯示 `✅ 存在` 或 `❌ 缺失`

#### ✅ Extensions 檢查
```
extension_name | status
uuid-ossp      | ✅ 已啟用
vector         | ✅ 已啟用
```

#### ✅ RLS 檢查
```
check_type | total_tables | rls_enabled_count | status
RLS 檢查   | 60           | 60                | ✅ 所有表都啟用 RLS
```

#### ✅ 關鍵欄位檢查
- `profiles` 表的 `chick_*`, `target_university`, `focus_stats` 欄位
- `pack_questions` 表的 `stem`, `choices`, `answer`, `explanation` 欄位
- `doc_chunks` 表的 `embedding vector(1536)` 欄位
- `notebook_entries` 表的 `source_type`, `subject`, `tags` 欄位

---

## 預期結果

### 全部通過 ✅
如果所有檢查都顯示 ✅，恭喜！Schema 驗證完成：
- 60 張表全部存在
- Extensions 已啟用
- RLS 已啟用
- 關鍵欄位正確

**下一步**: 可以開始 M2-P4 了！

### 發現差異 ⚠️
如果發現缺失的表或欄位：

1. **記錄差異**
   - 將缺失的表名記錄到 `SCHEMA_VALIDATION_CHECKLIST.md`
   - 在「發現的差異記錄」表格中填寫

2. **執行 Migration**
   - 找到對應的 migration 檔案
   - 在 Supabase SQL Editor 中執行
   - 重新運行驗證腳本

3. **尋求協助**
   - 將驗證結果貼到團隊頻道
   - 或在 GitHub Issue 中描述問題

---

## 常見問題

### Q1: 缺少某些表怎麼辦？

**A**: 檢查對應的 migration 檔案是否已執行：

```sql
-- 查看已執行的 migrations
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC;
```

如果缺少 migration，找到對應的 `.sql` 檔案並執行。

### Q2: Extensions 未啟用怎麼辦？

**A**: 在 SQL Editor 中執行：

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Q3: RLS 未啟用怎麼辦？

**A**: 對缺少 RLS 的表執行：

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Q4: 關鍵欄位類型不對怎麼辦？

**A**: 這通常表示 migration 執行順序有誤，需要檢查：
1. 所有 migrations 是否按順序執行
2. 是否有 migration 衝突

---

## 驗證完成後

### 更新文檔

在 `SCHEMA_VALIDATION_CHECKLIST.md` 底部填寫：

```
**驗證者**: [你的名字]
**日期**: [今天日期]
**狀態**: ✅ 通過 / ⚠️ 有差異需處理
```

### 通知團隊

如果驗證通過，可以在團隊頻道發送：

> ✅ Schema 驗證完成！60 張表全部存在，RLS 已啟用，可以開始 M2-P4。

---

## 快速驗證命令（可選）

如果你有 `psql` 命令列工具：

```bash
# 連接到 Supabase
psql "postgresql://[user]:[password]@[host]:5432/postgres"

# 執行驗證腳本
\i schema_validation_check.sql
```

---

**建立日期**: 2025-01
**相關文件**:
- `schema_validation_check.sql` - 驗證腳本
- `SCHEMA_VALIDATION_CHECKLIST.md` - 驗證清單
- `apps/web/supabase/schema.sql` - Schema 藍圖
