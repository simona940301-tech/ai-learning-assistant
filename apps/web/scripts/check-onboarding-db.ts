
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load env validation
const envPath = path.resolve(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
    console.error('.env.local not found')
    process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf-8')
const envConfig: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '') // remove quotes
        envConfig[key] = value
    }
})

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = envConfig['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local')
    console.log('Keys found:', Object.keys(envConfig))
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCounts() {
    console.log('Checking seed_questions...')
    const { count: seedCount, error: seedError, data: seedData } = await supabase
        .from('seed_questions')
        .select('*', { count: 'exact', head: true })

    if (seedError) console.error('Seed Error:', seedError.message)
    else console.log('Seed Questions Count:', seedCount)

    console.log('Checking onboarding_questions...')
    const { count: onboardingCount, error: onboardingError, data: obData } = await supabase
        .from('onboarding_questions')
        .select('*', { count: 'exact', head: true })

    if (onboardingError) console.error('Onboarding Error:', onboardingError.message)
    else console.log('Onboarding Questions Count:', onboardingCount)

    // Also check if any are active
    const { count: activeSeedCount } = await supabase
        .from('seed_questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
    console.log('Active Seed Questions Count:', activeSeedCount)
}

checkCounts()
