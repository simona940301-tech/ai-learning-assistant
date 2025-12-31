-- View recent Postgres logs to see trigger errors
-- Run this in Supabase SQL Editor after attempting Google sign up

SELECT 
  log_time,
  message,
  detail,
  hint,
  context
FROM pg_stat_statements_info
WHERE message LIKE '%handle_new_user%'
ORDER BY log_time DESC
LIMIT 20;

-- Alternative: Check for recent errors
SELECT 
  *
FROM pg_stat_activity
WHERE state = 'idle in transaction (aborted)'
  OR wait_event_type IS NOT NULL
ORDER BY state_change DESC
LIMIT 10;
