import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables (try .env.local first, then .env)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

async function main() {
    console.log('🔄 Applying vocabulary schema migration...');

    // Try to find connection string
    const connectionString =
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.SUPABASE_DB_URL;

    if (!connectionString) {
        console.error('❌ Error: Missing database connection string.');
        console.error('Please ensure DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL is set in your .env or environment.');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('✅ Connected to database.');

        const migrationPath = path.join(process.cwd(), 'apps/web/db/migrations/fix_vocabulary_schema.sql');

        if (!fs.existsSync(migrationPath)) {
            // Fallback if running from root
            const altPath = path.join(process.cwd(), 'db/migrations/fix_vocabulary_schema.sql');
            if (!fs.existsSync(altPath)) {
                throw new Error(`Migration file not found at ${migrationPath}`);
            }
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Executing SQL...');
        await client.query(sql);

        console.log('✅ Migration applied successfully!');
        console.log('   - Updated source_type constraint');
        console.log('   - Added unique index for upsert');

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
