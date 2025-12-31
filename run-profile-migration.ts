/**
 * Run Profile Migration
 *
 * Adds missing fields to profiles table
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

async function runMigration() {
  console.log('🔧 Running profile migration...\n')

  try {
    // Check current structure first
    console.log('📋 Checking current profile structure...')
    const { data: sampleProfile } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single()

    if (sampleProfile) {
      const hasFields = {
        bio: 'bio' in sampleProfile,
        email_notifications: 'email_notifications' in sampleProfile,
        push_notifications: 'push_notifications' in sampleProfile,
      }

      console.log('Current fields:')
      console.log(`  - bio: ${hasFields.bio ? '✓' : '✗'}`)
      console.log(`  - email_notifications: ${hasFields.email_notifications ? '✓' : '✗'}`)
      console.log(`  - push_notifications: ${hasFields.push_notifications ? '✓' : '✗'}`)

      if (hasFields.bio && hasFields.email_notifications && hasFields.push_notifications) {
        console.log('\n✅ All fields already exist! No migration needed.')
        return
      }
    }

    console.log('\n📝 Migration SQL needed:')
    console.log(`
-- Add missing profile fields (run this in Supabase SQL Editor)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url);

-- Add comments
COMMENT ON COLUMN profiles.bio IS 'User bio/description, max 200 characters';
COMMENT ON COLUMN profiles.email_notifications IS 'Enable email notifications';
COMMENT ON COLUMN profiles.push_notifications IS 'Enable push notifications';
`)

    console.log('\n⚠️  Please run the above SQL in your Supabase SQL Editor.')
    console.log('   Dashboard → SQL Editor → New Query → Paste & Run\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runMigration()
