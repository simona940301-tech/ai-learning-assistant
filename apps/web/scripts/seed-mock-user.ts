import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const MOCK_USER_ID = process.env.MOCK_USER_ID ?? 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
const MOCK_EMAIL = process.env.MOCK_USER_EMAIL ?? 'dev@test.com'

type ProfilePayload = Record<string, any>

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
    process.exit(1)
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  await ensureProfile(client)
  await seedBackpackItems(client)
  await seedNotebookEntries(client)

  console.log('Mock user seeded successfully.')
}

async function ensureProfile(client: SupabaseClient) {
  const nextResetAt = new Date()
  nextResetAt.setUTCHours(20, 0, 0, 0) // UTC+8 04:00 == UTC 20:00

  const profilePayloads: ProfilePayload[] = [
    {
      id: MOCK_USER_ID,
      email: MOCK_EMAIL,
      name: 'Dev User',
      daily_energy: 8,
      daily_energy_reset_at: nextResetAt.toISOString(),
      coins: 1000,
      elo_rank: 1000,
      role: 'student',
    },
    {
      id: MOCK_USER_ID,
      email: MOCK_EMAIL,
      username: 'dev-user',
      display_name: 'Dev User',
      daily_energy_count: 8,
      daily_energy_reset_at: nextResetAt.toISOString(),
      user_wallet_balance: 1000,
      elo_rank: 1000,
      role: 'student',
    },
  ]

  let lastError: Error | null = null

  for (const payload of profilePayloads) {
    const { error } = await client.from('profiles').upsert(payload, { onConflict: 'id' })
    if (!error) {
      console.log('Profile ready for mock user')
      return
    }
    lastError = new Error(error.message)
  }

  throw lastError ?? new Error('Unable to create mock profile')
}

async function seedNotebookEntries(client: SupabaseClient) {
  const samples = [
    {
      user_id: MOCK_USER_ID,
      title: '英文文法 - 不規則動詞過去式',
      content_md: '# 英文文法 - 不規則動詞\n\n## 題目\nWhat is the past tense of "go"?\n\n## 正確解答\nwent\n\n## 解題過程\n"Go" 為不規則動詞，過去式為 "went" 而不是 "goed"。這是英文中最常見的不規則動詞之一。',
      source_type: 'qa',
      tags: ['英文', '文法', '解題'],
    },
    {
      user_id: MOCK_USER_ID,
      title: '微積分 - 導數基本公式',
      content_md: '# 微積分 - 導數\n\n## 題目\nWhat is the derivative of x²?\n\n## 正確解答\n2x\n\n## 解題過程\n使用冪次法則：d/dx(xⁿ) = n·xⁿ⁻¹\n\n因此 x² 的導數是 2·x²⁻¹ = 2x',
      source_type: 'qa',
      tags: ['數學', '微積分', '解題'],
    },
    {
      user_id: MOCK_USER_ID,
      title: '化學 - 水的化學式',
      content_md: '# 化學 - 化學式\n\n## 題目\nWhat is the chemical formula for water?\n\n## 正確解答\nH₂O\n\n## 解題過程\n水由兩個氫原子與一個氧原子組成，化學式為 H₂O。\n\n注意：H₂O₂ 是雙氧水（過氧化氫），不是水。',
      source_type: 'qa',
      tags: ['自然', '化學', '解題'],
    },
  ]

  // Check if data already exists
  const { data: existing } = await client
    .from('notebook_entries')
    .select('id')
    .eq('user_id', MOCK_USER_ID)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log('Notebook entries already seeded for mock user.')
    return
  }

  const { error } = await client
    .from('notebook_entries')
    .insert(samples)

  if (error) {
    throw new Error(`Failed to seed notebook entries: ${error.message}`)
  }

  console.log(`Seeded ${samples.length} notebook entries for mock user.`)
}

async function seedBackpackItems(client: SupabaseClient) {
  const samples = [
    {
      user_id: MOCK_USER_ID,
      question: 'What is the derivative of x²?',
      canonical_skill: 'math_derivatives',
      note_md: '# 微積分 - 導數\n\n## 題目\nWhat is the derivative of x²?\n\n## 正確解答\n2x\n\n## 解題過程\n使用冪次法則：d/dx(xⁿ) = n·xⁿ⁻¹，因此 x² 的導數是 2x。',
    },
    {
      user_id: MOCK_USER_ID,
      question: 'Solve: 2x + 5 = 13',
      canonical_skill: 'math_algebra',
      note_md: '# 代數 - 方程式求解\n\n## 題目\nSolve: 2x + 5 = 13\n\n## 正確解答\n4\n\n## 解題過程\n兩邊同時減 5 得 2x = 8，再除以 2 得 x = 4。',
    },
    {
      user_id: MOCK_USER_ID,
      question: 'What is the past tense of "go"?',
      canonical_skill: 'english_grammar',
      note_md: '# 英文文法 - 不規則動詞\n\n## 題目\nWhat is the past tense of "go"?\n\n## 正確解答\nwent\n\n## 解題過程\n"Go" 為不規則動詞，過去式為 "went" 而不是 "goed"。',
    },
    {
      user_id: MOCK_USER_ID,
      question: 'What is the chemical formula for water?',
      canonical_skill: 'science_chemistry',
      note_md: '# 化學 - 化學式\n\n## 題目\nWhat is the chemical formula for water?\n\n## 正確解答\nH2O\n\n## 解題過程\n水由兩個氫原子與一個氧原子組成 (H2O)，H2O2 為雙氧水。',
    },
  ]

  // Check if data already exists
  const { data: existing } = await client
    .from('backpack_notes')
    .select('id')
    .eq('user_id', MOCK_USER_ID)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log('Backpack notes already seeded for mock user.')
    return
  }

  const { error } = await client
    .from('backpack_notes')
    .insert(samples)

  if (error) {
    throw new Error(`Failed to seed backpack notes: ${error.message}`)
  }

  console.log(`Seeded ${samples.length} backpack notes for mock user.`)
}

main().catch(error => {
  console.error('Failed to seed mock user:', error)
  process.exit(1)
})
