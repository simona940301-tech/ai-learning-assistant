-- Migration: Add skill_tags column to backpack_notes table
-- Description: Add skill_tags JSONB column to store PLMS Skill Tags (1-2 tags with confidence scores)

-- Add skill_tags column (JSONB for structured data: [{tag: string, confidence: number}])
ALTER TABLE backpack_notes 
ADD COLUMN IF NOT EXISTS skill_tags JSONB DEFAULT '[]'::jsonb;

-- Create GIN index for skill_tags JSONB queries (for efficient filtering)
CREATE INDEX IF NOT EXISTS idx_backpack_notes_skill_tags ON backpack_notes USING GIN(skill_tags);

-- Add comment
COMMENT ON COLUMN backpack_notes.skill_tags IS 'PLMS Skill Tags: Array of {tag: string, confidence: number} objects (1-2 tags max)';


