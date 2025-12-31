-- Create concept_tags table
CREATE TABLE IF NOT EXISTS concept_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,  -- 'english', 'math'
  tag_name TEXT NOT NULL,  -- '虛擬語氣', '一元二次方程式'
  category TEXT,  -- 'grammar', 'algebra'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_concept_tags_subject ON concept_tags(subject);

-- Add knowledge_tags to seed_questions
ALTER TABLE seed_questions 
ADD COLUMN IF NOT EXISTS knowledge_tags JSONB DEFAULT '[]'::JSONB;

CREATE INDEX IF NOT EXISTS idx_seed_questions_knowledge_tags 
ON seed_questions USING GIN (knowledge_tags);

-- Add knowledge_tags to error_book
ALTER TABLE error_book 
ADD COLUMN IF NOT EXISTS knowledge_tags JSONB DEFAULT '[]'::JSONB;

-- Add knowledge_tags to pack_questions
ALTER TABLE pack_questions 
ADD COLUMN IF NOT EXISTS knowledge_tags JSONB DEFAULT '[]'::JSONB;
