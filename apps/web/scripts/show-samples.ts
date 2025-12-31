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

async function showSamples() {
    const { data, error } = await supabase
        .from('words')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('\n📚 最近生成的 10 個單字範例：\n');

    data?.forEach((word, idx) => {
        console.log(`${idx + 1}. 【${word.text}】 (Level ${word.level})`);
        console.log(`   音標: ${word.phonetic_us}`);
        console.log(`   詞性: ${word.pos}`);
        console.log(`   中文: ${word.definition_zh}`);
        console.log(`   例句: ${word.example_sentence}`);
        console.log(`   翻譯: ${word.example_translation}`);

        if (word.lyric_match) {
            console.log(`   🎵 歌詞: ${word.lyric_match.artist} - ${word.lyric_match.song_title}`);
            console.log(`      "${word.lyric_match.lyric_snippet}"`);
        } else {
            console.log(`   🎵 歌詞: (未找到)`);
        }
        console.log('');
    });

    // Show total count
    const { count } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true });

    console.log(`\n✅ 資料庫中目前共有 ${count} 個單字\n`);
}

showSamples();
