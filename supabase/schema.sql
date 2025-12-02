-- ============================================================================
-- PLMS Database Schema - Official Blueprint
-- ============================================================================
-- Generated: 2025-01 (T10.2 - Schema Consolidation)
-- Source: Merged from 60+ migration files
--
-- Domain Structure:
-- 1. Extensions
-- 2. User & Profile
-- 3. Questions & Packs
-- 4. Battle & Progression
-- 5. RAG & Files
-- 6. Backpack & Notebook
-- 7. Missions & Daily Tasks
-- 8. Onboarding
-- 9. Community & Store
-- 10. Chick & Analytics
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vector similarity search (for RAG/AI features)
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- 2. USER & PROFILE DOMAIN
-- ============================================================================

-- Core user profile table (extended by multiple migrations)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  display_name TEXT,
  
  -- Progression & Economy
  xp INTEGER DEFAULT 0 CHECK (xp >= 0),
  coins INTEGER DEFAULT 0 CHECK (coins >= 0),
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  streak INTEGER DEFAULT 0 CHECK (streak >= 0),
  best_streak INTEGER DEFAULT 0 CHECK (best_streak >= 0),
  
  -- Battle Stats
  daily_energy_count INTEGER DEFAULT 8 CHECK (daily_energy_count >= 0 AND daily_energy_count <= 8),
  daily_energy_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
  elo_rank INTEGER DEFAULT 1000 CHECK (elo_rank >= 0 AND elo_rank <= 3000),
  examiner_contribution_score INTEGER DEFAULT 0 CHECK (examiner_contribution_score >= 0),
  user_wallet_balance DECIMAL(12, 2) DEFAULT 0 CHECK (user_wallet_balance >= 0),
  skill_mastery_json JSONB DEFAULT '{}'::jsonb,
  user_match_history JSONB DEFAULT '[]'::jsonb,
  total_matches INTEGER DEFAULT 0 CHECK (total_matches >= 0),
  total_wins INTEGER DEFAULT 0 CHECK (total_wins >= 0),
  total_pve_matches INTEGER DEFAULT 0 CHECK (total_pve_matches >= 0),
  total_pvp_matches INTEGER DEFAULT 0 CHECK (total_pvp_matches >= 0),
  total_correct_answers INTEGER DEFAULT 0 CHECK (total_correct_answers >= 0),
  total_questions_answered INTEGER DEFAULT 0 CHECK (total_questions_answered >= 0),
  
  -- Chick System
  chick_iq SMALLINT DEFAULT 5,
  chick_iq_last_decay_at TIMESTAMPTZ,
  chick_explanations_used SMALLINT DEFAULT 0,
  chick_explanations_reset_at TIMESTAMPTZ,
  chick_fatigue SMALLINT DEFAULT 0,
  chick_fatigue_battle_counter SMALLINT DEFAULT 0,
  chick_soothe_used SMALLINT DEFAULT 0,
  chick_soothe_reset_at TIMESTAMPTZ,
  chick_emotion_state TEXT DEFAULT 'normal' CHECK (chick_emotion_state IN ('normal','cold','distant','hibernate')),
  chick_emotion_updated_at TIMESTAMPTZ,
  
  -- Focus & Activity
  focus_stats JSONB DEFAULT '{"total_minutes": 0, "sessions_completed": 0, "current_streak": 0}'::jsonb,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  last_battle_at TIMESTAMPTZ,
  streak_updated_at TIMESTAMPTZ,
  streak_reward_state JSONB DEFAULT '{}'::jsonb,
  
  -- Tutorial & Onboarding
  tutorial_completed_at TIMESTAMPTZ,
  tutorial_badge_awarded BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  target_university TEXT,
  target_department TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social: Following relationships
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_balance ON profiles(user_wallet_balance DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_energy_count ON profiles(daily_energy_count);
CREATE INDEX IF NOT EXISTS idx_profiles_contribution_score ON profiles(examiner_contribution_score DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ============================================================================
-- 3. QUESTIONS & PACKS DOMAIN
-- ============================================================================

-- Question Packs (題包)
CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  title VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Classification
  subject VARCHAR(50) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  skill VARCHAR(100) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  
  -- Content metadata
  item_count INTEGER NOT NULL DEFAULT 0,
  has_explanation BOOLEAN NOT NULL DEFAULT TRUE,
  explanation_rate DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (explanation_rate >= 0 AND explanation_rate <= 1),
  avg_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (avg_confidence >= 0 AND avg_confidence <= 1),
  
  -- Source & Visibility
  source VARCHAR(20) DEFAULT 'internal' CHECK (source IN ('publisher', 'school', 'internal')),
  source_name VARCHAR(100),
  source_id VARCHAR(50),
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'limited', 'hidden')),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'expired')),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Stats
  install_count INTEGER NOT NULL DEFAULT 0,
  completion_rate DECIMAL(3,2) DEFAULT 0.0 CHECK (completion_rate >= 0 AND completion_rate <= 1),
  
  -- QR & aliases
  qr_alias VARCHAR(50) UNIQUE,
  confidence_badge TEXT DEFAULT 'standard',
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pack Chapters (optional hierarchy)
CREATE TABLE IF NOT EXISTS pack_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  
  title VARCHAR(100) NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(pack_id, "order")
);

