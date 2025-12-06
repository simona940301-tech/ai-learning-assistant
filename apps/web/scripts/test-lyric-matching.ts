import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WordDataSchema } from '../lib/schemas/lyrical-flow';
import type { WordData } from '../lib/schemas/lyrical-flow';
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
const geminiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

// Test words - mix of common and challenging words
const TEST_WORDS = [
    "love", "dream", "heart", "beautiful", "lonely",
    "broken", "forever", "crazy", "wild", "free"
];

async function generateWordData(words: string[]): Promise<WordData[]> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const prompt = `
    You are a linguistic expert and pop culture historian.
    Generate a JSON object containing a list of enriched vocabulary data for the following words: ${words.join(', ')}.

    For EACH word, strictly follow this schema:
    {
      "word": "string",
      "phonetic_us": "string (IPA)",
      "pos": "string (e.g., adj., n., v.)",
      "definition_zh": "string (Traditional Chinese, Taiwan usage, concise)",
      "definition_en": "string (Simple English definition)",
      "example_sentence": "string (B2/C1 level example)",
      "example_translation": "string (Chinese translation of the example)",
      "lyric_match": {
        "artist": "string (Prioritize: Taylor Swift, Adele, Ed Sheeran, Coldplay, BTS, Bruno Mars, The Weeknd, Ariana Grande)",
        "song_title": "string",
        "lyric_snippet": "string (CRITICAL: The lyric line MUST contain the exact word or its variants. Example: for 'love', the snippet must include 'love', 'loved', 'loving', etc.)"
      } OR null if no popular song lyric contains this word.
    }

    IMPORTANT RULES:
    1. The "lyric_snippet" MUST be a real, authentic line from the song that contains the target word or its variants.
    2. DO NOT fabricate or modify lyrics. If the word doesn't appear in any popular song, set lyric_match to null.
    3. Prioritize mainstream pop/rock artists with clear, recognizable lyrics.
    4. For each word, verify that the lyric snippet actually contains the word before including it.

    Return the result as a JSON object with a key "words" containing the array of objects.
  `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const json = JSON.parse(responseText);

    if (!Array.isArray(json.words)) {
        throw new Error("Invalid JSON structure");
    }

    const validatedData: WordData[] = [];
    for (const item of json.words) {
        try {
            const parsed = WordDataSchema.parse(item);
            validatedData.push(parsed);
        } catch (zodError) {
            console.error(`Validation failed for word "${item.word}":`, zodError);
        }
    }

    return validatedData;
}

async function test() {
    console.log('🧪 Testing improved lyric matching with 10 words...\n');

    const enrichedData = await generateWordData(TEST_WORDS);

    console.log(`✅ Generated ${enrichedData.length}/${TEST_WORDS.length} words\n`);

    enrichedData.forEach((word, idx) => {
        console.log(`${idx + 1}. 【${word.word}】`);
        console.log(`   定義: ${word.definition_zh}`);
        console.log(`   例句: ${word.example_sentence}`);

        if (word.lyric_match) {
            const snippet = word.lyric_match.lyric_snippet.toLowerCase();
            const targetWord = word.word.toLowerCase();
            const containsWord = snippet.includes(targetWord);

            console.log(`   🎵 ${word.lyric_match.artist} - ${word.lyric_match.song_title}`);
            console.log(`      "${word.lyric_match.lyric_snippet}"`);
            console.log(`      ✓ Contains word: ${containsWord ? '✅ YES' : '❌ NO'}`);
        } else {
            console.log(`   🎵 (未找到歌詞)`);
        }
        console.log('');
    });

    // Calculate success rate
    const withLyrics = enrichedData.filter(w => w.lyric_match !== null);
    const validLyrics = withLyrics.filter(w =>
        w.lyric_match!.lyric_snippet.toLowerCase().includes(w.word.toLowerCase())
    );

    console.log(`\n📊 統計:`);
    console.log(`   有歌詞: ${withLyrics.length}/${enrichedData.length}`);
    console.log(`   歌詞正確包含單字: ${validLyrics.length}/${withLyrics.length}`);
    console.log(`   準確率: ${withLyrics.length > 0 ? ((validLyrics.length / withLyrics.length) * 100).toFixed(1) : 0}%\n`);
}

test().catch(console.error);
