-- Backpack Scoped Ask Schema
-- Extends existing backpack upload schema with scoped ask, highlights, and notes

-- ============================================
-- 0) Extend doc_chunks: add start/end (character offsets)
-- ============================================
ALTER TABLE public.doc_chunks
  ADD COLUMN IF NOT EXISTS start INT,
  ADD COLUMN IF NOT EXISTS "end" INT;

-- Index for highlight mapping (page + start helps with range queries)
CREATE INDEX IF NOT EXISTS doc_chunks_file_page_start_idx
  ON public.doc_chunks(file_id, page_no, start);

-- ============================================
-- 1) highlights (TextPosition + TextQuote)
-- ============================================
CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  color TEXT NOT NULL CHECK (color IN ('yellow','green','blue')),
  page_index INT NOT NULL,
  start INT NOT NULL,
  "end" INT NOT NULL,
  quote TEXT NOT NULL,
  prefix TEXT,
  suffix TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_highlights_file_id ON public.highlights(file_id);
CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON public.highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_page_start ON public.highlights(file_id, page_index, start);

-- ============================================
-- 2) notes (threaded)
-- ============================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  reply_to UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_file_id ON public.notes(file_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_reply_to ON public.notes(reply_to);

-- ============================================
-- 3) note_links (note ↔ target range/highlight)
-- ============================================
-- Note: CREATE TYPE doesn't support IF NOT EXISTS, so we use DO block
DO $$ BEGIN
  CREATE TYPE note_target_type AS ENUM ('highlight','range');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  target_type note_target_type NOT NULL,
  page_index INT,
  start INT,
  "end" INT,
  highlight_id UUID REFERENCES public.highlights(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_note_links_note_id ON public.note_links(note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_file_id ON public.note_links(file_id);
CREATE INDEX IF NOT EXISTS idx_note_links_highlight_id ON public.note_links(highlight_id);

-- ============================================
-- 4) asks
-- ============================================
-- Note: CREATE TYPE doesn't support IF NOT EXISTS, so we use DO block
DO $$ BEGIN
  CREATE TYPE ask_scope AS ENUM ('selection','file','global');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.asks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope ask_scope NOT NULL,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  selection JSONB,  -- {page_index,start,end,quote,prefix,suffix}
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asks_user_id ON public.asks(user_id);
CREATE INDEX IF NOT EXISTS idx_asks_file_id ON public.asks(file_id);
CREATE INDEX IF NOT EXISTS idx_asks_created_at ON public.asks(created_at DESC);

-- ============================================
-- 5) answers (with citations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ask_id UUID NOT NULL REFERENCES public.asks(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]', -- [{file_id,chunk_id,page_index,start,end,score}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_answers_ask_id ON public.answers(ask_id);
CREATE INDEX IF NOT EXISTS idx_answers_created_at ON public.answers(created_at DESC);

-- ============================================
-- 6) RLS Policies
-- ============================================
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- highlights: users can only access highlights for their own files
DROP POLICY IF EXISTS "highlights_owner" ON public.highlights;
CREATE POLICY "highlights_owner"
  ON public.highlights
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.files f 
      WHERE f.id = highlights.file_id 
      AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.files f 
      WHERE f.id = highlights.file_id 
      AND f.user_id = auth.uid()
    )
  );

-- notes: users can only access their own notes
DROP POLICY IF EXISTS "notes_owner_readwrite" ON public.notes;
CREATE POLICY "notes_owner_readwrite"
  ON public.notes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- note_links: users can only access links for their own files
DROP POLICY IF EXISTS "note_links_owner" ON public.note_links;
CREATE POLICY "note_links_owner"
  ON public.note_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.files f 
      WHERE f.id = note_links.file_id 
      AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.files f 
      WHERE f.id = note_links.file_id 
      AND f.user_id = auth.uid()
    )
  );

-- asks: users can only access their own asks
DROP POLICY IF EXISTS "asks_owner" ON public.asks;
CREATE POLICY "asks_owner"
  ON public.asks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- answers: users can only access answers for their own asks
DROP POLICY IF EXISTS "answers_by_ask_owner" ON public.answers;
CREATE POLICY "answers_by_ask_owner"
  ON public.answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.asks a 
      WHERE a.id = answers.ask_id 
      AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asks a 
      WHERE a.id = answers.ask_id 
      AND a.user_id = auth.uid()
    )
  );

-- doc_chunks: ensure RLS is enabled (if not already)
ALTER TABLE public.doc_chunks ENABLE ROW LEVEL SECURITY;

-- doc_chunks: users can only read chunks for their own files
DROP POLICY IF EXISTS "doc_chunks_owner_read" ON public.doc_chunks;
CREATE POLICY "doc_chunks_owner_read"
  ON public.doc_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.files f 
      WHERE f.id = doc_chunks.file_id 
      AND f.user_id = auth.uid()
    )
  );

-- ============================================
-- 7) Search function (returns start/end/score)
-- ============================================
CREATE OR REPLACE FUNCTION public.search_doc_chunks_scoped(
  q_embedding vector(1536),
  p_file_id UUID,
  p_top_k INT DEFAULT 6
) RETURNS TABLE(
  chunk_id UUID,
  file_id UUID,
  page_index INT,
  start INT,
  "end" INT,
  text TEXT,
  score FLOAT
) LANGUAGE sql STABLE AS $$
  SELECT 
    c.id AS chunk_id,
    c.file_id,
    c.page_no AS page_index,
    c.start,
    c."end",
    c.content AS text,
    1 - (c.embedding <=> q_embedding) AS score
  FROM public.doc_chunks c
  WHERE c.file_id = p_file_id
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> q_embedding
  LIMIT p_top_k;
$$;

