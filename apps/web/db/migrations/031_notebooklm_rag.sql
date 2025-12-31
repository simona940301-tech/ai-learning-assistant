-- ============================================
-- NotebookLM-Style RAG System
-- Migration 031
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. rag_sessions table
-- Stores chat sessions with specific context
-- ============================================
CREATE TABLE IF NOT EXISTS rag_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT, -- Auto-generated or user-set
  context_file_ids UUID[] DEFAULT '{}', -- Array of file IDs included in this session context
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_sessions_user_id ON rag_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_sessions_updated_at ON rag_sessions(updated_at DESC);

-- RLS
ALTER TABLE rag_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own sessions" ON rag_sessions;
CREATE POLICY "Users view own sessions"
  ON rag_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own sessions" ON rag_sessions;
CREATE POLICY "Users create own sessions"
  ON rag_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sessions" ON rag_sessions;
CREATE POLICY "Users update own sessions"
  ON rag_sessions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own sessions" ON rag_sessions;
CREATE POLICY "Users delete own sessions"
  ON rag_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. rag_messages table
-- Stores chat history for each session
-- ============================================
CREATE TABLE IF NOT EXISTS rag_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES rag_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Optional: Store structured data if needed (e.g. citations)
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_messages_session_id ON rag_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_rag_messages_created_at ON rag_messages(created_at ASC);

-- RLS
ALTER TABLE rag_messages ENABLE ROW LEVEL SECURITY;

-- We can simplify RLS by checking session ownership
DROP POLICY IF EXISTS "Users view messages of own sessions" ON rag_messages;
CREATE POLICY "Users view messages of own sessions"
  ON rag_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rag_sessions
      WHERE id = rag_messages.session_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users create messages in own sessions" ON rag_messages;
CREATE POLICY "Users create messages in own sessions"
  ON rag_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rag_sessions
      WHERE id = rag_messages.session_id
      AND user_id = auth.uid()
    )
  );

-- ============================================
-- 3. Helper Functions
-- ============================================

-- Update timestamp trigger for rag_sessions
CREATE OR REPLACE FUNCTION update_rag_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rag_sessions_updated_at ON rag_sessions;
CREATE TRIGGER update_rag_sessions_updated_at
  BEFORE UPDATE ON rag_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_rag_sessions_updated_at();

-- ============================================
-- Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ NotebookLM RAG System migration completed successfully!';
  RAISE NOTICE 'Created tables: rag_sessions, rag_messages';
END $$;
