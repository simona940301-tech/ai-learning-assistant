-- Add folder column to backpack_notes for categorization (e.g., error_book, general, etc.)
-- Migration: 20251115_add_folder_to_backpack_notes

ALTER TABLE backpack_notes
ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'general';

COMMENT ON COLUMN backpack_notes.folder IS 'Folder/category for organizing notes (e.g., error_book, general, math, etc.)';

-- Create index for faster folder filtering
CREATE INDEX IF NOT EXISTS idx_backpack_notes_folder
ON backpack_notes (user_id, folder, created_at DESC);
