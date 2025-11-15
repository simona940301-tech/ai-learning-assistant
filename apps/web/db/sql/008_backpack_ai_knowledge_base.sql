-- Add auto_tags and initial_summary columns to files table
-- Run this migration to support AI knowledge base features

ALTER TABLE files
ADD COLUMN IF NOT EXISTS auto_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS initial_summary TEXT;

-- Add index for tag search (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_files_auto_tags ON files USING GIN (auto_tags);

-- Add comment for documentation
COMMENT ON COLUMN files.auto_tags IS 'Auto-generated topic tags for AI knowledge base';
COMMENT ON COLUMN files.initial_summary IS 'Initial content summary generated during upload';

