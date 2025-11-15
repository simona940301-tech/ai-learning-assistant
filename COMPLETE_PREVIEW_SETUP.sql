-- ============================================
-- 完整 Preview 環境設置 SQL
-- ============================================
-- 一次執行完成所有設置，包含：
-- 1. 添加缺少的欄位 (migration)
-- 2. 創建 mock user profile
-- 3. 創建範例 backpack items
-- ============================================

-- ============================================
-- PART 1: Migration - 添加缺少的欄位
-- ============================================

-- Add daily_energy_reset_at column for lazy energy reset
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_energy_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day');

-- Add elo_rank column for matchmaking and ranking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS elo_rank INTEGER DEFAULT 1000 CHECK (elo_rank >= 0 AND elo_rank <= 3000);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_energy_reset ON profiles(daily_energy_reset_at);
CREATE INDEX IF NOT EXISTS idx_profiles_elo_rank ON profiles(elo_rank DESC);

-- Update existing profiles to have default values
UPDATE profiles
SET
  daily_energy_reset_at = COALESCE(daily_energy_reset_at, NOW() + INTERVAL '1 day'),
  elo_rank = COALESCE(elo_rank, 1000)
WHERE daily_energy_reset_at IS NULL OR elo_rank IS NULL;

-- ============================================
-- PART 2: Create Mock User Profile
-- ============================================

INSERT INTO profiles (
  id,
  email,
  username,
  display_name,
  daily_energy_count,
  daily_energy_reset_at,
  user_wallet_balance,
  elo_rank,
  created_at,
  updated_at
)
VALUES (
  'e770f9cd-52a7-43de-b983-70f6f78d2f53',
  'dev@test.com',
  'devuser',
  'Preview User',
  8,                                        -- Full energy
  NOW() + INTERVAL '1 day',                 -- Reset tomorrow
  1000,                                     -- Starting wallet balance
  1000,                                     -- Starting Elo
  NOW(),
  NOW()
)
ON CONFLICT (id)
DO UPDATE SET
  daily_energy_count = 8,
  daily_energy_reset_at = NOW() + INTERVAL '1 day',
  user_wallet_balance = 1000,
  elo_rank = 1000,
  updated_at = NOW();

-- ============================================
-- PART 3: Create Sample Backpack Items
-- ============================================
-- Note: backpack_items 表結構是為文件上傳設計的
-- 包含: title, content, type (text/pdf/image), subject

INSERT INTO backpack_items (
  user_id,
  subject,
  type,
  title,
  content,
  created_at,
  updated_at
)
VALUES
  -- Math notes
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'math',
    'text',
    'Calculus: Derivatives',
    'Key concepts:
- Power rule: d/dx(xⁿ) = n·xⁿ⁻¹
- Product rule: d/dx(uv) = u''v + uv''
- Chain rule: d/dx(f(g(x))) = f''(g(x))·g''(x)

Practice problems:
1. Find derivative of x² → Answer: 2x
2. Find derivative of 3x³ → Answer: 9x²',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'math',
    'text',
    'Algebra: Linear Equations',
    'Steps to solve 2x + 5 = 13:
1. Subtract 5 from both sides: 2x = 8
2. Divide by 2: x = 4

Common mistakes:
- Forgetting to apply operations to both sides
- Sign errors when moving terms',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'math',
    'text',
    'Geometry: Circle Formulas',
    'Circle with radius r:
- Area: A = πr²
- Circumference: C = 2πr

Example: r = 5
- Area = π(5²) = 25π ≈ 78.54
- Circumference = 2π(5) = 10π ≈ 31.42',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),

  -- English notes
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'english',
    'text',
    'Irregular Verbs',
    'Common irregular verbs:
- go → went (NOT goed)
- eat → ate
- run → ran
- see → saw
- take → took

Remember: Irregular verbs don''t follow the regular -ed pattern!',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
  ),
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'english',
    'text',
    'Their vs There vs They''re',
    'Three different words:

1. Their (possession): "Their car is red"
2. There (place/existence): "Put it over there"
3. They''re (they are): "They''re going to the park"

Tip: If you can replace with "they are", use they''re!',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),

  -- Science notes
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'science',
    'text',
    'Chemistry: Water Molecule',
    'Water (H₂O):
- 2 hydrogen atoms
- 1 oxygen atom

NOT to be confused with:
- H₂O₂ (hydrogen peroxide)
- H₃O⁺ (hydronium ion)

Water is essential for life!',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
  ),
  (
    'e770f9cd-52a7-43de-b983-70f6f78d2f53',
    'science',
    'text',
    'Physics: Speed of Light',
    'Speed of light in vacuum:
- Exact: 299,792,458 m/s
- Approximate: 3×10⁸ m/s
- Symbol: c

Fun fact: Nothing can travel faster than light in a vacuum!',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 4: Verify Setup
-- ============================================

-- Check profile
SELECT
  '✅ Profile Created' as status,
  id,
  email,
  username,
  daily_energy_count as energy,
  user_wallet_balance as wallet,
  elo_rank as elo,
  TO_CHAR(daily_energy_reset_at, 'YYYY-MM-DD HH24:MI') as energy_resets_at
FROM profiles
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Check backpack items
SELECT
  '✅ Backpack Items' as status,
  COUNT(*) as total_items,
  COUNT(CASE WHEN subject = 'math' THEN 1 END) as math,
  COUNT(CASE WHEN subject = 'english' THEN 1 END) as english,
  COUNT(CASE WHEN subject = 'science' THEN 1 END) as science
FROM backpack_items
WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- ============================================
-- Summary
-- ============================================
-- ✅ Migration completed (added daily_energy_reset_at, elo_rank)
-- ✅ Mock user profile created:
--    - ID: e770f9cd-52a7-43de-b983-70f6f78d2f53
--    - Email: dev@test.com
--    - Energy: 8/8 (resets tomorrow)
--    - Wallet: 1000 coins
--    - Elo: 1000
-- ✅ 7 backpack items created (3 math, 2 english, 2 science)
-- ✅ Ready for Preview deployment testing!
-- ============================================