-- Pack Questions (題目)
CREATE TABLE IF NOT EXISTS pack_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES pack_chapters(id) ON DELETE CASCADE,
  
  -- Question content
  stem TEXT NOT NULL,
  choices TEXT[] NOT NULL,
  answer VARCHAR(10) NOT NULL,
  explanation TEXT,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  
  -- Metadata
  has_explanation BOOLEAN NOT NULL DEFAULT FALSE,
  confidence DECIMAL(3,2) DEFAULT 0.0,
  "order" INTEGER NOT NULL DEFAULT 0,
  question_id UUID, -- Reference to source questions table
  
  -- Quality control
  is_blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,
  blacklisted_at TIMESTAMPTZ,
  
  -- UGC fields
  is_ugc BOOLEAN DEFAULT FALSE,
  creator_id UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Pack Installations
CREATE TABLE IF NOT EXISTS user_pack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  
  -- Installation metadata
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(20) NOT NULL DEFAULT 'shop' CHECK (source IN ('shop', 'qr', 'rs_suggest', 'direct')),
  list_position INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Progress tracking
  completed_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, pack_id)
);

-- Seed Questions (官方題庫: 學測/指考)
CREATE TABLE IF NOT EXISTS seed_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Source identification
  source TEXT NOT NULL,
  source_year INTEGER,
  source_type TEXT CHECK (source_type IN ('GSAT', 'AST', 'OTHER')),
  paper_number INTEGER,
  question_number TEXT,
  
  -- Content
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'english', 'math', 'science', 'social')),
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  
  -- Options
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  
  -- Classification
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  knowledge_tags TEXT[] NOT NULL DEFAULT '{}',
  
  -- Metadata
  has_explanation BOOLEAN DEFAULT FALSE,
  explanation_file_url TEXT,
  usage_count INTEGER DEFAULT 0,
  avg_time_spent_seconds INTEGER,
  correct_rate DECIMAL(5, 4),
  
  -- Audit
  imported_by UUID REFERENCES profiles(id),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  is_official BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Question Explanations (詳解)
CREATE TABLE IF NOT EXISTS question_explanations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES seed_questions(id) ON DELETE CASCADE,
  
  explanation_text TEXT NOT NULL,
  explanation_image_url TEXT,
  mastery_focus_points TEXT[] DEFAULT '{}',
  option_analysis JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(question_id)
);

