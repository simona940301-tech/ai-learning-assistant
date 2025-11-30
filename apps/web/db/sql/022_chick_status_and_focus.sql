-- Add focus_stats column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'focus_stats') THEN
        ALTER TABLE profiles ADD COLUMN focus_stats JSONB DEFAULT '{"total_minutes": 0, "sessions_completed": 0, "current_streak": 0}'::jsonb;
    END IF;
END $$;

-- Ensure last_active_at exists (it might already be there, but good to be safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_active_at') THEN
        ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add a function to update focus stats
CREATE OR REPLACE FUNCTION update_focus_stats(
    user_id UUID,
    minutes_focused INT
)
RETURNS VOID AS $$
DECLARE
    current_stats JSONB;
    new_total INT;
    new_sessions INT;
BEGIN
    SELECT focus_stats INTO current_stats FROM profiles WHERE id = user_id;
    
    IF current_stats IS NULL THEN
        current_stats := '{"total_minutes": 0, "sessions_completed": 0, "current_streak": 0}'::jsonb;
    END IF;

    new_total := (current_stats->>'total_minutes')::INT + minutes_focused;
    new_sessions := (current_stats->>'sessions_completed')::INT + 1;

    UPDATE profiles 
    SET focus_stats = jsonb_build_object(
        'total_minutes', new_total,
        'sessions_completed', new_sessions,
        'current_streak', (current_stats->>'current_streak')::INT -- Logic for streak can be more complex later
    )
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
