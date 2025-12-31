import { Client } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Try to find a connection string
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
    console.error('❌ Missing DATABASE_URL or POSTGRES_URL in .env.local')
    console.log('👉 Please run the following SQL manually in your Supabase Dashboard SQL Editor:')
    console.log('--------------------------------------------------------------------------------')
    const migrationPath = path.resolve(__dirname, '../db/sql/025_update_rls_for_pve.sql')
    console.log(fs.readFileSync(migrationPath, 'utf8'))
    console.log('--------------------------------------------------------------------------------')
    process.exit(1)
}

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase transaction mode usually
    })

    try {
        await client.connect()
        console.log('✅ Connected to database')

        const migrationPath = path.resolve(__dirname, '../db/sql/025_update_rls_for_pve.sql')
        const sql = fs.readFileSync(migrationPath, 'utf8')

        console.log('Running migration...')
        await client.query(sql)
        console.log('✅ Migration applied successfully!')
    } catch (err) {
        console.error('❌ Migration failed:', err)
    } finally {
        await client.end()
    }
}

run()
