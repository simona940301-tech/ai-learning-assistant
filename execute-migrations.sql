-- =====================================================
-- STEP 1: Execute User Proficiency System Migration
-- =====================================================
-- Copy content from: apps/web/supabase/migrations/025_user_proficiency_system.sql
-- Execute in Supabase Dashboard > SQL Editor

-- =====================================================
-- User Proficiency Tracking System
-- =====================================================

-- Create user_proficiency table for historical tracking
CREATE TABLE IF NOT EXISTS user_proficiency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Proficiency Metrics
    overall_proficiency DECIMAL(5,2) NOT NULL CHECK (overall_proficiency >= 0 AND overall_proficiency <= 100),
    self_reported_level INTEGER CHECK (self_reported_level >= 1 AND self_reported_level <= 5),
    challenge_score DECIMAL(5,2) CHECK (challenge_score >= 0 AND challenge_score <= 100),
    battle_elo INTEGER,

    -- Component Scores
    accuracy_rate DECIMAL(5,2) CHECK (accuracy_rate >= 0 AND accuracy_rate <= 100),
    average_response_time_ms INTEGER,
    consistency_score DECIMAL(5,2) CHECK (consistency_score >= 0 AND consistency_score <= 100),

    -- Metadata
    calculation_method VARCHAR(50) NOT NULL DEFAULT 'weighted_composite',
    data_points_count INTEGER NOT NULL DEFAULT 0,
    confidence_level DECIMAL(5,2) CHECK (confidence_level >= 0 AND confidence_level <= 100),

    -- Dunning-Kruger Detection
    has_dunning_kruger_effect BOOLEAN DEFAULT FALSE,
    self_test_gap DECIMAL(5,2),

    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_proficiency_user_id ON user_proficiency(user_id);
CREATE INDEX IF NOT EXISTS idx_user_proficiency_calculated_at ON user_proficiency(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_proficiency_user_latest ON user_proficiency(user_id, calculated_at DESC);

-- Create subject-specific proficiency tracking
CREATE TABLE IF NOT EXISTS user_subject_proficiency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,

    -- Proficiency Metrics
    proficiency_score DECIMAL(5,2) NOT NULL CHECK (proficiency_score >= 0 AND proficiency_score <= 100),
    accuracy_rate DECIMAL(5,2) CHECK (accuracy_rate >= 0 AND accuracy_rate <= 100),
    total_questions_attempted INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,

    -- Time Metrics
    average_response_time_ms INTEGER,
    improvement_rate DECIMAL(5,2),

    -- Timestamps
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_user_subject_proficiency_user_id ON user_subject_proficiency(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subject_proficiency_subject ON user_subject_proficiency(subject);

-- Create concept-level proficiency tracking
CREATE TABLE IF NOT EXISTS user_concept_proficiency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_tag_id UUID NOT NULL REFERENCES concept_tags(id) ON DELETE CASCADE,

    -- Proficiency Metrics
    mastery_level DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,

    -- SRS Data
    next_review_at TIMESTAMP WITH TIME ZONE,
    review_interval_days INTEGER DEFAULT 1,
    ease_factor DECIMAL(4,2) DEFAULT 2.5,
    consecutive_correct INTEGER DEFAULT 0,

    -- Timestamps
    last_practiced_at TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, concept_tag_id)
);

