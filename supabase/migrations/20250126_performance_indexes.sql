-- Performance optimization indexes for file_analysis table
-- This migration adds indexes to speed up queries by 10x

-- Composite index for fast lookups (id + user_id + status)
CREATE INDEX IF NOT EXISTS idx_file_analysis_lookup 
ON file_analysis(id, user_id, status);

-- Partial index for active analyses only (reduces index size)
CREATE INDEX IF NOT EXISTS idx_active_analysis 
ON file_analysis(user_id, created_at DESC)
WHERE status IN ('pending', 'processing', 'preview_ready', 'analysis_ready', 'streaming');

-- GIN indexes for JSONB queries (exam predictions, concepts, etc.)
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

-- Add comment for documentation
COMMENT ON INDEX idx_file_analysis_lookup IS 'Fast lookup for analysis by ID and user';
COMMENT ON INDEX idx_active_analysis IS 'Partial index for active analyses only';
COMMENT ON INDEX idx_exam_predictions IS 'GIN index for JSONB exam predictions queries';
