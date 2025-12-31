-- ============================================
-- Router Classification Jobs (Async groupings)
-- Migration 037
-- ============================================

-- Creates rag_router_jobs to persist async classification status/results

CREATE TABLE IF NOT EXISTS rag_router_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_ids UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  groups JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  eta_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE rag_router_jobs IS 'Tracks async router-classify jobs per user';
COMMENT ON COLUMN rag_router_jobs.document_ids IS 'Document IDs requested for classification';
COMMENT ON COLUMN rag_router_jobs.groups IS 'Classification output grouped by subject';
COMMENT ON COLUMN rag_router_jobs.status IS 'pending, processing, completed, failed';

CREATE INDEX IF NOT EXISTS idx_router_jobs_user ON rag_router_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_router_jobs_status ON rag_router_jobs(status);
CREATE INDEX IF NOT EXISTS idx_router_jobs_created_at ON rag_router_jobs(created_at DESC);

-- Maintain updated_at automatically
CREATE OR REPLACE FUNCTION update_router_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_router_job_updated_at ON rag_router_jobs;
CREATE TRIGGER trg_update_router_job_updated_at
  BEFORE UPDATE ON rag_router_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_router_job_updated_at();

-- Enable RLS and ensure per-user isolation
ALTER TABLE rag_router_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own router jobs" ON rag_router_jobs;
CREATE POLICY "Users view own router jobs"
  ON rag_router_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert router jobs" ON rag_router_jobs;
CREATE POLICY "Users insert router jobs"
  ON rag_router_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own router jobs" ON rag_router_jobs;
CREATE POLICY "Users update own router jobs"
  ON rag_router_jobs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own router jobs" ON rag_router_jobs;
CREATE POLICY "Users delete own router jobs"
  ON rag_router_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Success notice
DO $$
BEGIN
  RAISE NOTICE '✅ Router classification jobs migration applied';
END $$;
