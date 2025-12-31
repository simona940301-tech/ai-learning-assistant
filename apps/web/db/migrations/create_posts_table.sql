-- Create posts table for community feature
-- This table stores user posts in the community feed

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  images text[] DEFAULT '{}',
  likes integer DEFAULT 0,
  liked_by uuid[] DEFAULT '{}',
  is_anonymous boolean DEFAULT false,
  question_metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_liked_by ON posts USING GIN (liked_by);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to read posts" ON posts;
CREATE POLICY "Allow authenticated users to read posts"
ON posts FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own posts" ON posts;
CREATE POLICY "Allow users to insert their own posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to update their own posts" ON posts;
CREATE POLICY "Allow users to update their own posts"
ON posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own posts" ON posts;
CREATE POLICY "Allow users to delete their own posts"
ON posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE posts IS 'Community posts table for user-generated content';
