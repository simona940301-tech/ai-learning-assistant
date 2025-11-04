/**
 * Quick verification script for subject detection & solve-simple API
 * Run with: node scripts/verify-subject-detection.mjs
 * 
 * Tests:
 * 1. English subject detection
 * 2. Math subject detection
 * 3. Chinese subject detection
 * 4. API response structure validation
 * 
 * Requires: Node.js >= 18.0 (uses built-in fetch)
 */

const API_URL = 'http://localhost:3000/api/solve-simple';

const tests = [
  {
    name: 'English MCQ',
    prompt: 'Imagery is found throughout literature and allows readers to imagine scenes.',
    expect: 'english',
  },
  {
    name: 'Math (Cosine Law)',
    prompt: '下列哪一個描述最符合餘弦定理？ c^2=a^2+b^2-2ab cos C',
    expect: 'matha',
  },
  {
    name: 'Chinese 文意選填',
    prompt: '下列何者為文意選填之常見誤解？請選出最合適的選項。',
    expect: 'chinese',
  },
];

let passCount = 0;
let failCount = 0;

console.log('🧪 Subject Detection Verification Script');
console.log('=========================================\n');

for (const t of tests) {
  try {
    console.log(`📋 Testing: ${t.name}`);
    console.log(`   Prompt: ${t.prompt.substring(0, 50)}...`);
    
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        prompt: t.prompt, 
        mode: 'step' 
      }),
    });

    if (!res.ok) {
      console.error(`   ❌ HTTP ${res.status} - Expected 200`);
      failCount++;
      continue;
    }

    const data = await res.json();
    const detected = data.subject?.toLowerCase() ?? 'unknown';

    // Validate Contract v2 structure first
    const hasValidStructure = data.phase && data.session_id && data.subject;
    if (!hasValidStructure) {
      console.error(`   ⚠️  Missing required fields in response`);
      console.error(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200));
    }

    // Check subject detection
    if (detected === t.expect) {
      console.log(`   ✅ detected = ${detected} | expected = ${t.expect}`);
      passCount++;
    } else {
      console.error(`   ❌ Mismatch: expected ${t.expect}, got ${detected}`);
      failCount++;
    }

    console.log('');
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.substring(0, 200)}`);
    }
    failCount++;
    console.log('');
  }
}

console.log('=========================================');
console.log(`📊 Summary: ${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  console.error('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}

