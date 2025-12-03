-- Add fields for Live Race
ALTER TABLE practice_participants 
ADD COLUMN IF NOT EXISTS net_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_correct_at TIMESTAMPTZ;
