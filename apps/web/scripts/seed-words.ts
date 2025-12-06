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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use SERVICE_ROLE for writing
const geminiKey = process.env.GEMINI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

// --- INPUT DATA ---
const WORDS_TO_SEED = [
    "ambivalent",
    "nostalgia",
    "vulnerable",
    "serendipity",
    "ephemeral",
    "resilience",
    "solitude",
    "euphoria",
    "melancholy",
    "wanderlust"
];
// ------------------

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
        "artist": "string (Prioritize: Taylor Swift, Adele, Ed Sheeran, Coldplay, BTS, Bruno Mars)",
        "song_title": "string",
        "lyric_snippet": "string (The specific line containing the word)"
      } OR null if absolutely no popular match found.
    }

    Return the result as a JSON object with a key "words" containing the array of objects.
  `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const json = JSON.parse(responseText);

        if (!Array.isArray(json.words)) {
            throw new Error("Invalid JSON structure: missing 'words' array");
        }

        // Validate each item with Zod
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

async function seed() {
    console.log(`🚀 Starting seed process for ${WORDS_TO_SEED.length} words...`);

    const BATCH_SIZE = 5;

    for (let i = 0; i < WORDS_TO_SEED.length; i += BATCH_SIZE) {
        const batch = WORDS_TO_SEED.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i / BATCH_SIZE + 1}: ${batch.join(', ')}`);

        const enrichedData = await generateWordData(batch);

        if (enrichedData.length === 0) {
            console.warn("⚠️ No valid data generated for this batch. Skipping.");
            continue;
        }

        // Upsert to Supabase
        const { error } = await supabase
            .from('words')
            .upsert(enrichedData.map(w => ({
                text: w.word,
                phonetic_us: w.phonetic_us,
                pos: w.pos,
                definition_zh: w.definition_zh,
                definition_en: w.definition_en,
                example_sentence: w.example_sentence,
                example_translation: w.example_translation,
                lyric_match: w.lyric_match
            })), { onConflict: 'text' });

        if (error) {
            console.error("❌ Supabase Upsert Error:", error);
        } else {
            console.log(`✅ Successfully inserted/updated ${enrichedData.length} words.`);
        }

        // Context-aware sleep to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("🏁 Seeding complete.");
}

seed().catch(console.error);
