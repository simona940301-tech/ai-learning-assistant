-- Add anonymous and question metadata support to posts table
-- For "求助學霸" feature: allow users to post questions anonymously or with profile

-- Add is_anonymous column
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;

-- Add question_metadata column to store question-related data
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS question_metadata JSONB DEFAULT '{}';

-- Add index for filtering anonymous posts
CREATE INDEX IF NOT EXISTS idx_posts_is_anonymous ON posts(is_anonymous);

-- Add index for filtering question posts
CREATE INDEX IF NOT EXISTS idx_posts_question_metadata ON posts USING GIN(question_metadata);

-- Update RLS policy to allow anonymous posts
-- Anonymous posts still need user_id for tracking, but won't show profile info
-- The policy remains the same: users can only create posts with their own user_id

