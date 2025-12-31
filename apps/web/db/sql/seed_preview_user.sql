-- ============================================
-- Seed Preview/Development Mock User
-- ============================================
-- This script creates the mock user profile and sample data
-- for use in local development and Vercel preview environments.
--
-- Mock User ID: e770f9cd-52a7-43de-b983-70f6f78d2f53
-- Mock Email: dev@test.com
--
-- Usage:
--   Run this in Supabase SQL Editor to set up preview data
-- ============================================

-- 1. Create or update the mock user profile
INSERT INTO profiles (
  id,
  name,
  display_name,
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
  'Preview User',
  8,                                        -- Full energy
  NOW() + INTERVAL '1 day',                 -- Reset tomorrow
  1000,                                     -- Starting coins
  1000,                                     -- Starting Elo
  NOW(),
  NOW()
)
ON CONFLICT (id)
DO UPDATE SET
  daily_energy = 8,
  daily_energy_reset_at = NOW() + INTERVAL '1 day',
  coins = 1000,
  elo_rank = 1000,
  updated_at = NOW();

-- 2. Insert sample backpack items (錯題本)
INSERT INTO backpack_items (
  user_id,
  subject,
  question_text,
  correct_answer,
  user_answer,
  explanation,
  difficulty,
  created_at
)
VALUES
  -- Math questions
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'math',
    'What is the derivative of x²?',
    '2x',
    'x',
    'The power rule states that d/dx(xⁿ) = n·xⁿ⁻¹. For x², n=2, so the derivative is 2x.',
    2,
    NOW() - INTERVAL '1 day'
  ),
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'math',
    'Solve: 2x + 5 = 13',
    '4',
    '3',
    'Subtract 5 from both sides: 2x = 8. Then divide by 2: x = 4.',
    1,
    NOW() - INTERVAL '2 days'
  ),
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'math',
    'What is the area of a circle with radius 5?',
    '25π or approximately 78.54',
    '50',
    'The area formula is A = πr². With r=5, A = π(5²) = 25π ≈ 78.54.',
    2,
    NOW() - INTERVAL '3 days'
  ),

  -- English questions
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'english',
    'What is the past tense of "go"?',
    'went',
    'goed',
    '"Go" is an irregular verb. The past tense is "went", not "goed".',
    1,
    NOW() - INTERVAL '4 days'
  ),
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'english',
    'Choose the correct word: "Their/There/They''re going to the park."',
    'They''re',
    'There',
    '"They''re" is the contraction of "they are". "There" refers to a place, and "their" shows possession.',
    2,
    NOW() - INTERVAL '5 days'
  ),

  -- Science questions
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'science',
    'What is the chemical formula for water?',
    'H₂O',
    'H2O2',
    'Water is composed of 2 hydrogen atoms and 1 oxygen atom: H₂O. H₂O₂ is hydrogen peroxide.',
    1,
    NOW() - INTERVAL '6 days'
  ),
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'science',
    'What is the speed of light in a vacuum?',
    '299,792,458 m/s or approximately 3×10⁸ m/s',
    '300,000 m/s',
    'The exact speed of light in a vacuum is 299,792,458 m/s, commonly approximated as 3×10⁸ m/s.',
    3,
    NOW() - INTERVAL '7 days'
  )
ON CONFLICT DO NOTHING;

-- 3. Insert sample battle history (if battle_matches table exists)
-- Note: Uncomment this section if you have a battle_matches table

-- INSERT INTO battle_matches (
--   match_id,
--   player1_id,
--   player2_id,
--   player1_score,
--   player2_score,
--   winner_id,
--   created_at,
--   completed_at
-- )
-- VALUES
--   (
--     gen_random_uuid(),
--     'e770f9cd-52a7-43de-b983-70f6f78d2f53',
--     gen_random_uuid(), -- Mock opponent
--     5,
--     3,
--     'e770f9cd-52a7-43de-b983-70f6f78d2f53',
--     NOW() - INTERVAL '1 day',
--     NOW() - INTERVAL '1 day' + INTERVAL '5 minutes'
--   ),
--   (
--     gen_random_uuid(),
--     'e770f9cd-52a7-43de-b983-70f6f78d2f53',
--     gen_random_uuid(), -- Mock opponent
--     2,
--     5,
--     gen_random_uuid(), -- Lost this match
--     NOW() - INTERVAL '2 days',
--     NOW() - INTERVAL '2 days' + INTERVAL '4 minutes'
--   )
-- ON CONFLICT DO NOTHING;

-- 4. Verify the data was inserted
SELECT
  'Profile' as table_name,
  id,
  name,
  daily_energy,
  coins,
  elo_rank
FROM profiles
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'

UNION ALL

SELECT
  'Backpack Items' as table_name,
  id::text,
  subject as name,
  NULL::int as daily_energy,
  NULL::int as coins,
  NULL::int as elo_rank
FROM backpack_items
WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
ORDER BY table_name, name;

-- ============================================
-- Summary
-- ============================================
-- This script creates:
-- ✅ 1 mock user profile with full energy and starting resources
-- ✅ 7 sample backpack items across different subjects
-- ✅ Ready for local development and Vercel preview testing
-- ============================================
