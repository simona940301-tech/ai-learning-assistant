-- Function to match concepts using vector similarity
CREATE OR REPLACE FUNCTION match_concepts(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 10,
  subject_filter text DEFAULT '英文'
)
RETURNS TABLE (
  id text,
  name text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    concepts.id,
    concepts.name,
    1 - (concepts.embedding <=> query_embedding) AS similarity
  FROM concepts
  WHERE concepts.subject = subject_filter
    AND 1 - (concepts.embedding <=> query_embedding) > match_threshold
  ORDER BY concepts.embedding <=> query_embedding
  LIMIT match_count;
$$;
