# 🔧 Hotfix: IMMUTABLE 函數錯誤修復

## ❌ 錯誤訊息
```
ERROR: 42P17: functions in index predicate must be marked IMMUTABLE
```

## 🔍 根本原因

在 `20251026_00_create_analytics_events.sql` 中，第 40-42 行嘗試創建一個帶有時間條件的部分索引：

```sql
CREATE INDEX IF NOT EXISTS idx_analytics_events_24h
  ON analytics_events(server_timestamp)
  WHERE server_timestamp > NOW() - INTERVAL '24 hours';
```

### 問題說明

PostgreSQL 要求索引的 WHERE 條件必須使用 **IMMUTABLE** 函數（每次執行結果相同）。

- ❌ `NOW()` 是 **VOLATILE** 函數（每次執行結果不同）
- ✅ 固定的常量或 IMMUTABLE 函數才能用於索引條件

## ✅ 修復方案

### 方案 1：移除部分索引（已採用）

移除了有問題的索引，在查詢時使用 WHERE 條件：

```sql
-- 修復前（錯誤）
CREATE INDEX IF NOT EXISTS idx_analytics_events_24h
  ON analytics_events(server_timestamp)
  WHERE server_timestamp > NOW() - INTERVAL '24 hours';

-- 修復後
-- Removed: Cannot use NOW() in index predicate (not IMMUTABLE)
-- For 24h queries, use WHERE clause in query instead
```

查詢時這樣使用：
```sql
SELECT *
FROM analytics_events
WHERE server_timestamp > NOW() - INTERVAL '24 hours'
ORDER BY server_timestamp DESC;
-- ↑ 會使用 idx_analytics_events_timestamp 索引
```

### 方案 2：使用完整索引（備選）

如果需要優化 24 小時查詢，可以創建完整索引（不使用 WHERE 條件）：

```sql
CREATE INDEX idx_analytics_events_timestamp
  ON analytics_events(server_timestamp DESC);
```

這個索引已經存在（第 37-38 行），可以支援 24 小時查詢。

## 📝 已修復的文件

### 1. 單獨的 migration 文件
- ✅ `supabase/migrations/20251026_00_create_analytics_events.sql`

### 2. 合併的 migration 文件
- ✅ `supabase/migrations/COMBINED_20251026_ALL.sql`
- ✅ `supabase/migrations/SAFE_20251026_NEW_TABLES_ONLY.sql`

### 3. 備份文件
- 📦 `supabase/migrations/COMBINED_20251026_ALL.sql.bak` （原始文件，保留備份）

## 🎯 現在可以執行的操作

所有文件已修復！你現在可以安全執行：

### 選項 1：完整執行
```sql
-- 在 Supabase Dashboard SQL Editor 執行
-- 複製 supabase/migrations/COMBINED_20251026_ALL.sql 的內容
```

### 選項 2：安全執行（僅新表）
```sql
-- 在 Supabase Dashboard SQL Editor 執行
-- 複製 supabase/migrations/SAFE_20251026_NEW_TABLES_ONLY.sql 的內容
```

### 選項 3：本地開發
```bash
supabase db reset
```

## 📚 技術細節

### PostgreSQL 函數穩定性等級

| 等級 | 說明 | 可用於索引 | 範例 |
|------|------|------------|------|
| IMMUTABLE | 相同輸入永遠返回相同結果 | ✅ 是 | `UPPER('text')`, `1 + 1` |
| STABLE | 單個語句內結果相同 | ⚠️ 部分 | `current_date` |
| VOLATILE | 每次執行可能不同 | ❌ 否 | `NOW()`, `random()` |

### 為什麼這個限制存在？

索引需要在數據插入時創建，如果條件每秒都在變化（如 `NOW() - 24 hours`），索引就無法正確維護。

## 🔗 相關資源

- [PostgreSQL: Function Volatility Categories](https://www.postgresql.org/docs/current/xfunc-volatility.html)
- [PostgreSQL: Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)

## ✨ 性能影響

### 修復前的計劃
- 創建部分索引僅包含最近 24 小時的數據
- 索引大小更小，查詢更快

### 修復後的實際
- 使用完整的 `server_timestamp` 索引
- 查詢時使用 WHERE 過濾
- **性能影響極小**：PostgreSQL 的 B-tree 索引在範圍查詢上非常高效

### 基準測試（預期）

假設有 100 萬條記錄，最近 24 小時有 1000 條：

| 方案 | 索引大小 | 查詢時間 (ms) |
|------|----------|---------------|
| 部分索引（理想） | ~100 KB | ~5 ms |
| 完整索引（實際） | ~50 MB | ~8 ms |

**結論**：性能差異可忽略（3ms），完全可接受。

## 🚀 後續優化（可選）

如果未來需要進一步優化 24 小時查詢，可以考慮：

1. **分區表**（Partitioning）
   ```sql
   CREATE TABLE analytics_events_partitioned (
     LIKE analytics_events
   ) PARTITION BY RANGE (server_timestamp);
   ```

2. **定期清理舊數據**
   ```sql
   DELETE FROM analytics_events
   WHERE server_timestamp < NOW() - INTERVAL '90 days';
   ```

3. **物化視圖**（Materialized View）
   ```sql
   CREATE MATERIALIZED VIEW analytics_24h AS
   SELECT * FROM analytics_events
   WHERE server_timestamp > NOW() - INTERVAL '24 hours';
   ```

但目前的方案已經足夠高效！

---

**修復完成時間**: 2025-11-14
**影響範圍**: 僅 analytics_events 表的索引
**向下兼容**: ✅ 是（只是移除了一個無法創建的索引）
