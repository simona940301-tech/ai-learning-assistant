// Quick test script for warmup API
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/warmup/keypoint-mcq-simple';

async function testWarmupAPI() {
  console.log('🧪 Testing Warmup API...\n');

  const testPayload = {
    prompt: '三角形 ABC，已知 a=5, b=7, C=60°，求 c=?',
    subject: 'MathA'
  };

  try {
    console.log('📤 Sending request:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`\n✅ Status: ${response.status}\n`);

    const data = await response.json();
    
    console.log('📥 Response structure:');
    console.log('- phase:', data.phase);
    console.log('- session_id:', data.session_id);
    console.log('- subject:', data.subject);
    console.log('- keypoint:', data.keypoint);
    console.log('- question.stem:', data.question?.stem);
    console.log('- question.options (count):', data.question?.options?.length || 0);
    
    if (data.question?.options) {
      console.log('\n📋 Options:');
      data.question.options.forEach((opt: any, idx: number) => {
        console.log(`  ${idx + 1}. [${opt.id}] ${opt.label.substring(0, 50)}...`);
      });
    }
    
    console.log('\n✅ API Test PASSED\n');
  } catch (error: any) {
    console.error('\n❌ API Test FAILED:', error.message);
    process.exit(1);
  }
}

testWarmupAPI();

