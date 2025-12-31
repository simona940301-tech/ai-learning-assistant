import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getProfilesSchema() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position;
    `
    })

    if (error) {
        console.error('Error querying schema:', error)

        // Try alternative method
        const { data: altData, error: altError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1)

        if (altError) {
            console.error('Alternative query also failed:', altError)
        } else {
            console.log('Sample profile columns:', Object.keys(altData[0] || {}))
        }
    } else {
        console.log('Profiles table schema:')
        console.table(data)
    }
}

getProfilesSchema()