-- UGC Questions (用戶生成題目)
CREATE TABLE IF NOT EXISTS ugc_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  designer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  question_text TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  deceiver_option TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'english', 'social', 'science', 'math')),
  skill_tags TEXT[] DEFAULT '{}',
  difficulty INTEGER DEFAULT 3 CHECK (difficulty >= 1 AND difficulty <= 5),
  
  review_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  usage_count INTEGER DEFAULT 0,
  total_rewards DECIMAL(12, 2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error Book (錯題本)
CREATE TABLE IF NOT EXISTS error_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES pack_questions(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL DEFAULT 'active',
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes JSONB DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Answers (答題記錄)
CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES pack_questions(id) ON DELETE CASCADE,
  
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes for Questions & Packs
CREATE INDEX IF NOT EXISTS idx_packs_status ON packs(status);
CREATE INDEX IF NOT EXISTS idx_packs_subject_topic ON packs(subject, topic);
CREATE INDEX IF NOT EXISTS idx_packs_skill ON packs(skill);
CREATE INDEX IF NOT EXISTS idx_packs_grade ON packs(grade);
CREATE INDEX IF NOT EXISTS idx_packs_published_at ON packs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_packs_install_count ON packs(install_count DESC);
CREATE INDEX IF NOT EXISTS idx_packs_qr_alias ON packs(qr_alias);
CREATE INDEX IF NOT EXISTS idx_packs_source ON packs(source);
CREATE INDEX IF NOT EXISTS idx_packs_visibility ON packs(visibility);
CREATE INDEX IF NOT EXISTS idx_packs_subject_grade_source ON packs(subject, grade, source);

CREATE INDEX IF NOT EXISTS idx_pack_chapters_pack_id ON pack_chapters(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_chapters_order ON pack_chapters(pack_id, "order");

CREATE INDEX IF NOT EXISTS idx_pack_questions_pack_id ON pack_questions(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_questions_chapter_id ON pack_questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_pack_questions_order ON pack_questions(pack_id, "order");
CREATE INDEX IF NOT EXISTS idx_pack_questions_sampling ON pack_questions(pack_id, has_explanation, is_blacklisted, difficulty)
  WHERE has_explanation = true AND is_blacklisted = false;

CREATE INDEX IF NOT EXISTS idx_user_pack_installations_user_id ON user_pack_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pack_installations_pack_id ON user_pack_installations(pack_id);
CREATE INDEX IF NOT EXISTS idx_user_pack_installations_lookup ON user_pack_installations(user_id, pack_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_seed_questions_subject ON seed_questions(subject);
CREATE INDEX IF NOT EXISTS idx_seed_questions_difficulty ON seed_questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_seed_questions_source ON seed_questions(source);
CREATE INDEX IF NOT EXISTS idx_seed_questions_knowledge_tags ON seed_questions USING GIN(knowledge_tags);
CREATE INDEX IF NOT EXISTS idx_seed_questions_active ON seed_questions(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ugc_questions_designer_id ON ugc_questions(designer_id);
CREATE INDEX IF NOT EXISTS idx_ugc_questions_review_status ON ugc_questions(review_status);
CREATE INDEX IF NOT EXISTS idx_ugc_questions_subject ON ugc_questions(subject);

CREATE INDEX IF NOT EXISTS idx_error_book_sampling ON error_book(user_id, status, last_attempted_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_answers_recent ON user_answers(user_id, created_at, question_id);

-- Question Sets (題本商店系統 - Phase 2)
CREATE TABLE IF NOT EXISTS question_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,

  -- Creator info
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  creator_type TEXT NOT NULL DEFAULT 'OFFICIAL'
    CHECK (creator_type IN ('OFFICIAL', 'TEACHER', 'COMMUNITY', 'RAG')),

  -- Source config
  source_type TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (source_type IN ('MANUAL', 'SEED_QUESTIONS', 'UGC', 'RAG')),
  source_metadata JSONB DEFAULT '{}'::jsonb,

  -- Questions config
  question_ids UUID[] NOT NULL,
  question_source TEXT NOT NULL DEFAULT 'seed_questions'
    CHECK (question_source IN ('seed_questions', 'pack_questions', 'ugc_questions')),
  total_questions INTEGER GENERATED ALWAYS AS (array_length(question_ids, 1)) STORED,

  -- Classification
  subject TEXT CHECK (subject IN ('chinese', 'english', 'math', 'science', 'social', 'mixed')),
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  tags TEXT[] DEFAULT '{}',

  -- Store config
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  price INTEGER DEFAULT 0 CHECK (price >= 0),

  -- Statistics
  downloads INTEGER DEFAULT 0 CHECK (downloads >= 0),
  rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0.00 AND rating <= 5.00),
  review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED'))
);

CREATE INDEX IF NOT EXISTS idx_question_sets_creator ON question_sets(creator_id);
CREATE INDEX IF NOT EXISTS idx_question_sets_subject ON question_sets(subject);
CREATE INDEX IF NOT EXISTS idx_question_sets_public ON question_sets(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_question_sets_featured ON question_sets(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_question_sets_tags ON question_sets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_question_sets_downloads ON question_sets(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_question_sets_rating ON question_sets(rating DESC);
CREATE INDEX IF NOT EXISTS idx_question_sets_status ON question_sets(status);
CREATE INDEX IF NOT EXISTS idx_question_sets_search ON question_sets
  USING GIN(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

-- User Question Sets (用戶已下載題本)
CREATE TABLE IF NOT EXISTS user_question_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,

  -- Download info
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  last_practiced_at TIMESTAMPTZ,

  -- Progress
  progress_data JSONB DEFAULT '{}'::jsonb,
  practice_count INTEGER DEFAULT 0 CHECK (practice_count >= 0),

  -- Personalization
  is_favorite BOOLEAN DEFAULT false,
  custom_tags TEXT[] DEFAULT '{}',
  notes TEXT,

  UNIQUE(user_id, set_id)
);

CREATE INDEX IF NOT EXISTS idx_user_question_sets_user ON user_question_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_sets_set ON user_question_sets(set_id);
CREATE INDEX IF NOT EXISTS idx_user_question_sets_favorite ON user_question_sets(user_id, is_favorite)
  WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_question_sets_last_practiced ON user_question_sets(last_practiced_at DESC);

-- Question Set Reviews (評論系統)
CREATE TABLE IF NOT EXISTS question_set_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  set_id UUID NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(set_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_set ON question_set_reviews(set_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON question_set_reviews(user_id);

-- ============================================================================
-- 4. BATTLE & PROGRESSION DOMAIN
-- ============================================================================

-- Battle Events (from Rust engine)
CREATE TABLE IF NOT EXISTS battle_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('PVP', 'PVE_TRAINING', 'PVE_CHALLENGE')),
  
  question_id_array JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_correct_array JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  server_timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Match History
CREATE TABLE IF NOT EXISTS match_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_type TEXT NOT NULL CHECK (match_type IN ('PVE_TRAINING', 'PVP_BATTLE', 'CUSTOM_ROOM', 'RANKED', 'CONTRACT')),
  
  player1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  player2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES profiles(id),
  
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  question_list JSONB DEFAULT '[]'::jsonb,
  player1_answers JSONB DEFAULT '[]'::jsonb,
  player2_answers JSONB DEFAULT '[]'::jsonb,
  duration_seconds INTEGER DEFAULT 0,
  
  contract_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match Queue
CREATE TABLE IF NOT EXISTS match_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('RANKED', 'WEAKNESS_BATTLE', 'CUSTOM')),
  subject TEXT CHECK (subject IN ('chinese', 'english', 'social', 'science', 'math')),
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'MATCHED', 'CANCELLED')),
  match_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 seconds')
);

-- Contract Escrows (賭金系統)
CREATE TABLE IF NOT EXISTS contract_escrows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  challenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LOCKED', 'SETTLED', 'CANCELLED', 'EXPIRED')),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('PVP_BATTLE', 'CHALLENGE', 'TOURNAMENT')),
  match_id UUID,
  foundationdb_tx_id TEXT,
  expires_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  winner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (虛擬貨幣)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAW', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'REWARD', 'CONTRACT_SETTLE')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'ROLLED_BACK')),
  contract_id UUID,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battle Progression State
CREATE TABLE IF NOT EXISTS battle_progression_state (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp_multiplier NUMERIC(4,2) DEFAULT 1.0 CHECK (xp_multiplier >= 0.5),
  xp_multiplier_expires_at TIMESTAMPTZ,
  daily_streak_count INTEGER DEFAULT 0 CHECK (daily_streak_count >= 0),
  last_streaked_on DATE,
  streak_frozen BOOLEAN DEFAULT FALSE,
  streak_reward_cursor INTEGER DEFAULT 0 CHECK (streak_reward_cursor >= 0),
  tutorial_match_id UUID,
  tutorial_forced BOOLEAN DEFAULT FALSE,
  tutorial_reward_claimed BOOLEAN DEFAULT FALSE,
  active_badges JSONB DEFAULT '[]'::jsonb,
  pending_rewards JSONB DEFAULT '[]'::jsonb,
  last_progression_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battle Streak Milestones (config)
CREATE TABLE IF NOT EXISTS battle_streak_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_days INTEGER NOT NULL UNIQUE CHECK (milestone_days > 0),
  reward_chest_type TEXT CHECK (reward_chest_type IN ('BRONZE', 'GOLD')),
  reward_gold INTEGER DEFAULT 0 CHECK (reward_gold >= 0),
  reward_xp INTEGER DEFAULT 0 CHECK (reward_xp >= 0),
  reward_badge_code TEXT,
  reward_buff_hours INTEGER DEFAULT 0 CHECK (reward_buff_hours >= 0),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battle Chests
CREATE TABLE IF NOT EXISTS battle_chests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  chest_type TEXT NOT NULL CHECK (chest_type IN ('BRONZE', 'GOLD')),
  status TEXT NOT NULL DEFAULT 'UNOPENED' CHECK (status IN ('UNOPENED', 'OPENED')),
  source TEXT NOT NULL,
  rewards JSONB DEFAULT '{}'::jsonb,
  xp_delta INTEGER DEFAULT 0,
  gold_delta INTEGER DEFAULT 0,
  buff_payload JSONB DEFAULT 'null'::jsonb,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Badge Definitions
CREATE TABLE IF NOT EXISTS battle_badge_definitions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  rarity TEXT DEFAULT 'common',
  category TEXT DEFAULT 'progression',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_code TEXT REFERENCES battle_badge_definitions(code) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_code)
);

-- Achievement Definitions
CREATE TABLE IF NOT EXISTS battle_achievement_definitions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  reward_chest_type TEXT CHECK (reward_chest_type IN ('BRONZE', 'GOLD')),
  reward_gold INTEGER DEFAULT 0 CHECK (reward_gold >= 0),
  reward_xp INTEGER DEFAULT 0 CHECK (reward_xp >= 0),
  reward_badge_code TEXT REFERENCES battle_badge_definitions(code),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_code TEXT REFERENCES battle_achievement_definitions(code) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_code)
);

-- Indexes for Battle
CREATE INDEX IF NOT EXISTS idx_battle_events_user_id ON battle_events(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_match_id ON battle_events(match_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_processed ON battle_events(processed) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_battle_events_created_at ON battle_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_history_player1_id ON match_history(player1_id);
CREATE INDEX IF NOT EXISTS idx_match_history_player2_id ON match_history(player2_id);
CREATE INDEX IF NOT EXISTS idx_match_history_started_at ON match_history(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_queue_user_id ON match_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_match_queue_status ON match_queue(status);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_battle_progression_state_streak ON battle_progression_state(daily_streak_count DESC);
CREATE INDEX IF NOT EXISTS idx_battle_chests_user_status ON battle_chests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================================
-- 5. RAG & FILES DOMAIN
-- ============================================================================

-- Uploaded Files
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('student', 'teacher')),
  storage_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  page_count INTEGER DEFAULT 0,
  checksum TEXT UNIQUE NOT NULL,
  ocr_status TEXT NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'done', 'failed')),
  embed_status TEXT NOT NULL DEFAULT 'pending' CHECK (embed_status IN ('pending', 'processing', 'done', 'failed')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'assigned', 'purchased')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Pages (OCR results)
CREATE TABLE IF NOT EXISTS file_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  page_no INTEGER NOT NULL CHECK (page_no >= 0),
  text TEXT NOT NULL,
  bbox_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, page_no)
);

