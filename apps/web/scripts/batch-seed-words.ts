import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WordDataSchema } from '../lib/schemas/lyrical-flow';
import type { WordData } from '../lib/schemas/lyrical-flow';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local manually
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

if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

// Load word bank JSON
const wordBankPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'plms_word_bank.json');
const wordBank = JSON.parse(fs.readFileSync(wordBankPath, 'utf-8'));

async function generateWordData(words: string[], level: number): Promise<WordData[]> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const prompt = `
    You are a linguistic expert. Generate enriched vocabulary data for: ${words.join(', ')}.

    For EACH word, return this JSON structure:
    {
      "word": "string",
      "phonetic_us": "string (IPA format)",
      "pos": "string (e.g., n., v., adj.)",
      "definition_zh": "string (Traditional Chinese, concise)",
      "definition_en": "string (Simple English)",
      "example_sentence": "string (B2 level)",
      "example_translation": "string (Chinese)",
      "lyric_match": {
        "artist": "string",
        "song_title": "string",
        "lyric_snippet": "string"
      } OR null
    }

    RULES:
    1. Focus on accurate definitions and examples.
    2. Lyric matching is OPTIONAL - only include if you're confident it's a real, popular song lyric.
    3. If unsure about lyrics, set lyric_match to null.

    Return: {"words": [array of word objects]}
  `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const json = JSON.parse(responseText);

        if (!Array.isArray(json.words)) {
            throw new Error("Invalid JSON structure: missing 'words' array");
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

    } catch (error) {
        console.error("AI Generation failed:", error);
        return [];
    }
}

async function processLevel(levelName: string, levelNumber: number) {
    const words: string[] = wordBank[levelName];
    if (!words || words.length === 0) {
        console.log(`⚠️ No words found for ${levelName}`);
        return;
    }

    console.log(`\n📚 Processing ${levelName}: ${words.length} words`);

    const BATCH_SIZE = 5;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < words.length; i += BATCH_SIZE) {
        const batch = words.slice(i, i + BATCH_SIZE);
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(words.length / BATCH_SIZE)}: ${batch.join(', ')}`);

        const { data: existing } = await supabase
            .from('words')
            .select('text')
            .in('text', batch);

        const existingTexts = new Set(existing?.map(e => e.text) || []);
        const wordsToProcess = batch.filter(w => !existingTexts.has(w));

        if (wordsToProcess.length === 0) {
            console.log(`  ⏩ Batch ${Math.floor(i / BATCH_SIZE) + 1} skipped (all words exist)`);
            continue;
        }

        const enrichedData = await generateWordData(wordsToProcess, levelNumber);

        if (enrichedData.length === 0) {
            console.warn("  ⚠️ No valid data generated for this batch. Skipping.");
            failCount += batch.length;
            continue;
        }

        const { error } = await supabase
            .from('words')
            .upsert(enrichedData.map(w => ({
                text: w.word,
                phonetic_us: w.phonetic_us,
                pos: w.pos,
                level: levelNumber,
                definition_zh: w.definition_zh,
                definition_en: w.definition_en,
                example_sentence: w.example_sentence,
                example_translation: w.example_translation,
                lyric_match: w.lyric_match
            })), { onConflict: 'text' });

        if (error) {
            console.error("  ❌ Supabase Upsert Error:", error);
            failCount += enrichedData.length;
        } else {
            console.log(`  ✅ Successfully inserted/updated ${enrichedData.length} words.`);
            successCount += enrichedData.length;
        }

        // Rate limiting: wait 1 second between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n${levelName} Summary: ✅ ${successCount} success, ❌ ${failCount} failed\n`);
}

async function main() {
    console.log('🚀 Starting batch word enrichment process...\n');

    // Process each level
    await processLevel('level_1', 1);
    await processLevel('level_2', 2);
    await processLevel('level_3', 3);
    await processLevel('level_4', 4);
    await processLevel('level_5', 5);
    await processLevel('level_6', 6);

    console.log('🏁 All levels processed.');
}

main().catch(console.error);
