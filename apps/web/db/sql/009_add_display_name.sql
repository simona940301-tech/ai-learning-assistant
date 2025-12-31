-- Add display_name column to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_files_display_name ON files(display_name);
