-- 🚀 RAG 性能優化 - Supabase 配置 SQL
-- 請在 Supabase Dashboard → SQL Editor 中執行

-- ========================================
-- 1. 創建性能索引
-- ========================================

-- Composite index for fast lookups
CREATE INDEX IF NOT EXISTS idx_file_analysis_lookup 
ON file_analysis(id, user_id, status);

-- Partial index for active analyses only
CREATE INDEX IF NOT EXISTS idx_active_analysis 
ON file_analysis(user_id, created_at DESC)
WHERE status IN ('pending', 'processing', 'preview_ready', 'analysis_ready', 'streaming');

-- GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_exam_predictions 
ON file_analysis USING GIN (exam_predictions);

CREATE INDEX IF NOT EXISTS idx_core_concepts 
ON file_analysis USING GIN (core_concepts);

CREATE INDEX IF NOT EXISTS idx_detected_topics 
ON file_analysis USING GIN (detected_topics);

-- Index for telemetry lookups
CREATE INDEX IF NOT EXISTS idx_rag_telemetry_analysis 
ON rag_telemetry(analysis_id);

CREATE INDEX IF NOT EXISTS idx_rag_telemetry_user_date 
ON rag_telemetry(user_id, created_at DESC);

-- ========================================
-- 2. 啟用 Realtime
-- ========================================

-- Enable realtime for file_analysis table
ALTER PUBLICATION supabase_realtime ADD TABLE file_analysis;

-- ========================================
-- 驗證
-- ========================================

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'file_analysis'
ORDER BY indexname;

-- Check realtime publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
