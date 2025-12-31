-- Migration: Expand chick_messages.type constraint to support all 13 message types
-- Date: 2025-01-30
-- Purpose: Allow all message types for data analysis (P0-C)

-- Drop existing constraint
ALTER TABLE chick_messages DROP CONSTRAINT IF EXISTS chick_messages_type_check;

-- Add new constraint with all 13 message types
ALTER TABLE chick_messages
  ADD CONSTRAINT chick_messages_type_check CHECK (
    type IN (
      'S1', 'S2', 'S3',                    -- State warnings
      'POSITIVE',                          -- Positive feedback
      'POKE_IDLE', 'POKE_BUSY',           -- Poke interactions
      'IDLE_ENCOURAGE_BATTLE',            -- Idle reminders
      'IDLE_REVIEW_MISTAKES',
      'BATTLE_ENCOURAGEMENT',             -- Battle messages
      'BATTLE_VICTORY',
      'BATTLE_LEARNING',
      'MILESTONE',                         -- Milestones
      'STREAK'                            -- Streak messages
    )
  );

COMMENT ON COLUMN chick_messages.type IS 'Message type: S1/S2/S3 (state warnings), POSITIVE, POKE_*, IDLE_*, BATTLE_*, MILESTONE, STREAK';

