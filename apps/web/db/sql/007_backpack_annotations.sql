-- Backpack Reader Annotations Schema
-- Run this in Supabase SQL Editor

DO $$ BEGIN
  CREATE TYPE annotation_type AS ENUM ('pen', 'marker', 'text-highlight', 'sticky');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  annotation_type annotation_type NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annotations_file_page ON annotations(file_id, page_number);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);

ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own annotations" ON annotations;
CREATE POLICY "Users view own annotations" ON annotations FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own annotations" ON annotations;
CREATE POLICY "Users create own annotations" ON annotations FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own annotations" ON annotations;
CREATE POLICY "Users update own annotations" ON annotations FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own annotations" ON annotations;
CREATE POLICY "Users delete own annotations" ON annotations FOR DELETE
USING (auth.uid() = user_id);
