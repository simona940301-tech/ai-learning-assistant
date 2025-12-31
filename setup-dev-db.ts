import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

const DEV_USER_ID = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'

async function setupDevProfile() {
  console.log('🔧 Setting up dev profile for preview mode...')
  
  // Check if profiles table has the required columns
  const { data: profile, error: checkError } = await supabase
    .from('profiles')
    .select('id, name, daily_energy, coins, elo_rank')
    .eq('id', DEV_USER_ID)
    .single()

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
    console.error('❌ Error checking profile:', checkError)
    
    // Check if it's a column missing error
    if (checkError.message?.includes('column') && checkError.message?.includes('does not exist')) {
      console.error('⚠️  Missing columns in profiles table. Please run migrations:')
      console.error('   1. supabase/migrations/20250127_add_battle_fields.sql')
      console.error('   2. supabase/migrations/20250127_add_coins_field.sql')
      console.error('\nYou can run them manually in your Supabase SQL editor.')
      process.exit(1)
    }
    
    process.exit(1)
  }

  if (profile) {
    console.log('✅ Dev profile already exists:', profile)
    console.log(`   - Energy: ${profile.daily_energy || 'N/A'}`)
    console.log(`   - Coins: ${profile.coins || 'N/A'}`)
    console.log(`   - Elo: ${profile.elo_rank || 'N/A'}`)
    
    // Update to ensure full energy
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        daily_energy: 8,
        coins: profile.coins || 1000,
        elo_rank: profile.elo_rank || 1000,
      })
      .eq('id', DEV_USER_ID)
    
    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      process.exit(1)
    }
    
    console.log('✅ Dev profile refreshed with full energy')
  } else {
    // Create new profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: DEV_USER_ID,
        name: 'Dev User',
        daily_energy: 8,
        coins: 1000,
        elo_rank: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        daily_energy_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

    if (insertError) {
      console.error('❌ Error creating profile:', insertError)
      process.exit(1)
    }

    console.log('✅ Dev profile created successfully')
  }
}

setupDevProfile()
