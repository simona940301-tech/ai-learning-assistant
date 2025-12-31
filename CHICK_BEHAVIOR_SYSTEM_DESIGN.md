# 🐣 小雞行為系統完整設計文件 v2.0

> **核心理念**: 將小雞從「功能性寵物」升級為「有生命、有記憶、有情緒的伴侶」  
> **心理學基礎**: Hooked Model + Variable Ratio Reward + Relationship Investment  
> **參考遊戲**: Coin Master (稀缺性) + Tamagotchi (情感依附) + 戀愛遊戲 (關係修復)

---

## 📋 目錄

1. [飼料來源系統](#i-飼料來源系統)
2. [功能限制與情緒曲線](#ii-功能限制與情緒曲線)
3. [行為修復機制](#iii-行為修復機制)
4. [個性演化系統](#iv-個性演化系統)
5. [資料庫設計](#v-資料庫設計)
6. [技術實作](#vi-技術實作)
7. [UI/UX 設計](#vii-uiux-設計)

---

## I. ❤️ 飼料來源系統

### 核心原則
- **稀缺性**: 食物難以獲得，需要策略分配
- **變動獎勵**: 利用隨機性觸發多巴胺
- **情感連結**: 小雞會「記得」你的行為

---

### 1. 每日愛的儀式（固定觸發）

**觸發條件**: 每日首次登入

**小雞語氣**:
```
「你來了？別耽誤時間，快去幫我賺吃的。一碗真的太少了。」
```

**獎勵**: 🎁 固定 +1 碗

**心理效果**:
- ✅ 建立每日互動習慣 (Hooked Model: Trigger)
- ✅ 小雞開始「記錄」出勤率（為情緒曲線打基礎）
- ✅ 傲嬌語氣增加親密感

**實作細節**:
```typescript
// 追蹤欄位
last_daily_greeting_at: TIMESTAMPTZ

// 邏輯
if (now - last_daily_greeting_at > 24 hours) {
  giveReward(1, 'DAILY_GREETING');
  showMessage("你來了？別耽誤時間，快去幫我賺吃的。一碗真的太少了。");
  updateField({ last_daily_greeting_at: now });
}
```

---

### 2. 首勝饋贈（固定獎勵）

**觸發條件**: 每日首次對戰勝利

**小雞語氣**:
```
「我就知道你會贏！我剛真的沒吃飽！」
```

**獎勵**: 🎁 固定 +1 碗

**心理效果**:
- ✅ 引導玩家至少打一場
- ✅ 形成「登入 → 戰鬥 → 獎勵」回圈

**實作細節**:
```typescript
// 追蹤欄位
daily_first_win_claimed: BOOLEAN (每日重置)

// 邏輯
if (battleResult === 'WIN' && !daily_first_win_claimed) {
  giveReward(1, 'FIRST_WIN');
  showMessage("我就知道你會贏！我剛真的沒吃飽！");
  updateField({ daily_first_win_claimed: true });
}
```

---

### 3. 戰鬥變動掉落（20% 機率）

**觸發條件**: 每場對戰結束（不論勝負）

**小雞語氣**:
```
「運氣真好，我又有東西可以吃啦！」
```

**獎勵**: 🎲 20% 機率 +1 碗

**心理效果**:
- ✅ Variable Ratio Reward（老虎機效應）
- ✅ 驅動玩家「再打一場試試運氣」
- ✅ 多巴胺峰值

**實作細節**:
```typescript
// 每場戰鬥結束
if (Math.random() < 0.20) {
  giveReward(1, 'BATTLE_DROP');
  showMessage("運氣真好，我又有東西可以吃啦！");
  triggerAnimation('HAPPY_JUMP');
}
```

---

### 4. 錯題複習變動掉落（10% 機率）

**觸發條件**: 每複習 1 題錯題

**小雞語氣**:
```
「好耶，你的腦終於開機了。快，把那一小口給我。」
```

**獎勵**: 🎲 10% 機率 +1 碗

**心理效果**:
- ✅ 鼓勵學習行為（非戰鬥）
- ✅ 活化錯題複習（玩家最不想做的行為變得值得）
- ✅ 分散獎勵來源

**實作細節**:
```typescript
// 每次複習錯題
if (Math.random() < 0.10) {
  giveReward(1, 'REVIEW_DROP');
  showMessage("好耶，你的腦終於開機了。快，把那一小口給我。");
}
```

---

### 5. 情緒勒索重聚獎（48小時未餵食）

**觸發條件**: 48 小時未餵食 → 小雞進入「難過」狀態 → 玩家餵食

**小雞語氣**:
```
「我以為你不要我了！不准再這樣了。」
```

**獎勵**: 🎁 1-2 碗（根據離開時長）

**心理效果**:
- ✅ Relationship Repair Reward（關係修復獎勵）
- ✅ 強化依附感（你補償、我感動）
- ✅ 減輕玩家罪惡感，鼓勵回歸

**實作細節**:
```typescript
// 餵食時檢查
const hoursSinceLastFed = (now - last_fed_at) / (1000 * 60 * 60);

if (hoursSinceLastFed > 48 && chick_emotion === 'sad') {
  const bonusBowls = hoursSinceLastFed > 72 ? 2 : 1;
  giveReward(bonusBowls, 'REUNION_BONUS');
  showMessage("我以為你不要我了！不准再這樣了。");
  updateEmotion('relieved');
}
```

---

### 6. 超稀有掉落：金色飼料（0.5% 機率）

**觸發條件**: 對戰勝利時極低機率掉落

**小雞語氣**:
```
「這是我值得的獎勵！快！拿來！好餓好餓！」
```

**效果**: 
- ⚡ -50 飢餓度（一次性）
- ⚡ +20 分鐘 Super Buff（XP +25%, 金幣 +25%）

**心理效果**:
- ✅ 超高價值感（像寶可夢閃光）
- ✅ 驅動戰鬥行為（「說不定下一場就掉了」）
- ✅ 社群分享動機（「我抽到金色飼料了！」）

**實作細節**:
```typescript
// 戰鬥勝利時
if (Math.random() < 0.005) { // 0.5%
  giveItem('GOLDEN_FOOD');
  showMessage("這是我值得的獎勵！快！拿來！好餓好餓！");
  triggerAnimation('GOLDEN_SPARKLE');
  notifyAchievement('獲得超稀有金色飼料！');
}

// 使用金色飼料
function useGoldenFood() {
  updateHunger(-50);
  applyBuff({
    type: 'SUPER_BUFF',
    xpBonus: 0.25,
    coinBonus: 0.25,
    duration: 20 * 60 * 1000 // 20 分鐘
  });
}
```

---

### 📊 飼料來源總結

| 來源 | 類型 | 獎勵 | 機率 | 心理機制 |
|------|------|------|------|----------|
| 每日愛的儀式 | 固定 | +1 碗 | 100% | 習慣養成 |
| 首勝饋贈 | 固定 | +1 碗 | 100% | 行為引導 |
| 戰鬥掉落 | 變動 | +1 碗 | 20% | 老虎機效應 |
| 錯題複習 | 變動 | +1 碗 | 10% | 學習激勵 |
| 重聚獎勵 | 條件 | +1-2 碗 | 條件觸發 | 關係修復 |
| 金色飼料 | 超稀有 | -50 飢餓 + Buff | 0.5% | 峰值體驗 |

**每日預期獲得**（積極玩家）:
- 每日儀式: +1 碗
- 首勝: +1 碗
- 戰鬥 5 場（20% 機率）: 期望值 +1 碗
- 錯題 10 題（10% 機率）: 期望值 +1 碗
- **總計**: 約 4 碗/天

**每日消耗**（維持飽足）:
- 飢餓度增長: +90/天（每 4 小時 +15）
- 需要餵食: 3 碗/天（每碗 -30）

**結論**: 積極玩家可累積 +1 碗/天，偶爾玩家剛好持平

---

## II. 💔 功能限制與情緒曲線

### 核心原則
- **情緒記憶**: 小雞會記得過去 72 小時的行為
- **多維度影響**: 不只是飢餓度，還有互動頻率、戰鬥次數、探險關注
- **不可逆懲罰**: 健康值下降需要「修復行為」才能恢復

---

### A. 情緒曲線系統（Mood Timeline）

#### 情緒計算公式

```typescript
// 情緒 = 過去 72 小時玩家行為的加權平均
function calculateMood(profile: Profile): ChickMood {
  const now = new Date();
  const last72Hours = now.getTime() - (72 * 60 * 60 * 1000);
  
  // 1. 餵食頻率（權重 40%）
  const feedingScore = calculateFeedingScore(profile.feeding_history, last72Hours);
  
  // 2. 互動頻率（權重 25%）
  const interactionScore = calculateInteractionScore(profile.last_interaction_at);
  
  // 3. 戰鬥陪伴（權重 20%）
  const battleScore = calculateBattleScore(profile.battle_history, last72Hours);
  
  // 4. 探險關注（權重 15%）
  const explorationScore = calculateExplorationScore(profile.exploration_history);
  
  const totalScore = 
    feedingScore * 0.40 +
    interactionScore * 0.25 +
    battleScore * 0.20 +
    explorationScore * 0.15;
  
  return getMoodFromScore(totalScore);
}

// 情緒等級
type ChickMood = 
  | 'ecstatic'    // 100-90: 超開心
  | 'happy'       // 89-70:  開心
  | 'content'     // 69-50:  滿足
  | 'neutral'     // 49-30:  普通
  | 'worried'     // 29-15:  擔心
  | 'sad'         // 14-5:   難過
  | 'depressed';  // 4-0:    沮喪
```

#### 餵食頻率評分

```typescript
function calculateFeedingScore(feedingHistory: Date[], since: number): number {
  const recentFeedings = feedingHistory.filter(date => date.getTime() > since);
  const avgInterval = calculateAverageInterval(recentFeedings);
  
  // 理想間隔: 8 小時餵一次
  if (avgInterval <= 8) return 100;
  if (avgInterval <= 12) return 80;
  if (avgInterval <= 24) return 60;
  if (avgInterval <= 48) return 30;
  return 0;
}
```

#### 互動頻率評分

```typescript
function calculateInteractionScore(lastInteractionAt: Date): number {
  const hoursSinceInteraction = (Date.now() - lastInteractionAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceInteraction < 6) return 100;
  if (hoursSinceInteraction < 12) return 80;
  if (hoursSinceInteraction < 24) return 50;
  if (hoursSinceInteraction < 48) return 20;
  return 0;
}
```

---

### B. 飢餓度與功能限制

#### 飢餓度分級

| 飢餓度 | 狀態 | 功能限制 | 視覺效果 | 小雞語氣 |
|--------|------|----------|----------|----------|
| 0-30 | 飽足 | ✅ 全功能 + Buff | 💙 藍色光環 | 「我吃得好飽！學習效率 UP！」 |
| 31-50 | 正常 | ✅ 可戰鬥、可探險 | 💚 綠色 | 「我還不餓，繼續加油！」 |
| 51-70 | 微餓 | ⚠️ 可戰鬥、無法探險 | 💛 黃色 | 「有點餓了...去學習賺點食物吧！」 |
| 71-85 | 飢餓 | ❌ 無法戰鬥、無法探險 | 🧡 橙色 | 「好餓...快去學習！」 |
| 86-100 | 極度飢餓 | ❌ 所有功能鎖定 | ❤️ 紅色閃爍 | 「我...我快不行了...」 |

#### 功能限制實作

```typescript
// 戰鬥限制
function canBattle(hunger: number): boolean {
  return hunger <= 70;
}

// 探險限制
function canExplore(hunger: number): boolean {
  return hunger <= 50;
}

// 技能限制
function canUseSkill(hunger: number, skillType: string): boolean {
  if (skillType === 'SOS') return hunger <= 40;
  if (skillType === 'TIME_FREEZE') return hunger <= 30;
  return false;
}

// 飽足 Buff
function getBattleBuff(hunger: number): BattleBuff | null {
  if (hunger <= 30) {
    return {
      xpBonus: 0.15,
      coinBonus: 0.15,
      message: '小雞飽足狀態！XP +15%, 金幣 +15%'
    };
  }
  return null;
}
```

---

### C. 健康值系統（不可逆懲罰）

#### 健康值機制

```typescript
// 健康值: 0-100
// 初始值: 100
// 下降條件: 飢餓度 > 85 持續超過 24 小時

interface ChickHealth {
  current: number;        // 當前健康值
  max: number;            // 最大健康值（可能因長期忽視而降低）
  lastCheckAt: Date;      // 上次檢查時間
  damageHistory: {        // 傷害歷史
    timestamp: Date;
    damage: number;
    reason: string;
  }[];
}

// 健康值下降邏輯
function updateHealth(profile: Profile): void {
  const now = new Date();
  const hoursSinceLastCheck = (now.getTime() - profile.health_last_check_at.getTime()) / (1000 * 60 * 60);
  
  // 如果飢餓度 > 85 且超過 24 小時
  if (profile.chick_hunger > 85 && hoursSinceLastCheck > 24) {
    const damage = Math.floor(hoursSinceLastCheck / 24) * 5; // 每 24 小時 -5 健康
    
    updateField({
      chick_health: Math.max(0, profile.chick_health - damage),
      health_last_check_at: now
    });
    
    // 記錄傷害
    logHealthDamage({
      timestamp: now,
      damage,
      reason: 'EXTREME_HUNGER'
    });
    
    // 小雞語氣
    if (profile.chick_health > 50) {
      showMessage("我好累…可能真的撐不太住了…你還會照顧我嗎？");
    } else if (profile.chick_health > 20) {
      showMessage("我...我真的很難受...請不要放棄我...");
    } else {
      showMessage("......"); // 沉默，更強的情緒勒索
    }
  }
}
```

#### 健康值影響

```typescript
// 健康值 < 100 時的永久 Debuff
function getHealthDebuff(health: number): Debuff {
  const debuffPercent = (100 - health) * 0.05; // 每少 1 點健康 = -0.05% XP
  
  return {
    xpPenalty: debuffPercent / 100,
    message: `小雞健康不佳：XP -${debuffPercent.toFixed(1)}%`
  };
}

// 例如：健康值 80 → XP -1%
//      健康值 50 → XP -2.5%
//      健康值 20 → XP -4%
```

---

## III. 🧩 行為修復機制（Investment）

### 核心原則
- **玩家可以彌補**: 不是單向懲罰，而是「關係修復」
- **投資感**: 玩家需要「付出努力」才能恢復
- **情感連結**: 像戀愛遊戲的分歧路線

---

### 修復方式 1: 持續照顧（3 天挑戰）

**條件**: 連續 3 天將小雞維持在飢餓度 ≤ 30

**效果**:
- ✅ 恢復 +10 健康值
- ✅ 小雞信任度 +20
- ✅ 解鎖特殊對話

**小雞語氣**:
```
Day 1: "嗯...你今天有認真照顧我..."
Day 2: "你...是認真的嗎？我有點不敢相信..."
Day 3: "謝謝你...我感覺好多了。我會更努力幫你的！"
```

**實作**:
```typescript
// 追蹤欄位
consecutive_well_fed_days: number

// 每日檢查（在每日儀式時）
if (dailyAverageHunger <= 30) {
  consecutive_well_fed_days++;
  
  if (consecutive_well_fed_days === 1) {
    showMessage("嗯...你今天有認真照顧我...");
  } else if (consecutive_well_fed_days === 2) {
    showMessage("你...是認真的嗎？我有點不敢相信...");
  } else if (consecutive_well_fed_days >= 3) {
    showMessage("謝謝你...我感覺好多了。我會更努力幫你的！");
    restoreHealth(10);
    increaseTrust(20);
    unlockDialogue('TRUST_RESTORED');
    consecutive_well_fed_days = 0; // 重置
  }
} else {
  consecutive_well_fed_days = 0; // 中斷
}
```

---

### 修復方式 2: 小雞任務（關係修復任務）

**觸發條件**: 健康值 < 80 或情緒 = 'sad'/'depressed'

**任務類型**:

#### 任務 A: 三餐照顧
```
任務: 在 24 小時內餵食 3 次，且每次間隔 6-10 小時
獎勵: 健康 +5, 信任 +10
語氣: "你能像以前一樣照顧我嗎？我想要一日三餐..."
```

#### 任務 B: 連勝挑戰
```
任務: 連續贏得 2 場對戰
獎勵: 健康 +3, 信任 +15
語氣: "帶我去打仗吧...我想證明我還有用..."
```

#### 任務 C: 學習陪伴
```
任務: 複習 10 題錯題 + 完成 5 題
獎勵: 健康 +5, 信任 +10
語氣: "陪我一起學習好嗎？就像以前一樣..."
```

**實作**:
```typescript
interface ChickQuest {
  id: string;
  type: 'FEEDING' | 'BATTLE' | 'STUDY';
  requirements: {
    feedingCount?: number;
    feedingInterval?: [number, number]; // [min, max] hours
    consecutiveWins?: number;
    reviewCount?: number;
    solveCount?: number;
  };
  progress: {
    current: number;
    total: number;
  };
  rewards: {
    health: number;
    trust: number;
  };
  message: string;
  expiresAt: Date;
}

// 任務觸發
function triggerRepairQuest(profile: Profile): ChickQuest | null {
  if (profile.chick_health < 80 || ['sad', 'depressed'].includes(profile.chick_mood)) {
    const questType = randomChoice(['FEEDING', 'BATTLE', 'STUDY']);
    return createQuest(questType);
  }
  return null;
}
```

---

## IV. 💣 個性演化系統（終極武器）

### 核心原則
- **小雞會「學習」玩家的行為模式**
- **個性會隨時間演化**
- **不同個性解鎖不同對話和能力**

---

### A. 個性維度

```typescript
interface ChickPersonality {
  // 四大維度（0-100）
  tsundere: number;      // 傲嬌度（初始 80）
  bravery: number;       // 勇敢度（初始 50）
  playfulness: number;   // 調皮度（初始 50）
  loyalty: number;       // 忠誠度（初始 50）
  
  // 當前主導個性
  dominantTrait: 'tsundere' | 'brave' | 'playful' | 'loyal';
}
```

---

### B. 個性演化規則

#### 1. 傲嬌度降低（溫柔解鎖）

**條件**: 
- 連續 7 天飢餓度 < 40
- 每日至少互動 1 次

**效果**:
- 傲嬌度 -5/週
- 解鎖溫柔對話

**語氣變化**:
```typescript
// 傲嬌度 80+ (初始)
"你來了？別耽誤時間，快去幫我賺吃的。"

// 傲嬌度 60-79 (軟化)
"你來了啊...我、我才沒有在等你！"

// 傲嬌度 40-59 (溫柔)
"你來了...我有點想你了..."

// 傲嬌度 < 40 (完全溫柔)
"歡迎回來！我一直在等你呢~"
```

---

#### 2. 勇敢度提升

**條件**:
- 經常帶小雞戰鬥（每週 > 10 場）
- 戰鬥勝率 > 60%

**效果**:
- 勇敢度 +3/週
- 解鎖戰鬥特殊技能

**語氣變化**:
```typescript
// 勇敢度 < 50 (膽小)
"我...我會盡力幫你的..."

// 勇敢度 50-70 (普通)
"放心，我會幫你的！"

// 勇敢度 70-90 (勇敢)
"讓我來！我不會輸的！"

// 勇敢度 > 90 (無畏)
"哼，這種對手我一個人就能搞定！"
```

**解鎖技能**:
```typescript
if (bravery > 70) {
  unlockSkill('BATTLE_CRY'); // 戰吼：開場 ATK +10%
}
if (bravery > 90) {
  unlockSkill('LAST_STAND'); // 背水一戰：血量 < 30% 時 DMG +20%
}
```

---

#### 3. 調皮度提升

**條件**:
- 經常帶小雞探險（每週 > 3 次）
- 探險零用錢 > 500

**效果**:
- 調皮度 +4/週
- 探險獎勵提升

**語氣變化**:
```typescript
// 調皮度 < 50 (乖巧)
"我會乖乖去探險的..."

// 調皮度 50-70 (活潑)
"探險！我最喜歡了！"

// 調皮度 70-90 (調皮)
"嘿嘿，我要去找好玩的東西！"

// 調皮度 > 90 (搗蛋)
"我偷偷拿了點好東西回來...別告訴別人喔！"
```

**探險獎勵提升**:
```typescript
if (playfulness > 70) {
  explorationRewardMultiplier = 1.2; // +20% 獎勵
}
if (playfulness > 90) {
  rareItemChance = 0.15; // 稀有物品機率 +5%
}
```

---

#### 4. 忠誠度變化

**提升條件**:
- 從不讓飢餓度 > 80
- 每日登入率 > 80%

**降低條件**:
- 經常讓飢餓度 > 85
- 連續 3 天未登入

**效果**:
- 忠誠度影響所有獎勵

**語氣變化**:
```typescript
// 忠誠度 < 30 (猜疑)
"你...還會回來嗎？"
"我不知道該不該相信你..."

// 忠誠度 30-60 (普通)
"嗯，你來了。"

// 忠誠度 60-85 (信任)
"我知道你會來的！"

// 忠誠度 > 85 (絕對忠誠)
"無論發生什麼，我都會陪著你！"
```

**獎勵加成**:
```typescript
function getLoyaltyBonus(loyalty: number): number {
  if (loyalty > 85) return 1.25; // +25% 所有獎勵
  if (loyalty > 60) return 1.15; // +15%
  if (loyalty > 30) return 1.0;  // 無加成
  return 0.85; // -15% 懲罰
}
```

---

### C. 個性組合效果

```typescript
// 不同個性組合解鎖特殊狀態
interface PersonalityCombo {
  name: string;
  requirements: {
    tsundere?: [number, number];
    bravery?: [number, number];
    playfulness?: [number, number];
    loyalty?: [number, number];
  };
  effects: string[];
  dialogue: string;
}

const PERSONALITY_COMBOS: PersonalityCombo[] = [
  {
    name: '傲嬌戰士',
    requirements: { tsundere: [60, 100], bravery: [70, 100] },
    effects: ['戰鬥 XP +10%', '戰鬥掉落率 +5%'],
    dialogue: '哼，我才不是為了你才變強的！'
  },
  {
    name: '忠誠守護者',
    requirements: { loyalty: [85, 100], bravery: [60, 100] },
    effects: ['所有獎勵 +20%', '解鎖「守護」技能'],
    dialogue: '我會永遠保護你！'
  },
  {
    name: '調皮探險家',
    requirements: { playfulness: [80, 100], loyalty: [50, 100] },
    effects: ['探險獎勵 +30%', '稀有物品機率 +10%'],
    dialogue: '嘿嘿，跟我一起去冒險吧！'
  },
  {
    name: '溫柔伴侶',
    requirements: { tsundere: [0, 40], loyalty: [70, 100] },
    effects: ['所有 Buff 持續時間 +50%', '健康恢復速度 +100%'],
    dialogue: '有你在，我什麼都不怕...'
  }
];
```

---

## V. 資料庫設計

### 新增欄位（profiles 表）

```sql
-- ============================================
-- Chick Behavior System v2.0 Schema
-- ============================================

-- 基礎狀態（已存在）
-- chick_hunger INTEGER
-- chick_intimacy INTEGER
-- food_bowls_count INTEGER
-- chick_last_fed_at TIMESTAMPTZ

-- 情緒與健康
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chick_mood TEXT DEFAULT 'neutral';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chick_health INTEGER DEFAULT 100 CHECK (chick_health >= 0 AND chick_health <= 100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_last_check_at TIMESTAMPTZ DEFAULT NOW();

-- 個性維度
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality_tsundere INTEGER DEFAULT 80 CHECK (personality_tsundere >= 0 AND personality_tsundere <= 100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality_bravery INTEGER DEFAULT 50 CHECK (personality_bravery >= 0 AND personality_bravery <= 100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality_playfulness INTEGER DEFAULT 50 CHECK (personality_playfulness >= 0 AND personality_playfulness <= 100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality_loyalty INTEGER DEFAULT 50 CHECK (personality_loyalty >= 0 AND personality_loyalty <= 100);

-- 行為追蹤
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_greeting_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_first_win_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consecutive_well_fed_days INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chick_trust INTEGER DEFAULT 0;

-- 歷史記錄（JSONB）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feeding_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interaction_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_damage_history JSONB DEFAULT '[]'::jsonb;

-- 特殊物品
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS golden_food_count INTEGER DEFAULT 0;
```

---

### 新增表：chick_quests

```sql
CREATE TABLE IF NOT EXISTS chick_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_type TEXT NOT NULL, -- 'FEEDING', 'BATTLE', 'STUDY'
  requirements JSONB NOT NULL,
  progress JSONB NOT NULL,
  rewards JSONB NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'EXPIRED'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_chick_quests_user_status ON chick_quests(user_id, status);
```

---

### 新增表：chick_dialogue_unlocks

```sql
CREATE TABLE IF NOT EXISTS chick_dialogue_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dialogue_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dialogue_key)
);

CREATE INDEX idx_dialogue_unlocks_user ON chick_dialogue_unlocks(user_id);
```

---

## VI. 技術實作

### 核心工具函數

#### lib/chick/behavior.ts

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// 飢餓度計算
// ============================================

export function calculateCurrentHunger(
  lastFedAt: Date,
  currentHunger: number
): number {
  const now = new Date();
  const hoursSinceLastFed = (now.getTime() - lastFedAt.getTime()) / (1000 * 60 * 60);
  
  // 每 4 小時 +15 飢餓度
  const hungerIncrease = Math.floor(hoursSinceLastFed / 4) * 15;
  
  return Math.min(100, currentHunger + hungerIncrease);
}

// ============================================
// 情緒計算
// ============================================

export function calculateMood(profile: any): ChickMood {
  const feedingScore = calculateFeedingScore(profile.feeding_history);
  const interactionScore = calculateInteractionScore(profile.last_interaction_at);
  const battleScore = calculateBattleScore(profile.battle_count_72h);
  const explorationScore = calculateExplorationScore(profile.exploration_count_72h);
  
  const totalScore = 
    feedingScore * 0.40 +
    interactionScore * 0.25 +
    battleScore * 0.20 +
    explorationScore * 0.15;
  
  return getMoodFromScore(totalScore);
}

function getMoodFromScore(score: number): ChickMood {
  if (score >= 90) return 'ecstatic';
  if (score >= 70) return 'happy';
  if (score >= 50) return 'content';
  if (score >= 30) return 'neutral';
  if (score >= 15) return 'worried';
  if (score >= 5) return 'sad';
  return 'depressed';
}

// ============================================
// 獎勵系統
// ============================================

export async function giveReward(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  await supabase.rpc('increment_food_bowls', {
    p_user_id: userId,
    p_amount: amount
  });
  
  // 記錄獎勵歷史
  await logReward(supabase, userId, amount, reason);
}

// ============================================
// 個性演化
// ============================================

export async function updatePersonality(
  supabase: SupabaseClient,
  userId: string,
  behaviorType: 'FEEDING' | 'BATTLE' | 'EXPLORATION'
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('personality_*')
    .eq('id', userId)
    .single();
  
  const updates: any = {};
  
  switch (behaviorType) {
    case 'FEEDING':
      // 降低傲嬌度
      updates.personality_tsundere = Math.max(0, profile.personality_tsundere - 1);
      updates.personality_loyalty = Math.min(100, profile.personality_loyalty + 1);
      break;
    
    case 'BATTLE':
      // 提升勇敢度
      updates.personality_bravery = Math.min(100, profile.personality_bravery + 1);
      break;
    
    case 'EXPLORATION':
      // 提升調皮度
      updates.personality_playfulness = Math.min(100, profile.personality_playfulness + 1);
      break;
  }
  
  await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
}

// ============================================
// 健康值更新
// ============================================

export async function updateHealth(
  supabase: SupabaseClient,
  userId: string
): Promise<{ damaged: boolean; message?: string }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('chick_hunger, chick_health, health_last_check_at')
    .eq('id', userId)
    .single();
  
  const now = new Date();
  const hoursSinceLastCheck = (now.getTime() - new Date(profile.health_last_check_at).getTime()) / (1000 * 60 * 60);
  
  // 如果飢餓度 > 85 且超過 24 小時
  if (profile.chick_hunger > 85 && hoursSinceLastCheck > 24) {
    const damage = Math.floor(hoursSinceLastCheck / 24) * 5;
    const newHealth = Math.max(0, profile.chick_health - damage);
    
    await supabase
      .from('profiles')
      .update({
        chick_health: newHealth,
        health_last_check_at: now.toISOString()
      })
      .eq('id', userId);
    
    let message = '';
    if (newHealth > 50) {
      message = '我好累…可能真的撐不太住了…你還會照顧我嗎？';
    } else if (newHealth > 20) {
      message = '我...我真的很難受...請不要放棄我...';
    } else {
      message = '......';
    }
    
    return { damaged: true, message };
  }
  
  return { damaged: false };
}
```

---

## VII. UI/UX 設計

### A. ChickAvatar 狀態顯示

```typescript
// components/chick/ChickAvatar.tsx

export function ChickAvatar() {
  const { hunger, mood, health, personality } = useChickStore();
  
  return (
    <div className="relative">
      {/* 小雞圖片 */}
      <img 
        src={getChickImage(hunger, mood, personality)} 
        alt="Chick"
        className="w-20 h-20"
      />
      
      {/* 飢餓度指示器 */}
      {hunger > 70 && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
        >
          😰
        </motion.div>
      )}
      
      {/* 飽足 Buff */}
      {hunger < 30 && (
        <div className="absolute -top-2 -left-2 bg-blue-500 rounded-full p-1">
          ✨
        </div>
      )}
      
      {/* 健康值警告 */}
      {health < 50 && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-500/80 text-white text-xs px-2 py-0.5 rounded-full">
          健康 {health}%
        </div>
      )}
    </div>
  );
}
```

---

### B. 飢餓度詳細顯示

```typescript
// components/chick/HungerDisplay.tsx

export function HungerDisplay({ hunger }: { hunger: number }) {
  const getStatusInfo = (hunger: number) => {
    if (hunger <= 30) return {
      color: 'bg-blue-500',
      label: '飽足 Buff',
      message: '學習效率 UP！',
      icon: '✨'
    };
    if (hunger <= 50) return {
      color: 'bg-green-500',
      label: '正常',
      message: '繼續加油！',
      icon: '😊'
    };
    if (hunger <= 70) return {
      color: 'bg-yellow-500',
      label: '微餓',
      message: '無法探險',
      icon: '😟'
    };
    if (hunger <= 85) return {
      color: 'bg-orange-500',
      label: '飢餓',
      message: '無法戰鬥',
      icon: '😰'
    };
    return {
      color: 'bg-red-500',
      label: '極度飢餓',
      message: '所有功能鎖定',
      icon: '💀'
    };
  };
  
  const status = getStatusInfo(hunger);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-400">飢餓度</span>
        <div className="flex items-center gap-2">
          <span className="text-lg">{status.icon}</span>
          <span className={`text-sm font-bold ${status.color.replace('bg-', 'text-')}`}>
            {hunger}%
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.color} bg-opacity-20`}>
            {status.label}
          </span>
        </div>
      </div>
      
      {/* 進度條 */}
      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${status.color}`}
          initial={{ width: 0 }}
          animate={{ width: `${hunger}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      {/* 狀態訊息 */}
      <p className="text-xs text-slate-500 text-center">
        {status.message}
      </p>
      
      {/* 功能狀態 */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className={`text-center p-2 rounded ${hunger <= 70 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {hunger <= 70 ? '✓' : '✗'} 戰鬥
        </div>
        <div className={`text-center p-2 rounded ${hunger <= 50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {hunger <= 50 ? '✓' : '✗'} 探險
        </div>
        <div className={`text-center p-2 rounded ${hunger <= 40 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {hunger <= 40 ? '✓' : '✗'} 技能
        </div>
      </div>
    </div>
  );
}
```

---

### C. 個性顯示面板

```typescript
// components/chick/PersonalityPanel.tsx

export function PersonalityPanel() {
  const { personality } = useChickStore();
  
  const traits = [
    { name: '傲嬌', key: 'tsundere', value: personality.tsundere, color: 'pink' },
    { name: '勇敢', key: 'bravery', value: personality.bravery, color: 'red' },
    { name: '調皮', key: 'playfulness', value: personality.playfulness, color: 'yellow' },
    { name: '忠誠', key: 'loyalty', value: personality.loyalty, color: 'blue' }
  ];
  
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white">個性特質</h3>
      
      {traits.map(trait => (
        <div key={trait.key} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">{trait.name}</span>
            <span className={`text-${trait.color}-400 font-bold`}>
              {trait.value}
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full bg-${trait.color}-500`}
              style={{ width: `${trait.value}%` }}
            />
          </div>
        </div>
      ))}
      
      {/* 當前主導個性 */}
      <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
        <div className="text-xs text-slate-400 mb-1">當前個性</div>
        <div className="text-sm font-bold text-white">
          {getDominantPersonality(personality)}
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 完整系統總結

### 核心循環（Hooked Model）

```
1. Trigger（觸發）
   ↓
   每日登入 → 小雞語氣：「你來了？快去賺吃的」
   ↓
2. Action（行動）
   ↓
   戰鬥/複習 → 獲得食物（固定 + 變動獎勵）
   ↓
3. Variable Reward（變動獎勵）
   ↓
   20% 掉落 → 多巴胺峰值 → 「再試一次」
   ↓
4. Investment（投資）
   ↓
   餵食 → 小雞開心 → 個性演化 → 解鎖對話
   ↓
   情感連結加深 → 回到 Trigger
```

### 情感連結機制

1. **依附感**: 每日儀式、重聚獎勵
2. **罪惡感**: 健康值下降、小雞難過語氣
3. **成就感**: 個性演化、解鎖對話
4. **投資感**: 修復任務、連續照顧

### 遊戲平衡

- **稀缺性**: 食物難獲得，需策略分配
- **選擇性**: 戰鬥 vs 探險 vs 技能
- **可修復**: 玩家可彌補錯誤
- **長期目標**: 個性演化需要時間

---

## ✅ 實作優先級

### Phase 1: 核心飢餓機制（1 週）
- [ ] 飢餓度計算與更新
- [ ] 功能限制（戰鬥、探險）
- [ ] 基礎獎勵系統（每日儀式、首勝）
- [ ] UI 更新（飢餓度顯示）

### Phase 2: 變動獎勵（1 週）
- [ ] 戰鬥掉落（20%）
- [ ] 錯題複習掉落（10%）
- [ ] 金色飼料（0.5%）
- [ ] 重聚獎勵

### Phase 3: 情緒與健康（2 週）
- [ ] 情緒曲線計算
- [ ] 健康值系統
- [ ] 修復任務
- [ ] 情緒對話

### Phase 4: 個性演化（2 週）
- [ ] 個性維度追蹤
- [ ] 個性演化邏輯
- [ ] 對話系統
- [ ] 個性組合效果

---

**這是一個完整的、有生命的小雞系統！** 🐣✨
