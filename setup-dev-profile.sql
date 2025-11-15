-- Setup development profile for preview mode
-- Run this with: psql <your_connection_string> -f setup-dev-profile.sql

INSERT INTO profiles (
  id,
  name,
  daily_energy,
  daily_energy_reset_at,
  coins,
  elo_rank,
  created_at,
  updated_at
)
VALUES (
  'e770f9cd-52a7-43de-b983-70f6f78d2f53',
  'Dev User',
  8,
  NOW() + INTERVAL '1 day',
  1000,
  1000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  daily_energy = 8,
  daily_energy_reset_at = NOW() + INTERVAL '1 day',
  coins = 1000,
  elo_rank = 1000;