-- Document Chunks (for vector search)
CREATE TABLE IF NOT EXISTS doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  page_no INTEGER NOT NULL,
  chunk_idx INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-large
  anchor TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Citations
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  page_no INTEGER NOT NULL,
  chunk_idx INTEGER,
  span JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG Documents (索引)
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT CHECK (file_type IN ('pdf', 'txt')) NOT NULL,
  original_text TEXT,
  chroma_collection TEXT,
  chroma_doc_ids TEXT[],
  summary TEXT,
  keywords TEXT[],
  status TEXT CHECK (status IN ('uploading', 'processing', 'ready', 'error')) DEFAULT 'uploading',
  error_message TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- File Analysis (Elite RAG)
CREATE TABLE IF NOT EXISTS file_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Layer 1: Quick Preview
  quick_summary TEXT,
  detected_subject TEXT CHECK (detected_subject IN ('chinese', 'english', 'math', 'science', 'social', 'other')),
  detected_topics TEXT[] DEFAULT '{}',
  
  -- Layer 2: Deep Analysis
  core_concepts JSONB DEFAULT '[]',
  key_insights JSONB DEFAULT '[]',
  suggested_questions JSONB DEFAULT '[]',
  structured_notes TEXT,
  
  -- Layer 3: Exam Prediction
  exam_predictions JSONB DEFAULT '[]',
  weak_points JSONB DEFAULT '[]',
  study_roadmap JSONB DEFAULT '[]',
  
  -- Metadata
  analysis_version TEXT DEFAULT 'v1.0',
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'preview_ready', 'analysis_ready', 'prediction_ready', 'failed')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(file_id)
);

