-- ============================================
-- RAG Documents Table
-- Migration 033
-- ============================================
-- Description: Creates rag_documents table for file upload tracking

-- ============================================
-- 1. Create rag_documents table
-- ============================================
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- File metadata
  filename TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT CHECK (file_type IN ('pdf', 'txt')) NOT NULL,
  original_text TEXT,  -- Extracted text content
  
  -- ChromaDB related (optional, for future use)
  chroma_collection TEXT,
  chroma_doc_ids TEXT[],
  
  -- AI-generated summary and keywords
  summary TEXT,  -- Extractive summary
  keywords TEXT[],  -- Keyword array
  
  -- Processing status
  status TEXT CHECK (status IN ('uploading', 'processing', 'ready', 'error')) DEFAULT 'uploading',
  error_message TEXT,  -- Error message if processing failed
  
  -- Context caching (from migration 032)
  cache_name TEXT,
  cache_expires_at TIMESTAMPTZ,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- ============================================
-- 2. Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_rag_docs_user ON rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_status ON rag_documents(status);
CREATE INDEX IF NOT EXISTS idx_rag_docs_uploaded ON rag_documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_docs_cache_name ON rag_documents(cache_name) WHERE cache_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rag_docs_cache_expires ON rag_documents(cache_expires_at) WHERE cache_expires_at IS NOT NULL;

-- ============================================
-- 3. Add comments
-- ============================================
COMMENT ON TABLE rag_documents IS 'RAG document index, tracks uploaded file processing status';
COMMENT ON COLUMN rag_documents.status IS 'Processing status: uploading, processing, ready, error';
COMMENT ON COLUMN rag_documents.summary IS 'Extractive summary (3-5 key sentences)';
COMMENT ON COLUMN rag_documents.keywords IS 'Keyword array (5-10 keywords)';
COMMENT ON COLUMN rag_documents.cache_name IS 'Gemini Context Cache name (for faster Chat responses)';
COMMENT ON COLUMN rag_documents.cache_expires_at IS 'Context Cache expiration time (24 hour TTL)';

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can insert their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can update their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can delete their own RAG documents" ON rag_documents;

-- Create RLS policies
CREATE POLICY "Users can view their own RAG documents"
  ON rag_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own RAG documents"
  ON rag_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RAG documents"
  ON rag_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RAG documents"
  ON rag_documents FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ RAG Documents table migration completed successfully!';
  RAISE NOTICE 'Created table: rag_documents';
  RAISE NOTICE 'Created indexes: user_id, status, uploaded_at, cache_name, cache_expires_at';
  RAISE NOTICE 'Enabled RLS with user-scoped policies';
END $$;
