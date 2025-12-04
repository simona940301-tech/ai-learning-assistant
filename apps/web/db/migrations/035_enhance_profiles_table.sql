-- ============================================================
-- Migration: 035_enhance_profiles_table.sql
-- Description: Add missing profile fields and ensure data persistence
-- Created: 2025-12-03
-- Purpose: Fix avatar persistence and add profile enhancement fields
-- ============================================================

-- Add missing columns if they don't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

-- Add comments for documentation
COMMENT ON COLUMN profiles.display_name IS 'User display name shown to other users (排行榜、對戰顯示名稱)';
COMMENT ON COLUMN profiles.full_name IS 'User full name for internal records only (僅供系統記錄)';
COMMENT ON COLUMN profiles.bio IS 'User bio/description, max 200 characters (個人簡介)';
COMMENT ON COLUMN profiles.email_notifications IS 'Enable email notifications (Email 通知開關)';
COMMENT ON COLUMN profiles.push_notifications IS 'Enable push notifications (推播通知開關)';

-- Update existing null avatar_url to empty string for consistency
-- This ensures avatar persistence issue doesn't happen due to NULL values
UPDATE profiles
SET avatar_url = ''
WHERE avatar_url IS NULL;

-- Create a function to get user display name with priority
-- Priority: display_name > full_name > username > email
CREATE OR REPLACE FUNCTION get_user_display_name(profile_row profiles)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(profile_row.display_name, ''),
    NULLIF(profile_row.full_name, ''),
    NULLIF(profile_row.username, ''),
    SPLIT_PART(profile_row.email, '@', 1),
    '使用者'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add helpful view for profile data (optional, for debugging)
CREATE OR REPLACE VIEW profile_summary AS
SELECT
  id,
  email,
  username,
  display_name,
  full_name,
  avatar_url,
  bio,
  target_university,
  target_department,
  onboarding_completed,
  email_notifications,
  push_notifications,
  created_at,
  updated_at,
  get_user_display_name(profiles.*) as effective_display_name
FROM profiles;

-- Grant permissions
GRANT SELECT ON profile_summary TO authenticated;
GRANT SELECT ON profile_summary TO service_role;

COMMENT ON VIEW profile_summary IS 'Convenient view for profile data with computed display name';
