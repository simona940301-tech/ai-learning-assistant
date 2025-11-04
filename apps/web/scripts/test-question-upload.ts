/**
 * Test Question Upload Pipeline
 *
 * Usage: npx tsx scripts/test-question-upload.ts
 */

import { createPLMSClient } from '@plms/shared/sdk';

async function testQuestionUpload() {
  console.log('🧪 Testing Question Upload Pipeline...\n');

  const plms = createPLMSClient({
    baseUrl: 'http://localhost:3000',
    platform: 'web',
  });

  try {
    // Test 1: Create sample CSV
    console.log('📄 Creating sample CSV file...');
    const csvContent = `stem,answer,choices,subject,explanation
"What is 2 + 2?","4","3,4,5,6","math","Simple addition"
"What is the capital of France?","Paris","London,Paris,Berlin,Madrid","geography","France's capital"
"Solve: x + 5 = 10","5","3,4,5,6","math","Subtract 5 from both sides"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'sample-questions.csv');

    // Test 2: Upload file
    console.log('⬆️  Uploading file...');
    const uploadResult = await plms.internal.questionUpload.uploadFile(formData);
    console.log('✅ Upload result:', uploadResult);

    // Test 3: Process first question
    if (uploadResult.questionIds && uploadResult.questionIds.length > 0) {
      const rawId = uploadResult.questionIds[0];
      console.log(`\n🔄 Processing question: ${rawId}`);

      const processedQuestion = await plms.internal.questionUpload.processRawQuestion(rawId);
      console.log('✅ Processed question:', {
        id: processedQuestion.id,
        difficulty: processedQuestion.aiLabel.difficulty,
        confidence: processedQuestion.aiLabel.confidence,
        isDuplicate: processedQuestion.isDuplicate,
      });

      // Test 4: Override difficulty
      console.log('\n🔧 Overriding difficulty...');
      const overridden = await plms.internal.questionUpload.overrideDifficulty({
        questionId: processedQuestion.id,
        difficulty: 'expert',
        overriddenBy: 'test-admin',
        source: 'manual_review',
      });
      console.log('✅ Override result:', {
        id: overridden.id,
        aiDifficulty: overridden.aiLabel.difficulty,
        manualDifficulty: overridden.manualOverride?.difficulty,
      });
    }

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testQuestionUpload().catch(console.error);
