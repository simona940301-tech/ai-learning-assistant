-- ============================================
-- Chick Features Schema (Feeding & Exploration)
-- ============================================

-- 1. Add columns to profiles
DO $$
BEGIN
    -- Hunger (0-100, default 50)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chick_hunger') THEN
        ALTER TABLE profiles ADD COLUMN chick_hunger INTEGER DEFAULT 50 CHECK (chick_hunger >= 0 AND chick_hunger <= 100);
    END IF;

    -- Intimacy (0-?, default 0)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chick_intimacy') THEN
        ALTER TABLE profiles ADD COLUMN chick_intimacy INTEGER DEFAULT 0 CHECK (chick_intimacy >= 0);
    END IF;

    -- Food Bowls Inventory
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'food_bowls_count') THEN
        ALTER TABLE profiles ADD COLUMN food_bowls_count INTEGER DEFAULT 0 CHECK (food_bowls_count >= 0);
    END IF;

    -- Exploration Start Time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chick_exploration_start_at') THEN
        ALTER TABLE profiles ADD COLUMN chick_exploration_start_at TIMESTAMPTZ;
    END IF;

    -- Exploration Allowance (Coins given for the trip)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chick_exploration_allowance') THEN
        ALTER TABLE profiles ADD COLUMN chick_exploration_allowance INTEGER DEFAULT 0 CHECK (chick_exploration_allowance >= 0);
    END IF;
END $$;

-- 2. Index for exploration checks
CREATE INDEX IF NOT EXISTS idx_profiles_chick_exploration_start_at ON profiles(chick_exploration_start_at);
