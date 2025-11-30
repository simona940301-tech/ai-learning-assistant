import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from apps/web/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') })

async function main() {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    if (!databaseUrl) {
        console.error('Missing DATABASE_URL environment variable')
        process.exit(1)
    }

    const client = new Client({
        connectionString: databaseUrl,
    })

    try {
        await client.connect()
        console.log('Connected to database')

        const migrationPath = path.resolve(process.cwd(), 'apps/web/db/sql/016_rename_energy_and_regeneration.sql')
        const sql = fs.readFileSync(migrationPath, 'utf8')

        console.log('Applying migration...')
        await client.query(sql)
        console.log('Migration applied successfully')

    } catch (error) {
        console.error('Failed to apply migration:', error)
        process.exit(1)
    } finally {
        await client.end()
    }
}

main()
