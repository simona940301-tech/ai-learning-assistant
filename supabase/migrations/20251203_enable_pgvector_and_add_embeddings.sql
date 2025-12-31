-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding to seed_questions
ALTER TABLE seed_questions ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create index for faster search (IVFFlat is good for recall/performance balance)
-- Note: Index creation might fail if table is empty, but it's safe to run.
-- We use IF NOT EXISTS to avoid errors.
CREATE INDEX IF NOT EXISTS idx_seed_questions_embedding ON seed_questions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add vectors to error_book for weakness tracking
ALTER TABLE error_book ADD COLUMN IF NOT EXISTS user_answer_vector vector(768);
ALTER TABLE error_book ADD COLUMN IF NOT EXISTS weakness_vector vector(768);

-- Function to match questions by vector similarity
CREATE OR REPLACE FUNCTION match_questions(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  exclude_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  question_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    seed_questions.id,
    seed_questions.question_text,
    1 - (seed_questions.embedding <=> query_embedding) as similarity
  FROM seed_questions
  WHERE 1 - (seed_questions.embedding <=> query_embedding) > match_threshold
  AND seed_questions.id != ALL(exclude_ids)
  ORDER BY seed_questions.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
