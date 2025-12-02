-- Add caching support for RAG analysis
-- Created: 2025-11-26

-- Add file hash column to files table for deduplication
ALTER TABLE files 
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Create index on file_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash) WHERE file_hash IS NOT NULL;

-- Add cache hit tracking to file_analysis
ALTER TABLE file_analysis
  ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cached_from_analysis_id UUID REFERENCES file_analysis(id);

-- Create telemetry table for performance tracking
CREATE TABLE IF NOT EXISTS rag_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES file_analysis(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timing metrics (in milliseconds)
  upload_duration_ms INTEGER,
  text_extraction_ms INTEGER,
  chunking_ms INTEGER,
  embedding_ms INTEGER,
  llm_preview_ms INTEGER,
  llm_analysis_ms INTEGER,
  llm_prediction_ms INTEGER,
  total_duration_ms INTEGER,
  
  -- Resource metrics
  file_size_bytes BIGINT,
  extracted_chars INTEGER,
  num_chunks INTEGER,
  num_embeddings INTEGER,
  
  -- LLM metrics
  preview_tokens_in INTEGER,
  preview_tokens_out INTEGER,
  analysis_tokens_in INTEGER,
  analysis_tokens_out INTEGER,
  prediction_tokens_in INTEGER,
  prediction_tokens_out INTEGER,
  total_tokens INTEGER,
  
  -- Cache metrics
  was_cached BOOLEAN DEFAULT FALSE,
  cache_source_id UUID,
  
  -- Error tracking
  error_stage TEXT,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_telemetry_analysis_id ON rag_telemetry(analysis_id);
CREATE INDEX IF NOT EXISTS idx_rag_telemetry_user_id ON rag_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_telemetry_created_at ON rag_telemetry(created_at DESC);

-- RLS for telemetry
ALTER TABLE rag_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own telemetry"
  ON rag_telemetry FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own telemetry"
  ON rag_telemetry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE rag_telemetry IS 'Performance metrics for RAG analysis pipeline';
COMMENT ON COLUMN rag_telemetry.was_cached IS 'Whether this analysis used cached results';
COMMENT ON COLUMN rag_telemetry.total_tokens IS 'Sum of all LLM tokens used';
