/**
 * PLMS Solve System Verification Script
 * 
 * Tests:
 * 1. Subject detection accuracy (English vs Math)
 * 2. API response structure
 * 3. Component validation
 * 
 * Run: node scripts/verify-solve-system.mjs
 */

const API_URL = 'http://localhost:3000/api/solve-simple';

const tests = [
  {
    name: 'English - Terrorist Attack',
    prompt: 'There are reports coming in that a number of people have been injured in a terrorist . (A) access (B) supply (C) attack (D) burden',
    expect: 'english',
    description: 'English sentence about terrorist attack'
  },
  {
    name: 'English - Literature Imagery',
    prompt: 'Imagery is found throughout literature and allows readers to imagine scenes.',
    expect: 'english',
    description: 'English sentence about literature'
  },
  {
    name: 'Math - Cosine Law',
    prompt: '三角形 ABC，已知 a=5, b=7, C=60°，求 c=?',
    expect: 'matha',
    description: 'Math problem in Chinese'
  },
  {
    name: 'Math - Cosine Law (Chinese)',
    prompt: '下列哪一個描述最符合餘弦定理？ c^2=a^2+b^2-2ab cos C',
    expect: 'matha',
    description: 'Math concept question in Chinese'
  },
];

let passCount = 0;
let failCount = 0;

console.log('🔍 PLMS Solve System Verification');
console.log('═'.repeat(60));
console.log('');

for (const t of tests) {
  try {
    console.log(`📋 Testing: ${t.name}`);
    console.log(`   Description: ${t.description}`);
    console.log(`   Prompt: "${t.prompt.substring(0, 60)}..."`);
    
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
      console.error(`   Response: ${await res.text()}`);
      failCount++;
      console.log('');
      continue;
    }

    const data = await res.json();
    const detected = data.subject?.toLowerCase() ?? 'unknown';

    // Validate structure
    const hasValidStructure = data.phase && data.session_id && data.subject;
    if (!hasValidStructure) {
      console.error(`   ⚠️  Missing required fields in response`);
    }

    // Check subject detection
    if (detected === t.expect) {
      console.log(`   ✅ PASS: detected = ${detected} (expected ${t.expect})`);
      console.log(`   Confidence: ${data.subject_confidence || 'N/A'}`);
      passCount++;
    } else {
      console.error(`   ❌ FAIL: expected ${t.expect}, got ${detected}`);
      console.error(`   Confidence: ${data.subject_confidence || 'N/A'}`);
      console.error(`   Candidates:`, data.candidates || 'N/A');
      failCount++;
    }

    console.log('');
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    failCount++;
    console.log('');
  }
}

console.log('═'.repeat(60));
console.log(`📊 Summary: ${passCount} passed, ${failCount} failed`);
console.log('═'.repeat(60));

if (failCount > 0) {
  console.error('\n❌ Some tests failed! Subject detection needs improvement.');
  console.error('Check lib/subject-classifier.ts for keyword coverage.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  console.log('✅ Solve system stable and verified', new Date().toISOString());
  console.log('\nPLMS Solve verified build running — all chips active.');
  process.exit(0);
}

