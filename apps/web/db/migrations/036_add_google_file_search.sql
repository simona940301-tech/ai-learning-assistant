-- ============================================
-- Context Caching-First Hybrid RAG
-- Migration 036
-- ============================================
-- Description: Adds columns for intelligent routing between Context Caching and File Search

-- Add columns to track storage strategy and Google resource IDs
ALTER TABLE rag_documents 
ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'CONTEXT_CACHE' CHECK (storage_type IN ('CONTEXT_CACHE', 'FILE_SEARCH')),
ADD COLUMN IF NOT EXISTS google_resource_id TEXT,
ADD COLUMN IF NOT EXISTS token_count INTEGER;

-- Add comments
COMMENT ON COLUMN rag_documents.storage_type IS 'Storage strategy: CONTEXT_CACHE (small files, high quality) or FILE_SEARCH (large files, RAG)';
COMMENT ON COLUMN rag_documents.google_resource_id IS 'Google resource ID: cachedContents/ID for Context Cache or files/ID for File Search';
COMMENT ON COLUMN rag_documents.token_count IS 'Token count of document content, used for routing decision';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_rag_docs_storage_type ON rag_documents(storage_type);
CREATE INDEX IF NOT EXISTS idx_rag_docs_google_resource ON rag_documents(google_resource_id) WHERE google_resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rag_docs_token_count ON rag_documents(token_count) WHERE token_count IS NOT NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Context Caching-First Hybrid RAG migration completed!';
  RAISE NOTICE 'Added columns: storage_type, google_resource_id, token_count';
  RAISE NOTICE 'Created indexes for efficient routing';
END $$;
