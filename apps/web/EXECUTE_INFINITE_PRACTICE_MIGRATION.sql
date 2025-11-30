-- ============================================
-- Infinite Practice Mode (Endless Challenge)
-- Migration 025 - EXECUTE MANUALLY IN DASHBOARD
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. practice_rooms table
-- Stores configuration for a practice session
-- ============================================
CREATE TABLE IF NOT EXISTS practice_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT NOT NULL UNIQUE, -- 6-char code for sharing
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Configuration
  source_type TEXT NOT NULL CHECK (source_type IN ('FILE_RAG', 'SUBJECT_TAG', 'MIXED')),
  source_config JSONB DEFAULT '{}'::jsonb, -- { "file_ids": ["..."], "subjects": ["math"] }
  question_order_seed TEXT NOT NULL, -- Random seed for deterministic shuffle
  
  -- Settings
  is_public BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_practice_rooms_code ON practice_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_practice_rooms_host ON practice_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_practice_rooms_status ON practice_rooms(status);

-- RLS
ALTER TABLE practice_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active rooms" ON practice_rooms;
CREATE POLICY "Anyone can view active rooms"
  ON practice_rooms FOR SELECT
  USING (status = 'ACTIVE');

DROP POLICY IF EXISTS "Users can create rooms" ON practice_rooms;
CREATE POLICY "Users can create rooms"
  ON practice_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Host can update room" ON practice_rooms;
CREATE POLICY "Host can update room"
  ON practice_rooms FOR UPDATE
  USING (auth.uid() = host_id);

-- ============================================
-- 2. practice_participants table
-- Tracks user progress in a room
-- ============================================
CREATE TABLE IF NOT EXISTS practice_participants (
  room_id UUID REFERENCES practice_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Progress
  current_question_index INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (room_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_practice_participants_room ON practice_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_practice_participants_user ON practice_participants(user_id);

-- RLS
ALTER TABLE practice_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view room members" ON practice_participants;
CREATE POLICY "Participants view room members"
  ON practice_participants FOR SELECT
  USING (true); -- Publicly visible for multiplayer features

DROP POLICY IF EXISTS "Users join rooms" ON practice_participants;
CREATE POLICY "Users join rooms"
  ON practice_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own progress" ON practice_participants;
CREATE POLICY "Users update own progress"
  ON practice_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. practice_logs table
-- Granular log of every answer
-- ============================================
CREATE TABLE IF NOT EXISTS practice_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES practice_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID NOT NULL, -- References exam_question_bank(id)
  
  -- Answer details
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answer_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_practice_logs_room ON practice_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_practice_logs_user ON practice_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_logs_created_at ON practice_logs(created_at DESC);

-- RLS
ALTER TABLE practice_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own logs" ON practice_logs;
CREATE POLICY "Users view own logs"
  ON practice_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own logs" ON practice_logs;
CREATE POLICY "Users create own logs"
  ON practice_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. Helper Functions
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_practice_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_practice_rooms_updated_at ON practice_rooms;
CREATE TRIGGER update_practice_rooms_updated_at
  BEFORE UPDATE ON practice_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_practice_rooms_updated_at();