-- Exam Question Bank (AI-generated)
CREATE TABLE IF NOT EXISTS exam_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_id UUID REFERENCES file_analysis(id) ON DELETE CASCADE,
  
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay', 'calculation')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  topic_tags TEXT[] DEFAULT '{}',
  source_pages INTEGER[] DEFAULT '{}',
  source_chunks UUID[] DEFAULT '{}',
  
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  times_practiced INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for RAG
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_checksum ON files(checksum);
CREATE INDEX IF NOT EXISTS idx_files_ocr_status ON files(ocr_status);
CREATE INDEX IF NOT EXISTS idx_files_embed_status ON files(embed_status);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_pages_file_id ON file_pages(file_id);
CREATE INDEX IF NOT EXISTS idx_file_pages_page_no ON file_pages(file_id, page_no);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_file_page ON doc_chunks(file_id, page_no, chunk_idx);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding ON doc_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_citations_answer_id ON citations(answer_id);
CREATE INDEX IF NOT EXISTS idx_citations_file_page ON citations(file_id, page_no);

CREATE INDEX IF NOT EXISTS idx_rag_docs_user ON rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_status ON rag_documents(status);

CREATE INDEX IF NOT EXISTS idx_file_analysis_file_id ON file_analysis(file_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_user_id ON file_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_status ON file_analysis(status);

CREATE INDEX IF NOT EXISTS idx_exam_questions_file_id ON exam_question_bank(file_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_user_id ON exam_question_bank(user_id);

-- ============================================================================
-- 6. BACKPACK & NOTEBOOK DOMAIN
-- ============================================================================

-- [LEGACY] Old backpack schema, pending merge into notebook_entries / files
-- See Roadmap P1: "統一資料模型"
CREATE TABLE IF NOT EXISTS backpack_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'english', 'social', 'science', 'math')),
  type TEXT NOT NULL CHECK (type IN ('text', 'pdf', 'image')),
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_size INTEGER,
  derived_from TEXT[],
  version_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [LEGACY] Old backpack notes, pending merge into notebook_entries
CREATE TABLE IF NOT EXISTS backpack_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  canonical_skill TEXT NOT NULL,
  note_md TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notebook Entries (新版筆記本 - RAG 整合)
CREATE TABLE IF NOT EXISTS notebook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('summary', 'qa', 'manual', 'explain')) DEFAULT 'manual',
  subject TEXT CHECK (subject IN ('chinese', 'english', 'social', 'science', 'math')),
  
  -- RAG integration
  document_id TEXT,
  vector_collection TEXT,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  folder TEXT,
  skill_tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- AI Interactions (Ask page history)
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('summary', 'solve')),
  prompt TEXT NOT NULL,
  result TEXT,
  saved_to_backpack BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Backpack & Notebook
CREATE INDEX IF NOT EXISTS idx_backpack_user_id ON backpack_items(user_id);
CREATE INDEX IF NOT EXISTS idx_backpack_subject ON backpack_items(subject);
CREATE INDEX IF NOT EXISTS idx_backpack_notes_user_id ON backpack_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_backpack_notes_created_at ON backpack_notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notebook_user ON notebook_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_tags ON notebook_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notebook_created ON notebook_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebook_source_type ON notebook_entries(source_type);
CREATE INDEX IF NOT EXISTS idx_notebook_subject ON notebook_entries(subject);

-- ============================================================================
-- 7. MISSIONS & DAILY TASKS DOMAIN
-- ============================================================================

-- Mission Templates
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  title VARCHAR(100) NOT NULL,
  description TEXT,
  
  target_skill VARCHAR(100),
  target_topic VARCHAR(100),
  target_grade VARCHAR(20),
  
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  num_questions INTEGER NOT NULL DEFAULT 5 CHECK (num_questions BETWEEN 3 AND 10),
  
  pack_ratio DECIMAL(3,2) DEFAULT 0.7 CHECK (pack_ratio BETWEEN 0 AND 1),
  error_book_ratio DECIMAL(3,2) DEFAULT 0.3 CHECK (error_book_ratio BETWEEN 0 AND 1),
  
  mission_type VARCHAR(20) DEFAULT 'daily' CHECK (mission_type IN ('daily', 'skill_focus', 'review', 'challenge')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- User Missions (instances)
CREATE TABLE IF NOT EXISTS user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  question_ids UUID[] NOT NULL,
  question_count INTEGER NOT NULL,
  pack_count INTEGER DEFAULT 0,
  error_book_count INTEGER DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
  correct_count INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, mission_date)
);

-- Mission Logs (analytics)
CREATE TABLE IF NOT EXISTS mission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_mission_id UUID NOT NULL REFERENCES user_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL,
  payload JSONB,
  question_id UUID,
  is_correct BOOLEAN,
  time_spent_ms INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Question History (deduplication)
