/**
 * Module 3: Micro-Mission Cards - Flow Test
 *
 * Tests the complete mission journey:
 * 1. Get missions (check today/streak)
 * 2. Start mission (sampling + creation)
 * 3. Answer questions (correct/incorrect)
 * 4. Complete mission (save results)
 * 5. Immediate Retry (get similar question)
 */

import { createPLMSClient } from '@plms/shared/sdk';

interface TestResult {
  step: string;
  status: 'pass' | 'fail';
  message: string;
  data?: any;
}

async function runMissionFlowTest() {
  const results: TestResult[] = [];

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Module 3: Micro-Mission Cards - Flow Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Initialize client
  const client = createPLMSClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    token: process.env.TEST_USER_TOKEN,
  });

  let userMissionId: string | null = null;
  let questionIds: string[] = [];

  // ========================================
  // Step 1: Get Missions
  // ========================================
  console.log('📋 Step 1: Get missions (today + streak)');
  try {
    const missions = await client.mission.getMissions();

    console.log(`  ✅ Missions retrieved`);
    console.log(`     - Today's mission: ${missions.today ? 'Exists' : 'Not yet'}`);
    console.log(`     - Recent missions: ${missions.recent.length}`);
    console.log(`     - Streak: ${missions.streak} days`);
    console.log(`     - Total completed: ${missions.totalCompleted}`);

    results.push({
      step: '1. Get missions',
      status: 'pass',
      message: `Streak: ${missions.streak}, Total: ${missions.totalCompleted}`,
      data: { streak: missions.streak, totalCompleted: missions.totalCompleted },
    });
  } catch (error) {
    console.log('  ❌ Get missions failed:', error);
    results.push({
      step: '1. Get missions',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  console.log('');

  // ========================================
  // Step 2: Start Mission
  // ========================================
  console.log('🚀 Step 2: Start today\'s mission');
  try {
    const startResponse = await client.mission.startMission();

    if (startResponse.success && startResponse.userMission) {
      userMissionId = startResponse.userMission.id;
      questionIds = startResponse.userMission.questionIds;

      console.log(`  ✅ Mission started`);
      console.log(`     - Mission ID: ${userMissionId}`);
      console.log(`     - Questions: ${startResponse.userMission.questionCount}`);
      console.log(`     - From packs: ${startResponse.userMission.packCount}`);
      console.log(`     - From error book: ${startResponse.userMission.errorBookCount}`);

      if (startResponse.userMission.questions) {
        console.log(`\n  Sample question:`);
        const q = startResponse.userMission.questions[0];
        console.log(`    Q: ${q.stem.substring(0, 60)}...`);
        console.log(`    Choices: ${q.choices.length} options`);
        console.log(`    Difficulty: ${q.difficulty}`);
        console.log(`    Has explanation: ${q.hasExplanation}`);
      }

      results.push({
        step: '2. Start mission',
        status: 'pass',
        message: `Created with ${startResponse.userMission.questionCount} questions`,
        data: {
          missionId: userMissionId,
          questionCount: startResponse.userMission.questionCount,
        },
      });
    } else {
      console.log(`  ❌ Mission start failed`);
      results.push({
        step: '2. Start mission',
        status: 'fail',
        message: startResponse.message || 'Unknown error',
      });
    }
  } catch (error) {
    console.log('  ❌ Start mission error:', error);
    results.push({
      step: '2. Start mission',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  console.log('');

  // ========================================
  // Step 3: Answer Questions
  // ========================================
  console.log('✍️  Step 3: Answer questions');
  if (userMissionId && questionIds.length > 0) {
    try {
      // Answer first question correctly
      const answerResponse = await client.mission.answerQuestion({
        userMissionId,
        questionId: questionIds[0],
        answer: 'A', // Assuming A is correct (for test)
        timeSpentMs: 5000,
      });

      console.log(`  Question 1:`);
      console.log(`    - Answer submitted: ${answerResponse.isCorrect ? 'Correct ✅' : 'Incorrect ❌'}`);
      console.log(`    - Correct answer: ${answerResponse.correctAnswer}`);
      console.log(`    - Progress: ${answerResponse.progress.totalAnswered}/${answerResponse.progress.questionCount}`);

      results.push({
        step: '3. Answer questions',
        status: 'pass',
        message: `Answered ${answerResponse.progress.totalAnswered} questions`,
        data: { progress: answerResponse.progress },
      });
    } catch (error) {
      console.log('  ❌ Answer question failed:', error);
      results.push({
        step: '3. Answer questions',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    console.log('  ⏭️  Skipped (no mission ID)');
    results.push({
      step: '3. Answer questions',
      status: 'fail',
      message: 'Skipped - no mission available',
    });
  }
  console.log('');

  // ========================================
  // Step 4: Get Similar Question (Immediate Retry)
  // ========================================
  console.log('🔁 Step 4: Get similar question for retry');
  if (questionIds.length > 0) {
    try {
      const similarResponse = await client.mission.getSimilarQuestion({
        currentQuestionId: questionIds[0],
        skill: '一元一次方程式', // Example skill
        difficulty: 'medium',
      });

      if (similarResponse.success && similarResponse.question) {
        console.log(`  ✅ Similar question found`);
        console.log(`     - Question ID: ${similarResponse.question.id}`);
        console.log(`     - Skill: ${similarResponse.question.skill}`);
        console.log(`     - Difficulty: ${similarResponse.question.difficulty}`);
        console.log(`     - Stem: ${similarResponse.question.stem.substring(0, 50)}...`);

        results.push({
          step: '4. Get similar question',
          status: 'pass',
          message: 'Similar question retrieved',
          data: { questionId: similarResponse.question.id },
        });
      } else {
        console.log(`  ⚠️  No similar question available`);
        console.log(`     - Message: ${similarResponse.message}`);

        results.push({
          step: '4. Get similar question',
          status: 'pass',
          message: 'No similar questions (expected)',
        });
      }
    } catch (error) {
      console.log('  ❌ Get similar question failed:', error);
      results.push({
        step: '4. Get similar question',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    console.log('  ⏭️  Skipped (no questions)');
    results.push({
      step: '4. Get similar question',
      status: 'fail',
      message: 'Skipped - no questions available',
    });
  }
  console.log('');

  // ========================================
  // Step 5: Complete Mission
  // ========================================
  console.log('✅ Step 5: Complete mission');
  if (userMissionId) {
    try {
      const completeResponse = await client.mission.completeMission({
        userMissionId,
        timeSpentSeconds: 180, // 3 minutes
      });

      if (completeResponse.success && completeResponse.summary) {
        console.log(`  ✅ Mission completed`);
        console.log(`     - Correct: ${completeResponse.summary.correctCount}/${completeResponse.summary.totalQuestions}`);
        console.log(`     - Accuracy: ${(completeResponse.summary.accuracy * 100).toFixed(0)}%`);
        console.log(`     - Time spent: ${completeResponse.summary.timeSpentSeconds}s`);

        results.push({
          step: '5. Complete mission',
          status: 'pass',
          message: `Completed with ${(completeResponse.summary.accuracy * 100).toFixed(0)}% accuracy`,
          data: { summary: completeResponse.summary },
        });
      } else {
        console.log(`  ❌ Mission complete failed`);
        results.push({
          step: '5. Complete mission',
          status: 'fail',
          message: 'Completion returned false',
        });
      }
    } catch (error) {
      console.log('  ⚠️  Complete error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Might be already completed - acceptable
      if (errorMsg.includes('ALREADY_COMPLETED')) {
        console.log('  ℹ️  Mission was already completed (acceptable)');
        results.push({
          step: '5. Complete mission',
          status: 'pass',
          message: 'Mission already completed',
        });
      } else {
        results.push({
          step: '5. Complete mission',
          status: 'fail',
          message: errorMsg,
        });
      }
    }
  } else {
    console.log('  ⏭️  Skipped (no mission ID)');
    results.push({
      step: '5. Complete mission',
      status: 'fail',
      message: 'Skipped - no mission available',
    });
  }
  console.log('');

  // ========================================
  // Summary
  // ========================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    console.log(`${icon} ${result.step}: ${result.message}`);
  });

  console.log('');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run the test
runMissionFlowTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
