-- Migration: Add folder and tags support to backpack_notes table
-- Date: 2025-01-XX
-- Description: Add folder and tags columns to support 錯題本 (wrong question book) organization

-- Add folder column (default: '錯題本')
ALTER TABLE backpack_notes 
ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT '錯題本';

-- Add tags column (array of text)
ALTER TABLE backpack_notes 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for folder queries
CREATE INDEX IF NOT EXISTS idx_backpack_notes_folder ON backpack_notes(folder);

-- Create GIN index for tags array queries (for efficient tag filtering)
CREATE INDEX IF NOT EXISTS idx_backpack_notes_tags ON backpack_notes USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN backpack_notes.folder IS '檔案夾名稱，預設為「錯題本」';
COMMENT ON COLUMN backpack_notes.tags IS '標籤陣列，用於細分類（如科目、主題等）';



