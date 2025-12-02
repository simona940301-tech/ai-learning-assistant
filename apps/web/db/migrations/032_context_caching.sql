-- ============================================
-- Context Caching Support
-- Migration 032
-- ============================================

-- 為 rag_documents 添加 Context Cache 相關欄位
ALTER TABLE rag_documents 
ADD COLUMN IF NOT EXISTS cache_name TEXT,
ADD COLUMN IF NOT EXISTS cache_expires_at TIMESTAMPTZ;

-- 添加索引以優化快取查詢
CREATE INDEX IF NOT EXISTS idx_rag_docs_cache_name ON rag_documents(cache_name) WHERE cache_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rag_docs_cache_expires ON rag_documents(cache_expires_at) WHERE cache_expires_at IS NOT NULL;

-- 添加註釋
COMMENT ON COLUMN rag_documents.cache_name IS 'Gemini Context Cache 名稱（用於加速 Chat 回應）';
COMMENT ON COLUMN rag_documents.cache_expires_at IS 'Context Cache 過期時間（24 小時 TTL）';

-- ============================================
-- 為 rag_sessions 添加 Context Cache 關聯
-- ============================================
ALTER TABLE rag_sessions
ADD COLUMN IF NOT EXISTS cached_content_name TEXT,
ADD COLUMN IF NOT EXISTS cache_expires_at TIMESTAMPTZ;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_rag_sessions_cache ON rag_sessions(cached_content_name) WHERE cached_content_name IS NOT NULL;

-- 添加註釋
COMMENT ON COLUMN rag_sessions.cached_content_name IS 'Session 綁定的 Context Cache 名稱';
COMMENT ON COLUMN rag_sessions.cache_expires_at IS 'Context Cache 過期時間';

-- ============================================
-- Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Context Caching migration completed!';
  RAISE NOTICE 'Added columns: cache_name, cache_expires_at to rag_documents';
  RAISE NOTICE 'Added columns: cached_content_name, cache_expires_at to rag_sessions';
END $$;