CREATE TABLE IF NOT EXISTS user_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context VARCHAR(50),
  was_correct BOOLEAN,
  UNIQUE(user_id, question_id, context, shown_at)
);

-- Daily Missions (personalized)
CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  mission_date DATE DEFAULT CURRENT_DATE,
  missions JSONB DEFAULT '[]'::jsonb,
  
  all_completed BOOLEAN DEFAULT false,
  rewards_claimed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, mission_date)
);

-- Indexes for Missions
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_skill ON missions(target_skill);
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(mission_type);

CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_date ON user_missions(mission_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_missions_status ON user_missions(status);
CREATE INDEX IF NOT EXISTS idx_user_missions_user_date ON user_missions(user_id, mission_date);

CREATE INDEX IF NOT EXISTS idx_mission_logs_user_mission ON mission_logs(user_mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_user_id ON mission_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_created_at ON mission_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_question_history_user ON user_question_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_history_shown_at ON user_question_history(shown_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_missions_user_date ON daily_missions(user_id, mission_date);

-- ============================================================================
-- 8. ONBOARDING DOMAIN
-- ============================================================================

-- Onboarding Sessions
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 6),
  
  -- Phase A: Quick Win
  challenge_started_at TIMESTAMPTZ,
  challenge_completed_at TIMESTAMPTZ,
  challenge_score INTEGER,
  challenge_question_ids UUID[] DEFAULT '{}',
  challenge_results JSONB DEFAULT '[]'::jsonb,
  
  -- Phase B: Goal & Data
  target_university TEXT,
  target_department TEXT,
  is_exploring BOOLEAN DEFAULT false,
  current_grade TEXT,
  mock_exam_level INTEGER CHECK (mock_exam_level BETWEEN 1 AND 15),
  
  -- Phase C: Scorecard
  scorecard_started_at TIMESTAMPTZ,
  scorecard_submitted_at TIMESTAMPTZ,
  scorecard_responses JSONB DEFAULT '{}'::jsonb,
  scorecard_report_generated_at TIMESTAMPTZ,
  scorecard_report JSONB,
  
  -- Rewards
  initial_xp_granted INTEGER DEFAULT 0,
  initial_badge_granted TEXT,
  surprise_reward JSONB,
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, status)
);

-- Onboarding Questions (challenge pool)
CREATE TABLE IF NOT EXISTS onboarding_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 3),
  
  total_shown INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  correct_rate DECIMAL(5, 4),
  
  subject TEXT DEFAULT 'english' CHECK (subject IN ('english', 'math', 'chinese')),
  knowledge_tags TEXT[] DEFAULT '{}',
  explanation TEXT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scorecard Questions
CREATE TABLE IF NOT EXISTS scorecard_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  question_number INTEGER NOT NULL UNIQUE CHECK (question_number BETWEEN 1 AND 20),
  section TEXT NOT NULL,
  section_order INTEGER,
  
  question_text TEXT NOT NULL,
  question_subtitle TEXT,
  
  response_type TEXT DEFAULT 'slider' CHECK (response_type IN ('slider', 'multiple_choice')),
  min_value INTEGER DEFAULT 1,
  max_value INTEGER DEFAULT 10,
  options JSONB,
  
  analysis_weight NUMERIC DEFAULT 1.0,
  analysis_category TEXT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding Task Configs
CREATE TABLE IF NOT EXISTS onboarding_task_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  weak_areas TEXT[] DEFAULT '{}',
  recommended_difficulty INTEGER CHECK (recommended_difficulty BETWEEN 1 AND 5),
  
  vocabulary_ratio DECIMAL(3,2) DEFAULT 0.4,
  cloze_ratio DECIMAL(3,2) DEFAULT 0.3,
  reading_ratio DECIMAL(3,2) DEFAULT 0.3,
  
  daily_task_size INTEGER DEFAULT 4 CHECK (daily_task_size BETWEEN 3 AND 6),
  study_time_target_minutes INTEGER,
  review_frequency_days INTEGER,
  
  generated_from_challenge BOOLEAN DEFAULT true,
  generated_from_scorecard BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes for Onboarding
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_step ON onboarding_sessions(current_step);

CREATE INDEX IF NOT EXISTS idx_onboarding_questions_difficulty ON onboarding_questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_onboarding_questions_active ON onboarding_questions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_onboarding_questions_subject ON onboarding_questions(subject);

CREATE INDEX IF NOT EXISTS idx_scorecard_questions_section ON scorecard_questions(section, section_order);
CREATE INDEX IF NOT EXISTS idx_scorecard_questions_active ON scorecard_questions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_onboarding_task_configs_user ON onboarding_task_configs(user_id);

-- ============================================================================
-- 9. COMMUNITY & STORE DOMAIN
-- ============================================================================

-- Posts (Community)
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Likes
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store Items
CREATE TABLE IF NOT EXISTS store_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'english', 'social', 'science', 'math', 'all')),
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  provider TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  is_free BOOLEAN DEFAULT TRUE,
  rating DECIMAL(2,1) DEFAULT 0.0,
  category TEXT DEFAULT 'recommended',
  chapters JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Purchases
CREATE TABLE IF NOT EXISTS user_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES store_items(id) ON DELETE CASCADE NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- [LEGACY] Tasks - pending merge into missions/daily_missions
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'english', 'social', 'science', 'math')),
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER DEFAULT 100,
  coin_reward INTEGER DEFAULT 50,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class Challenges
