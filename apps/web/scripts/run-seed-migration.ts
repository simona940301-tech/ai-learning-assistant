import { Client } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
    console.error('❌ Missing DATABASE_URL or POSTGRES_URL in .env.local')
    process.exit(1)
}

async function run() {
    console.log('🔌 Connecting to database...')
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    })

    try {
        await client.connect()
        console.log('✅ Connected to database')

        const migrationPath = path.resolve(__dirname, '../db/sql/020_add_unique_constraint_seed_questions.sql')
        console.log(`📄 Reading migration file from: ${migrationPath}`)
        const sql = fs.readFileSync(migrationPath, 'utf8')

        console.log('🚀 Running migration...')
        await client.query(sql)
        console.log('✅ Migration applied successfully!')
    } catch (err) {
        console.error('❌ Migration failed:', err)
        process.exit(1)
    } finally {
        await client.end()
    }
}

run()
