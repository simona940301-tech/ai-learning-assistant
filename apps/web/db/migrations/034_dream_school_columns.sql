-- Migration: Add Dream School columns to profiles table
-- This migration adds columns needed for the Dream School Ready % feature

-- Add mock_exam_level column (stores user's mock exam performance level 0-15)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS mock_exam_level INTEGER DEFAULT 0;

-- Add dream_school_id column (stores user's target university)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dream_school_id TEXT;

-- Add dream_department_id column (stores user's target department)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dream_department_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.mock_exam_level IS 'User mock exam performance level (0-15 scale)';
COMMENT ON COLUMN profiles.dream_school_id IS 'Target university ID from taiwan-universities.ts';
COMMENT ON COLUMN profiles.dream_department_id IS 'Target department ID from taiwan-universities.ts';
