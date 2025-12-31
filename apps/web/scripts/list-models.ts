import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key?.trim() === 'GEMINI_API_KEY' && value) {
            apiKey = value.trim();
        }
    });
}

if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
}

async function listModels() {
    console.log('🔍 Querying API for available models...');
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error('❌ API Error:', data.error);
            return;
        }

        if (!data.models) {
            console.log('⚠️ No models returned. Raw response:', data);
            return;
        }

        console.log('\n✅ Available Models:');
        data.models.forEach((model: any) => {
            console.log(`- ${model.name} (Supported methods: ${model.supportedGenerationMethods?.join(', ')})`);
        });

    } catch (error) {
        console.error('❌ Network Error:', error);
    }
}

listModels();
