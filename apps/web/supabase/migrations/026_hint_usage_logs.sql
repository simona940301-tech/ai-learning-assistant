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

CREATE INDEX idx_hint_usage_logs_user_id ON hint_usage_logs(user_id);
CREATE INDEX idx_hint_usage_logs_created_at ON hint_usage_logs(created_at DESC);
CREATE INDEX idx_hint_usage_logs_user_type ON hint_usage_logs(user_id, hint_type);

-- Enable RLS
ALTER TABLE hint_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own hint logs"
    ON hint_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hint logs"
    ON hint_usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE hint_usage_logs IS 'Tracks hint usage and effectiveness for micro-hints system';
