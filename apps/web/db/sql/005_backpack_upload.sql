-- Backpack Upload Pipeline Schema
-- Run this after ensuring pgvector extension is enabled

-- Enable UUID and Vector extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- 1. files table
-- ============================================
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('student', 'teacher')),
  storage_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  page_count INTEGER DEFAULT 0,
  checksum TEXT UNIQUE NOT NULL,
  ocr_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (ocr_status IN ('pending', 'processing', 'done', 'failed')),
  embed_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (embed_status IN ('pending', 'processing', 'done', 'failed')),
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'assigned', 'purchased')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_checksum ON files(checksum);
CREATE INDEX IF NOT EXISTS idx_files_ocr_status ON files(ocr_status);
CREATE INDEX IF NOT EXISTS idx_files_embed_status ON files(embed_status);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

-- ============================================
-- 2. file_pages table
-- ============================================
CREATE TABLE IF NOT EXISTS file_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  page_no INTEGER NOT NULL CHECK (page_no >= 0),
  text TEXT NOT NULL,
  bbox_json JSONB, -- Array of {x, y, width, height, text} spans
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, page_no)
);

CREATE INDEX IF NOT EXISTS idx_file_pages_file_id ON file_pages(file_id);
CREATE INDEX IF NOT EXISTS idx_file_pages_page_no ON file_pages(file_id, page_no);

-- ============================================
-- 3. doc_chunks table (pgvector)
-- ============================================
CREATE TABLE IF NOT EXISTS doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  page_no INTEGER NOT NULL,
  chunk_idx INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-large
  anchor TEXT NOT NULL, -- e.g., "p12:¶3"
  meta JSONB DEFAULT '{}', -- {tokens, method, section_title?}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_file_page ON doc_chunks(file_id, page_no, chunk_idx);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding ON doc_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- 4. citations table
-- ============================================
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL, -- Reference to answer/ask result (flexible)
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  page_no INTEGER NOT NULL,
  chunk_idx INTEGER,
  span JSONB, -- {start, end, text} for highlighting
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citations_answer_id ON citations(answer_id);
CREATE INDEX IF NOT EXISTS idx_citations_file_page ON citations(file_id, page_no);

-- ============================================
-- RLS Policies
-- ============================================

-- files: users can only see their own files
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own files"
  ON files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = user_id AND source = 'student');

CREATE POLICY "Users update own files"
  ON files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id);

-- file_pages: inherit from files
ALTER TABLE file_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own file pages"
  ON file_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM files 
      WHERE files.id = file_pages.file_id 
      AND files.user_id = auth.uid()
    )
  );

-- doc_chunks: inherit from files
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own doc chunks"
  ON doc_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM files 
      WHERE files.id = doc_chunks.file_id 
      AND files.user_id = auth.uid()
    )
  );

-- citations: users can view citations for their own answers
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own citations"
  ON citations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM files 
      WHERE files.id = citations.file_id 
      AND files.user_id = auth.uid()
    )
  );

-- ============================================
-- Helper Functions
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- Search function for Scoped Ask
CREATE OR REPLACE FUNCTION search_doc_chunks(
  query_embedding vector(1536),
  file_id_filter UUID DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  file_id UUID,
  page_no INTEGER,
  chunk_idx INTEGER,
  content TEXT,
  anchor TEXT,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    doc_chunks.id,
    doc_chunks.file_id,
    doc_chunks.page_no,
    doc_chunks.chunk_idx,
    doc_chunks.content,
    doc_chunks.anchor,
    1 - (doc_chunks.embedding <=> query_embedding) AS similarity
  FROM doc_chunks
  WHERE (file_id_filter IS NULL OR doc_chunks.file_id = file_id_filter)
    AND doc_chunks.embedding IS NOT NULL
    AND 1 - (doc_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY doc_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

