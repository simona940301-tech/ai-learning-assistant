/**
 * AI 對手時間測試腳本
 *
 * 用於測試新的 AI 答題時間分佈
 */

// 模擬 AI 時間計算邏輯（TypeScript 版本）

interface Question {
  id: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

interface AIHistory {
  wasCorrect: boolean;
  reactionTime: number;
}

function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sampleReactionTime(
  mAi: number,
  userFactor: number
): number {
  // 基礎反應時間（毫秒）
  const baseMin = 3000;  // 3 秒
  const baseMax = 8000;  // 8 秒

  // 速度因子：限制在 0.6-1.4
  const speedFactor = Math.max(0.6, Math.min(1.4, mAi * userFactor));

  const adjustedMin = Math.floor(baseMin / speedFactor);
  const adjustedMax = Math.floor(baseMax / speedFactor);

  // 確保範圍在 2-12 秒
  const minRt = Math.max(2000, Math.min(12000, adjustedMin));
  const maxRt = Math.max(2000, Math.min(12000, adjustedMax));

  const finalMin = Math.min(minRt, maxRt);
  const finalMax = Math.max(minRt, maxRt);

  // 加入 ±15% 隨機波動
  const baseRt = randomRange(finalMin, finalMax);
  const jitter = 0.85 + Math.random() * 0.3; // 0.85-1.15
  const finalRt = Math.floor(baseRt * jitter);

  return Math.max(2000, Math.min(12000, finalRt));
}

function calculateAIReactionTime(
  question: Question,
  aiHistory: AIHistory[],
  mAi: number = 0.8,
  userFactor: number = 1.0
): number {
  // 1. 基礎反應時間
  let reactionTime = sampleReactionTime(mAi, userFactor);

  // 2. 根據題目難度調整
  const difficultyMultiplier = {
    1: 0.7,   // 簡單題快一點
    2: 0.85,  // 較簡單
    3: 1.0,   // 中等正常
    4: 1.2,   // 困難慢一點
    5: 1.5,   // 超難很慢
  }[question.difficulty] || 1.0;

  reactionTime = Math.floor(reactionTime * difficultyMultiplier);

  // 3. 根據 AI 最近表現調整（情緒模擬）
  if (aiHistory.length > 0) {
    const lastResult = aiHistory[aiHistory.length - 1];

    // AI 剛答錯，這題會更謹慎
    if (!lastResult.wasCorrect) {
      reactionTime = Math.floor(reactionTime * 1.25); // +25%
    }

    // 檢查是否連對 3 題
    if (aiHistory.length >= 3) {
      const recent3 = aiHistory.slice(-3);
      if (recent3.every(r => r.wasCorrect)) {
        reactionTime = Math.floor(reactionTime * 0.85); // -15%
      }
    }
  }

  // 4. 最終限制
  return Math.max(2000, Math.min(15000, reactionTime));
}

// 測試場景
console.log('🎮 AI 對手答題時間測試\n');
console.log('=' .repeat(60));

// 場景 1: 正常開局
console.log('\n📊 場景 1: 5 題對戰開局（中等難度）');
console.log('-'.repeat(60));

const questions: Question[] = [
  { id: 'Q1', difficulty: 3 },
  { id: 'Q2', difficulty: 2 },
  { id: 'Q3', difficulty: 4 },
  { id: 'Q4', difficulty: 3 },
  { id: 'Q5', difficulty: 3 },
];

const aiHistory: AIHistory[] = [];

questions.forEach((q, index) => {
  const rt = calculateAIReactionTime(q, aiHistory);
  const wasCorrect = Math.random() > 0.3; // 70% 答對率

  aiHistory.push({ wasCorrect, reactionTime: rt });

  const status = wasCorrect ? '✅ 答對' : '❌ 答錯';
  const context = index === 0
    ? '開局'
    : aiHistory[index - 1].wasCorrect
    ? '上題對'
    : '上題錯';

  console.log(
    `${q.id} (難度${q.difficulty}) | ${context.padEnd(6)} | ${(rt / 1000).toFixed(1)}秒 | ${status}`
  );
});

// 場景 2: 不同難度分佈
console.log('\n📊 場景 2: 不同難度題目時間分佈');
console.log('-'.repeat(60));

const difficulties: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

difficulties.forEach(difficulty => {
  const times: number[] = [];

  // 每個難度測試 10 次
  for (let i = 0; i < 10; i++) {
    const rt = calculateAIReactionTime(
      { id: `test`, difficulty },
      [],
      0.8,
      1.0
    );
    times.push(rt);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(
    `難度 ${difficulty}: 平均 ${(avg / 1000).toFixed(1)}秒 | 範圍 ${(min / 1000).toFixed(1)}-${(max / 1000).toFixed(1)}秒`
  );
});

// 場景 3: 情緒影響測試
console.log('\n📊 場景 3: AI 情緒影響測試');
console.log('-'.repeat(60));

// 3.1 連對 3 題後
const history1: AIHistory[] = [
  { wasCorrect: true, reactionTime: 5000 },
  { wasCorrect: true, reactionTime: 4500 },
  { wasCorrect: true, reactionTime: 4000 },
];

const rtAfterWinStreak = calculateAIReactionTime(
  { id: 'test', difficulty: 3 },
  history1
);

console.log(`連對 3 題後（自信）: ${(rtAfterWinStreak / 1000).toFixed(1)}秒 (應該較快)`);

// 3.2 剛答錯後
const history2: AIHistory[] = [
  { wasCorrect: true, reactionTime: 5000 },
  { wasCorrect: true, reactionTime: 4500 },
  { wasCorrect: false, reactionTime: 6000 },
];

const rtAfterLoss = calculateAIReactionTime(
  { id: 'test', difficulty: 3 },
  history2
);

console.log(`剛答錯後（謹慎）: ${(rtAfterLoss / 1000).toFixed(1)}秒 (應該較慢)`);

// 場景 4: AI 能力影響
console.log('\n📊 場景 4: AI 能力對速度的影響');
console.log('-'.repeat(60));

const aiLevels = [
  { name: 'AI 弱', mAi: 0.5, userFactor: 0.7 },
  { name: 'AI 中', mAi: 0.8, userFactor: 1.0 },
  { name: 'AI 強', mAi: 1.2, userFactor: 1.3 },
];

aiLevels.forEach(({ name, mAi, userFactor }) => {
  const times: number[] = [];

  for (let i = 0; i < 10; i++) {
    const rt = sampleReactionTime(mAi, userFactor);
    times.push(rt);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`${name}: 平均 ${(avg / 1000).toFixed(1)}秒`);
});

// 統計總結
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
