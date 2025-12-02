/**
 * AI 對手時間測試腳本（JavaScript 版本）
 */

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sampleReactionTime(mAi, userFactor) {
  const baseMin = 3000;  // 3 秒
  const baseMax = 8000;  // 8 秒

  const speedFactor = Math.max(0.6, Math.min(1.4, mAi * userFactor));
  const adjustedMin = Math.floor(baseMin / speedFactor);
  const adjustedMax = Math.floor(baseMax / speedFactor);

  const minRt = Math.max(2000, Math.min(12000, adjustedMin));
  const maxRt = Math.max(2000, Math.min(12000, adjustedMax));

  const finalMin = Math.min(minRt, maxRt);
  const finalMax = Math.max(minRt, maxRt);

  const baseRt = randomRange(finalMin, finalMax);
  const jitter = 0.85 + Math.random() * 0.3;
  const finalRt = Math.floor(baseRt * jitter);

  return Math.max(2000, Math.min(12000, finalRt));
}

function calculateAIReactionTime(question, aiHistory, mAi = 0.8, userFactor = 1.0) {
  let reactionTime = sampleReactionTime(mAi, userFactor);

  const difficultyMultiplier = {
    1: 0.7, 2: 0.85, 3: 1.0, 4: 1.2, 5: 1.5
  }[question.difficulty] || 1.0;

  reactionTime = Math.floor(reactionTime * difficultyMultiplier);

  if (aiHistory.length > 0) {
    const lastResult = aiHistory[aiHistory.length - 1];
    if (!lastResult.wasCorrect) {
      reactionTime = Math.floor(reactionTime * 1.25);
    }
    if (aiHistory.length >= 3) {
      const recent3 = aiHistory.slice(-3);
      if (recent3.every(r => r.wasCorrect)) {
        reactionTime = Math.floor(reactionTime * 0.85);
      }
    }
  }

  return Math.max(2000, Math.min(15000, reactionTime));
}

console.log('🎮 AI 對手答題時間測試\n');
console.log('='.repeat(60));

console.log('\n📊 場景 1: 5 題對戰開局（中等難度）');
console.log('-'.repeat(60));

const questions = [
  { id: 'Q1', difficulty: 3 },
  { id: 'Q2', difficulty: 2 },
  { id: 'Q3', difficulty: 4 },
  { id: 'Q4', difficulty: 3 },
  { id: 'Q5', difficulty: 3 },
];

const aiHistory = [];

questions.forEach((q, index) => {
  const rt = calculateAIReactionTime(q, aiHistory);
  const wasCorrect = Math.random() > 0.3;
  aiHistory.push({ wasCorrect, reactionTime: rt });

  const status = wasCorrect ? '✅ 答對' : '❌ 答錯';
  const context = index === 0 ? '開局' : aiHistory[index - 1].wasCorrect ? '上題對' : '上題錯';

  console.log(`${q.id} (難度${q.difficulty}) | ${context.padEnd(6)} | ${(rt / 1000).toFixed(1)}秒 | ${status}`);
});

console.log('\n📊 場景 2: 不同難度題目時間分佈');
console.log('-'.repeat(60));

[1, 2, 3, 4, 5].forEach(difficulty => {
  const times = [];
  for (let i = 0; i < 10; i++) {
    const rt = calculateAIReactionTime({ id: 'test', difficulty }, [], 0.8, 1.0);
    times.push(rt);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`難度 ${difficulty}: 平均 ${(avg / 1000).toFixed(1)}秒 | 範圍 ${(min / 1000).toFixed(1)}-${(max / 1000).toFixed(1)}秒`);
});

console.log('\n📊 場景 3: AI 情緒影響測試');
console.log('-'.repeat(60));

const history1 = [
  { wasCorrect: true, reactionTime: 5000 },
  { wasCorrect: true, reactionTime: 4500 },
  { wasCorrect: true, reactionTime: 4000 },
];

const rtAfterWinStreak = calculateAIReactionTime({ id: 'test', difficulty: 3 }, history1);
console.log(`連對 3 題後（自信）: ${(rtAfterWinStreak / 1000).toFixed(1)}秒 (應該較快)`);

const history2 = [
  { wasCorrect: true, reactionTime: 5000 },
  { wasCorrect: true, reactionTime: 4500 },
  { wasCorrect: false, reactionTime: 6000 },
];

const rtAfterLoss = calculateAIReactionTime({ id: 'test', difficulty: 3 }, history2);
console.log(`剛答錯後（謹慎）: ${(rtAfterLoss / 1000).toFixed(1)}秒 (應該較慢)`);

console.log('\n📊 場景 4: AI 能力對速度的影響');
console.log('-'.repeat(60));

const aiLevels = [
  { name: 'AI 弱', mAi: 0.5, userFactor: 0.7 },
  { name: 'AI 中', mAi: 0.8, userFactor: 1.0 },
  { name: 'AI 強', mAi: 1.2, userFactor: 1.3 },
];

aiLevels.forEach(({ name, mAi, userFactor }) => {
  const times = [];
  for (let i = 0; i < 10; i++) {
    const rt = sampleReactionTime(mAi, userFactor);
    times.push(rt);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`${name}: 平均 ${(avg / 1000).toFixed(1)}秒`);
});

console.log('\n' + '='.repeat(60));
console.log('✨ 設計總結');
console.log('='.repeat(60));
console.log(`
✅ 基礎時間範圍: 2-12 秒（更真實）
✅ 簡單題更快，困難題更慢
✅ AI 會因連勝建立信心（變快）
✅ AI 會因失誤變謹慎（變慢）
✅ 每次時間有 ±15% 隨機波動
✅ 整體感覺更像真人對手
`);

console.log('\n🎯 建議測試：');
console.log('1. 開始一場 PVE 對戰');
console.log('2. 觀察 AI 答題時間是否在 2-12 秒範圍');
console.log('3. 觀察困難題是否明顯變慢');
console.log('4. 觀察 AI 答錯後是否變謹慎');
console.log('5. 觀察是否感受到"真人對手"的感覺\n');
