import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    const { data, error } = await supabase
        .from('words')
        .select('level');

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Count by level
    const counts: Record<number, number> = {};
    data.forEach(w => {
        counts[w.level] = (counts[w.level] || 0) + 1;
    });

    console.log('\n📊 Database Status Check:\n');
    let total = 0;

    [1, 2, 3, 4, 5, 6].forEach(lvl => {
        const count = counts[lvl] || 0;
        total += count;
        console.log(`Level ${lvl}: ${count} / ??? words`);
    });

    console.log(`\nTotal: ${total} words\n`);
}

checkStatus();
