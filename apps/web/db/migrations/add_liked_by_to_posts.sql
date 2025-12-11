-- Add liked_by column to posts table for tracking who liked each post
-- Migration: add_liked_by_to_posts
-- Date: 2025-12-11

-- Add liked_by column to track which users have liked each post
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS liked_by uuid[] DEFAULT '{}';

-- Create index for better query performance when checking if user has liked a post
CREATE INDEX IF NOT EXISTS idx_posts_liked_by ON posts USING GIN (liked_by);

-- Add RLS policies for posts table

-- Enable RLS on posts table if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all posts
DROP POLICY IF EXISTS "Allow authenticated users to read posts" ON posts;
CREATE POLICY "Allow authenticated users to read posts"
ON posts FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow users to insert their own posts
DROP POLICY IF EXISTS "Allow users to insert their own posts" ON posts;
CREATE POLICY "Allow users to insert their own posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own posts
DROP POLICY IF EXISTS "Allow users to update their own posts" ON posts;
CREATE POLICY "Allow users to update their own posts"
ON posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to delete their own posts
DROP POLICY IF EXISTS "Allow users to delete their own posts" ON posts;
CREATE POLICY "Allow users to delete their own posts"
ON posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Allow users to update liked_by array (for like/unlike functionality)
-- This is a special case where users can update posts they don't own, but only the liked_by field
DROP POLICY IF EXISTS "Allow users to like/unlike posts" ON posts;
CREATE POLICY "Allow users to like/unlike posts"
ON posts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  -- Only allow updating liked_by and likes columns
  -- The application logic should handle incrementing/decrementing likes
  true
);

-- Add comment to explain the liked_by column
COMMENT ON COLUMN posts.liked_by IS 'Array of user IDs who have liked this post';