CREATE INDEX IF NOT EXISTS idx_user_concept_proficiency_user_id ON user_concept_proficiency(user_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_proficiency_concept ON user_concept_proficiency(concept_tag_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_proficiency_next_review ON user_concept_proficiency(next_review_at);
CREATE INDEX IF NOT EXISTS idx_user_concept_proficiency_mastery ON user_concept_proficiency(mastery_level);

-- Create function to get latest proficiency
CREATE OR REPLACE FUNCTION get_latest_user_proficiency(p_user_id UUID)
RETURNS TABLE (
    overall_proficiency DECIMAL(5,2),
    self_reported_level INTEGER,
    challenge_score DECIMAL(5,2),
    battle_elo INTEGER,
    accuracy_rate DECIMAL(5,2),
    has_dunning_kruger_effect BOOLEAN,
    calculated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        up.overall_proficiency,
        up.self_reported_level,
        up.challenge_score,
        up.battle_elo,
        up.accuracy_rate,
        up.has_dunning_kruger_effect,
        up.calculated_at
    FROM user_proficiency up
    WHERE up.user_id = p_user_id
    ORDER BY up.calculated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update concept proficiency with SRS
CREATE OR REPLACE FUNCTION update_concept_proficiency(
    p_user_id UUID,
    p_concept_tag_id UUID,
    p_is_correct BOOLEAN,
    p_response_time_ms INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_current_ease DECIMAL(4,2);
    v_current_interval INTEGER;
    v_current_consecutive INTEGER;
    v_new_interval INTEGER;
    v_new_ease DECIMAL(4,2);
BEGIN
    -- Insert or get current values
    INSERT INTO user_concept_proficiency (user_id, concept_tag_id)
    VALUES (p_user_id, p_concept_tag_id)
    ON CONFLICT (user_id, concept_tag_id) DO NOTHING;

    SELECT ease_factor, review_interval_days, consecutive_correct
    INTO v_current_ease, v_current_interval, v_current_consecutive
    FROM user_concept_proficiency
    WHERE user_id = p_user_id AND concept_tag_id = p_concept_tag_id;

    -- SM-2 Algorithm (SuperMemo 2)
    IF p_is_correct THEN
        -- Increase ease factor slightly
        v_new_ease := LEAST(v_current_ease + 0.1, 3.0);
        v_current_consecutive := v_current_consecutive + 1;

        -- Calculate new interval
        IF v_current_consecutive = 1 THEN
            v_new_interval := 1;
        ELSIF v_current_consecutive = 2 THEN
            v_new_interval := 6;
        ELSE
            v_new_interval := ROUND(v_current_interval * v_new_ease)::INTEGER;
        END IF;
    ELSE
        -- Decrease ease factor
        v_new_ease := GREATEST(v_current_ease - 0.2, 1.3);
        v_current_consecutive := 0;
        v_new_interval := 1; -- Reset to beginning
    END IF;

    -- Update proficiency
    UPDATE user_concept_proficiency
    SET
        total_attempts = total_attempts + 1,
        correct_attempts = correct_attempts + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        mastery_level = (correct_attempts::DECIMAL / NULLIF(total_attempts, 0)::DECIMAL * 100),
        ease_factor = v_new_ease,
        review_interval_days = v_new_interval,
        consecutive_correct = v_current_consecutive,
        next_review_at = NOW() + (v_new_interval || ' days')::INTERVAL,
        last_practiced_at = NOW(),
        last_updated = NOW()
    WHERE user_id = p_user_id AND concept_tag_id = p_concept_tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
ALTER TABLE user_proficiency ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subject_proficiency ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_concept_proficiency ENABLE ROW LEVEL SECURITY;

-- Users can view their own proficiency data
CREATE POLICY "Users can view their own proficiency"
    ON user_proficiency FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own subject proficiency"
    ON user_subject_proficiency FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own concept proficiency"
    ON user_concept_proficiency FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert proficiency records
CREATE POLICY "System can insert proficiency records"
    ON user_proficiency FOR INSERT
    WITH CHECK (true);

CREATE POLICY "System can insert subject proficiency"
    ON user_subject_proficiency FOR INSERT
    WITH CHECK (true);

CREATE POLICY "System can insert concept proficiency"
    ON user_concept_proficiency FOR INSERT
    WITH CHECK (true);

-- System can update proficiency records
CREATE POLICY "System can update proficiency records"
    ON user_proficiency FOR UPDATE
    USING (true);

CREATE POLICY "System can update subject proficiency"
    ON user_subject_proficiency FOR UPDATE
    USING (true);

CREATE POLICY "System can update concept proficiency"
    ON user_concept_proficiency FOR UPDATE
    USING (true);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_latest_user_proficiency(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_concept_proficiency(UUID, UUID, BOOLEAN, INTEGER) TO authenticated;

-- =====================================================
-- STEP 2: Execute Hint Usage Logs Migration
-- =====================================================

-- Create hint_usage_logs table for tracking hint effectiveness
CREATE TABLE IF NOT EXISTS hint_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    hint_level INTEGER NOT NULL CHECK (hint_level >= 1 AND hint_level <= 3),
    hint_type VARCHAR(20) NOT NULL CHECK (hint_type IN ('strategic', 'conceptual', 'eliminative')),
    was_helpful BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hint_usage_logs_user_id ON hint_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_hint_usage_logs_created_at ON hint_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hint_usage_logs_user_type ON hint_usage_logs(user_id, hint_type);

-- Enable RLS
ALTER TABLE hint_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own hint logs"
    ON hint_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hint logs"
    ON hint_usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Run these to verify the migration was successful:
-- SELECT COUNT(*) FROM user_proficiency;
-- SELECT COUNT(*) FROM hint_usage_logs;
-- SELECT COUNT(*) FROM user_concept_proficiency;