CREATE TABLE IF NOT EXISTS class_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,
  num_questions INTEGER NOT NULL CHECK (num_questions > 0),
  question_types TEXT[],
  deadline TIMESTAMPTZ,
  duration_minutes INTEGER,
  leaderboard_visible BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT FALSE,
  allow_retry BOOLEAN DEFAULT FALSE,
  visibility VARCHAR(20) DEFAULT 'class' CHECK (visibility IN ('class', 'school', 'public')),
  target_class_id VARCHAR(50),
  target_grade VARCHAR(20),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived'))
);

-- Challenge Participants
CREATE TABLE IF NOT EXISTS class_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES class_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'started', 'submitted', 'late_submitted')),
  score INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  rank INTEGER,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Indexes for Community & Store
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

CREATE INDEX IF NOT EXISTS idx_class_challenges_pack_id ON class_challenges(pack_id);
CREATE INDEX IF NOT EXISTS idx_class_challenges_status ON class_challenges(status);
CREATE INDEX IF NOT EXISTS idx_class_challenges_deadline ON class_challenges(deadline);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON class_challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON class_challenge_participants(user_id);

-- ============================================================================
-- 10. CHICK, ANALYTICS & CONCEPTS DOMAIN
-- ============================================================================

-- Chick Messages
CREATE TABLE IF NOT EXISTS chick_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('S1','S2','S3','POSITIVE')),
  text TEXT NOT NULL,
  state_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  device VARCHAR(50),
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context JSONB DEFAULT '{}',
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Concepts (考點表)
CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  definition TEXT NOT NULL,
  common_mistakes JSONB DEFAULT '[]',
  recognition_cues JSONB DEFAULT '[]',
  pattern_template JSONB DEFAULT '[]',
  related_points JSONB DEFAULT '[]',
  difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
  frequency NUMERIC CHECK (frequency BETWEEN 0 AND 1),
  ai_hint TEXT,
  example TEXT,
  example_translation TEXT,
  textbook_ref TEXT,
  cefr_level TEXT,
  tags JSONB DEFAULT '[]',
  alias JSONB DEFAULT '[]',
  search_text TSVECTOR,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concept Edges
