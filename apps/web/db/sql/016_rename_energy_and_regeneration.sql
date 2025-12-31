-- Migration: 016_rename_energy_and_regeneration.sql
-- Description: Rename daily_energy_count to daily_energy, add energy_last_updated_at column,
-- and create calculate_current_energy() helper for incremental regeneration (1 point per 30 minutes).

BEGIN;

-- 1. Rename column
ALTER TABLE public.profiles RENAME COLUMN daily_energy_count TO daily_energy;

-- 2. Add timestamp column to track last update
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS energy_last_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS daily_energy_reset_at TIMESTAMPTZ;

-- 3. Backfill existing rows: set energy_last_updated_at to now if null
UPDATE public.profiles
SET energy_last_updated_at = NOW(),
    daily_energy_reset_at = (SELECT get_next_reset_time())
WHERE energy_last_updated_at IS NULL;

-- 4. Create helper function to calculate current energy based on elapsed time

-- Helper: get next daily reset time (UTC+8 04:00)
CREATE OR REPLACE FUNCTION public.get_next_reset_time()
RETURNS TIMESTAMPTZ AS $$
DECLARE
  now_utc TIMESTAMPTZ := NOW();
  taipei_time TIMESTAMPTZ;
BEGIN
  -- Convert current UTC to Taipei time (UTC+8)
  taipei_time := now_utc AT TIME ZONE 'Asia/Taipei';
  -- Set to 04:00 today in Taipei
  taipei_time := date_trunc('day', taipei_time) + interval '4 hour';
  IF taipei_time <= now_utc AT TIME ZONE 'Asia/Taipei' THEN
    taipei_time := taipei_time + interval '1 day';
  END IF;
  -- Return as UTC
  RETURN taipei_time AT TIME ZONE 'Asia/Taipei';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_current_energy(
    p_daily_energy      INTEGER,
    p_last_updated_at   TIMESTAMPTZ,
    p_max_energy        INTEGER DEFAULT 8,
    p_interval_minutes  INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
    minutes_passed INTEGER;
    regen_points   INTEGER;
BEGIN
    IF p_last_updated_at IS NULL THEN
        RETURN p_daily_energy; -- fallback to stored value
    END IF;

    minutes_passed := FLOOR(EXTRACT(EPOCH FROM (NOW() - p_last_updated_at)) / 60);
    regen_points   := minutes_passed / p_interval_minutes;

    RETURN LEAST(p_daily_energy + regen_points, p_max_energy);
END;
$$ LANGUAGE plpgsql;

-- 5. Optional: index to speed up queries on energy_last_updated_at
CREATE INDEX IF NOT EXISTS idx_profiles_energy_last_updated_at ON public.profiles (energy_last_updated_at);

COMMIT;
