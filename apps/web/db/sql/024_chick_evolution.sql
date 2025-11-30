-- ============================================
-- Chick Features Schema (Evolution)
-- ============================================

-- 1. Add columns to profiles
DO $$
BEGIN
    -- Evolution Stage (0: Egg, 1: Baby, 2: Child, 3: Teen)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chick_evolution_stage') THEN
        ALTER TABLE profiles ADD COLUMN chick_evolution_stage INTEGER DEFAULT 0 CHECK (chick_evolution_stage >= 0);
    END IF;

    -- Evolution Variant ('default', 'math', 'english', 'balanced')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chick_evolution_variant') THEN
        ALTER TABLE profiles ADD COLUMN chick_evolution_variant TEXT DEFAULT 'default';
    END IF;

    -- Unlocked Battle Buffs (JSON array of strings)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chick_buffs_unlocked') THEN
        ALTER TABLE profiles ADD COLUMN chick_buffs_unlocked JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