CREATE TABLE IF NOT EXISTS concept_edges (
  src_id TEXT REFERENCES concepts(id) ON DELETE CASCADE,
  dst_id TEXT REFERENCES concepts(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  weight NUMERIC DEFAULT 0.5,
  PRIMARY KEY (src_id, dst_id, relation)
);

-- Solve Sessions
CREATE TABLE IF NOT EXISTS solve_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  subject TEXT NOT NULL,
  prompt TEXT NOT NULL,
  source_meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solve Options
CREATE TABLE IF NOT EXISTS solve_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES solve_sessions(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES concepts(id),
  label TEXT NOT NULL,
  is_answer BOOLEAN DEFAULT FALSE,
  rank INT,
  score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Chick, Analytics, Concepts
CREATE INDEX IF NOT EXISTS idx_chick_messages_user_created_at ON chick_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_id ON analytics_events(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(server_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_concepts_subject ON concepts(subject);
CREATE INDEX IF NOT EXISTS idx_concepts_search ON concepts USING gin(search_text);
CREATE INDEX IF NOT EXISTS idx_concepts_embedding ON concepts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON follows FOR ALL USING (auth.uid() = follower_id);

-- Packs
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published packs" ON packs FOR SELECT 
  USING (status = 'published' AND visibility = 'public' OR auth.uid() = created_by);

-- Pack Questions
ALTER TABLE pack_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view questions of published packs" ON pack_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM packs WHERE packs.id = pack_questions.pack_id AND packs.status = 'published'));

-- User Pack Installations
ALTER TABLE user_pack_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own installations" ON user_pack_installations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own installations" ON user_pack_installations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own installations" ON user_pack_installations FOR DELETE USING (auth.uid() = user_id);

-- Error Book
ALTER TABLE error_book ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own error book" ON error_book FOR ALL USING (auth.uid() = user_id);

-- User Answers
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own answers" ON user_answers FOR ALL USING (auth.uid() = user_id);

-- Battle Events
ALTER TABLE battle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own battle events" ON battle_events FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = opponent_id);
CREATE POLICY "Service can insert battle events" ON battle_events FOR INSERT WITH CHECK (true);

-- Match History
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own match history" ON match_history FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);

-- Battle Progression State
ALTER TABLE battle_progression_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own progression state" ON battle_progression_state FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Battle Chests
ALTER TABLE battle_chests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chests" ON battle_chests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own chests" ON battle_chests FOR UPDATE USING (auth.uid() = user_id);

-- User Badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);

-- User Achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Files
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own files" ON files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own files" ON files FOR INSERT WITH CHECK (auth.uid() = user_id AND source = 'student');
CREATE POLICY "Users update own files" ON files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own files" ON files FOR DELETE USING (auth.uid() = user_id);

-- File Pages
ALTER TABLE file_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own file pages" ON file_pages FOR SELECT
  USING (EXISTS (SELECT 1 FROM files WHERE files.id = file_pages.file_id AND files.user_id = auth.uid()));

-- Doc Chunks
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own doc chunks" ON doc_chunks FOR SELECT
  USING (EXISTS (SELECT 1 FROM files WHERE files.id = doc_chunks.file_id AND files.user_id = auth.uid()));

-- RAG Documents
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own RAG documents" ON rag_documents FOR ALL USING (auth.uid() = user_id);

-- File Analysis
ALTER TABLE file_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own analysis" ON file_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own analysis" ON file_analysis FOR ALL USING (auth.uid() = user_id);

-- Notebook Entries
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notebook entries" ON notebook_entries FOR ALL USING (auth.uid() = user_id);

-- Backpack Items
ALTER TABLE backpack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own backpack items" ON backpack_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own backpack items" ON backpack_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own backpack items" ON backpack_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own backpack items" ON backpack_items FOR DELETE USING (auth.uid() = user_id);

-- Backpack Notes
ALTER TABLE backpack_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own backpack notes" ON backpack_notes FOR ALL USING (auth.uid() = user_id);

-- AI Interactions
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own AI interactions" ON ai_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own AI interactions" ON ai_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Missions
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own missions" ON user_missions FOR ALL USING (auth.uid() = user_id);

-- Mission Logs
ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mission logs" ON mission_logs FOR ALL USING (auth.uid() = user_id);

-- User Question History
ALTER TABLE user_question_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own question history" ON user_question_history FOR ALL USING (auth.uid() = user_id);

-- Daily Missions
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own daily missions" ON daily_missions FOR ALL USING (auth.uid() = user_id);

-- Onboarding Sessions
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own onboarding sessions" ON onboarding_sessions FOR ALL USING (auth.uid() = user_id);

-- Onboarding Questions (public read)
ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active onboarding questions" ON onboarding_questions FOR SELECT USING (is_active = true);

-- Scorecard Questions (public read)
ALTER TABLE scorecard_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active scorecard questions" ON scorecard_questions FOR SELECT USING (is_active = true);

-- Onboarding Task Configs
ALTER TABLE onboarding_task_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own task config" ON onboarding_task_configs FOR ALL USING (auth.uid() = user_id);

-- Posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Store Items (public read)
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store items are viewable by everyone" ON store_items FOR SELECT USING (true);

-- Tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

-- Chick Messages
ALTER TABLE chick_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chick messages" ON chick_messages FOR ALL USING (auth.uid() = user_id);

-- Analytics Events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON analytics_events FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 12. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Energy System: Helper function for calculating next reset time (UTC+8 04:00)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_energy_reset_time()
RETURNS TIMESTAMPTZ AS $$
DECLARE
  now_taipei TIMESTAMPTZ;
  next_reset_taipei TIMESTAMPTZ;
BEGIN
  -- Get current time in Taipei timezone
  now_taipei := NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei';
  
  -- Set to 04:00 today in Taipei timezone
  next_reset_taipei := DATE_TRUNC('day', now_taipei) + INTERVAL '4 hours';
  
  -- If already past 04:00 today, set to 04:00 tomorrow
  IF next_reset_taipei <= now_taipei THEN
    next_reset_taipei := next_reset_taipei + INTERVAL '1 day';
  END IF;
  
  -- Convert back to UTC
  RETURN next_reset_taipei AT TIME ZONE 'Asia/Taipei';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Handle new user signup - 確保新用戶有滿精力值
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    daily_energy_count,
    daily_energy_reset_at,
    elo_rank
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    8, -- 滿精力值，確保新用戶可以立即開始遊戲
    get_next_energy_reset_time(), -- 精確計算下次重置時間（UTC+8 04:00）
    COALESCE((NEW.raw_user_meta_data->>'elo_rank')::INTEGER, 1000) -- 預設 ELO 分數
  )
  ON CONFLICT (id) DO NOTHING; -- 防止重複插入
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pack_questions_updated_at BEFORE UPDATE ON pack_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notebook_entries_updated_at BEFORE UPDATE ON notebook_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_items_updated_at BEFORE UPDATE ON store_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_backpack_items_updated_at BEFORE UPDATE ON backpack_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Search function for Scoped Ask
CREATE OR REPLACE FUNCTION search_doc_chunks(
  query_embedding vector(1536),
  file_id_filter UUID DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  file_id UUID,
  page_no INTEGER,
  chunk_idx INTEGER,
  content TEXT,
  anchor TEXT,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    doc_chunks.id,
    doc_chunks.file_id,
    doc_chunks.page_no,
    doc_chunks.chunk_idx,
    doc_chunks.content,
    doc_chunks.anchor,
    1 - (doc_chunks.embedding <=> query_embedding) AS similarity
  FROM doc_chunks
  WHERE (file_id_filter IS NULL OR doc_chunks.file_id = file_id_filter)
    AND doc_chunks.embedding IS NOT NULL
    AND 1 - (doc_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY doc_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Match concepts function
CREATE OR REPLACE FUNCTION match_concepts(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  definition TEXT,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    concepts.id,
    concepts.name,
    concepts.definition,
    1 - (concepts.embedding <=> query_embedding) AS similarity
  FROM concepts
  WHERE concepts.embedding IS NOT NULL
    AND 1 - (concepts.embedding <=> query_embedding) > match_threshold
  ORDER BY concepts.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- Total Tables: 62
-- Domain Structure: 10 domains
-- Last Updated: 2025-01 (T10.2)
-- ============================================================================
