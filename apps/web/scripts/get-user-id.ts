import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getFirstUserId() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, user_nickname')
        .limit(1)
        .single()

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('User ID:', data.id)
    console.log('Nickname:', data.user_nickname || 'N/A')
}

getFirstUserId()
