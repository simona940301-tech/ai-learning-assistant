# 🐣 Chick 系統優化設計方案 V2.0

> **設計理念**: 學習驅動 × 情感連結 × 實用價值  
> **設計師**: AI Engineering Team  
> **日期**: 2025-01-XX

---

## 📐 核心設計原則

### 1. 飢餓度機制設計（關鍵決策）

#### 🎯 設計目標
- **平衡性**: 活躍玩家每天需要 6-8 碗，輕度玩家需要 4-5 碗
- **學習驅動**: 必須通過學習獲得食物，無法購買
- **情感連結**: 飢餓狀態會影響戰鬥表現，激發照顧慾望

#### 📊 飢餓度增長機制（混合模式）

**基礎時間衰減**:
- 每小時 +5 點（緩慢但持續）
- 24 小時 = +120 點

**活動加速**:
- 完成一場對戰: +15 點（無論勝負）
- 完成每日任務: +10 點
- 複習錯題（每題）: +2 點

**計算範例**:
```
活躍玩家（每天 3 場對戰 + 1 任務 + 5 題錯題）:
- 時間: 24h × 5 = +120
- 對戰: 3 × 15 = +45
- 任務: 1 × 10 = +10
- 錯題: 5 × 2 = +10
總計: +185 點 → 需要 185 ÷ 20 ≈ 9-10 碗

輕度玩家（每天 1 場對戰 + 1 任務）:
- 時間: +120
- 對戰: +15
- 任務: +10
總計: +145 點 → 需要 145 ÷ 20 ≈ 7-8 碗
```

#### 🥣 食物碗獎勵機制

**對戰獎勵**:
- 勝利: +3 碗
- 失敗: +1 碗（鼓勵繼續嘗試）

**任務獎勵**:
- 完成每日任務: +5 碗

**錯題複習**:
- 每複習 5 題: +1 碗（累計制，不重置）

**每日可獲得**:
- 活躍玩家: 3×3 + 5 + 1 = 15 碗（足夠）
- 輕度玩家: 1×3 + 5 = 8 碗（剛好）

#### ⚖️ 狀態影響

**飽足狀態** (hunger < 30):
- ✅ 對戰 XP +10%
- ✅ 對戰金幣 +10%
- ✅ 可以使用所有戰鬥技能
- ✅ 視覺: 小雞精神飽滿，有光環效果

**正常狀態** (30 ≤ hunger ≤ 80):
- ✅ 正常表現
- ✅ 可以使用戰鬥技能（需滿足其他條件）

**飢餓狀態** (hunger > 80):
- ❌ 無法使用戰鬥技能
- ❌ 主畫面顯示虛弱動畫
- ❌ Chick 會主動提醒："我好餓...需要更多知識！"
- ⚠️ 視覺: 小雞無精打采，顏色變淡

---

## 🏗️ 架構設計

### 2.1 資料庫擴展

#### 新增欄位

```sql
-- 在 profiles 表新增
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chick_hunger_last_updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chick_last_fed_at TIMESTAMPTZ;

-- 在 battle_progression_state 表新增（用於 Buff）
ALTER TABLE battle_progression_state ADD COLUMN IF NOT EXISTS chick_well_fed_expires_at TIMESTAMPTZ;
```

#### 新增表

```sql
-- 錯題複習進度追蹤
CREATE TABLE IF NOT EXISTS chick_error_review_progress (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_count INTEGER DEFAULT 0 CHECK (current_count >= 0),
  last_reset_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 技能使用記錄
CREATE TABLE IF NOT EXISTS chick_skill_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('SOS', 'TIME_FREEZE')),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  battle_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chick_skill_usage_user_date ON chick_skill_usage(user_id, DATE(used_at));
```

---

### 2.2 API 設計

#### 核心函數: 飢餓度更新邏輯

```typescript
// lib/chick/hunger.ts
export async function updateHungerOverTime(
  supabase: SupabaseClient,
  userId: string
): Promise<{ newHunger: number; updated: boolean }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('chick_hunger, chick_hunger_last_updated_at')
    .eq('id', userId)
    .single()

  if (!profile) return { newHunger: 50, updated: false }

  const lastUpdate = profile.chick_hunger_last_updated_at 
    ? new Date(profile.chick_hunger_last_updated_at)
    : new Date()
  const now = new Date()
  const hoursPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

  if (hoursPassed < 1) {
    return { newHunger: profile.chick_hunger || 50, updated: false }
  }

  // 每小時 +5 點
  const hungerIncrease = Math.floor(hoursPassed * 5)
  const newHunger = Math.min(100, (profile.chick_hunger || 50) + hungerIncrease)

  await supabase
    .from('profiles')
    .update({
      chick_hunger: newHunger,
      chick_hunger_last_updated_at: now.toISOString()
    })
    .eq('id', userId)

  return { newHunger, updated: true }
}
```

#### 修改: `/api/chick/status` 

```typescript
// 在 GET /api/chick/status 中
export async function GET() {
  // ... 現有邏輯 ...
  
  // 1. 更新飢餓度（時間驅動）
  await updateHungerOverTime(supabase, user.id)
  
  // 2. 檢查飽足狀態，應用 Buff
  const { data: profile } = await supabase
    .from('profiles')
    .select('chick_hunger')
    .eq('id', user.id)
    .single()
  
  const isWellFed = (profile?.chick_hunger || 50) < 30
  const isHungry = (profile?.chick_hunger || 50) > 80
  
  // 3. 更新 battle_progression_state 的 Buff
  if (isWellFed) {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 小時有效
    
    await supabase
      .from('battle_progression_state')
      .upsert({
        user_id: user.id,
        chick_well_fed_expires_at: expiresAt.toISOString()
      }, { onConflict: 'user_id' })
  }
  
  // ... 返回狀態 ...
}
```

#### 修改: `/api/play/progression/apply-battle`

```typescript
// 在 applyBattleProgression 函數中
export async function applyBattleProgression(...) {
  // ... 現有邏輯 ...
  
  for (const participant of payload.participants) {
    // ... 現有計算 ...
    
    // 1. 增加飢餓度（活動驅動）
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('chick_hunger, chick_hunger_last_updated_at')
      .eq('id', participant.userId)
      .single()
    
    const newHunger = Math.min(100, (currentProfile?.chick_hunger || 50) + 15)
    await supabase
      .from('profiles')
      .update({
        chick_hunger: newHunger,
        chick_hunger_last_updated_at: new Date().toISOString()
      })
      .eq('id', participant.userId)
    
    // 2. 給予食物碗獎勵
    const bowlsReward = participant.didWin ? 3 : 1
    await supabase.rpc('increment_food_bowls', {
      p_user_id: participant.userId,
      p_amount: bowlsReward
    })
    
    // 3. 檢查飽足狀態，應用 XP/金幣加成
    const isWellFed = newHunger < 30
    if (isWellFed) {
      // 在計算 XP 時應用 1.1x 倍率
      xpResult.totalXp = Math.floor(xpResult.totalXp * 1.1)
      // 金幣加成在返回結果中標記，由前端處理
    }
    
    // ... 繼續現有邏輯 ...
  }
}
```

#### 修改: `/api/missions/complete`

```typescript
// 在 POST /api/missions/complete 中
export async function POST(req: NextRequest) {
  // ... 現有邏輯 ...
  
  // 1. 增加飢餓度
  await supabase.rpc('increment_chick_hunger', {
    p_user_id: user.id,
    p_amount: 10
  })
  
  // 2. 給予食物碗獎勵
  await supabase.rpc('increment_food_bowls', {
    p_user_id: user.id,
    p_amount: 5
  })
  
  // ... 返回結果 ...
}
```

#### 新增: `/api/chick/review-progress`

```typescript
// POST /api/chick/review-progress
// 追蹤錯題複習進度
export async function POST(req: NextRequest) {
  const { supabase, user } = await getApiUser(req)
  const { questionId } = await req.json()
  
  // 1. 更新複習進度
  const { data: progress } = await supabase
    .from('chick_error_review_progress')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  
  const today = new Date().toISOString().split('T')[0]
  const lastReset = progress?.last_reset_at || today
  
  // 重置每日計數
  let currentCount = progress?.current_count || 0
  if (lastReset !== today) {
    currentCount = 0
  }
  
  currentCount += 1
  
  // 2. 每 5 題給予 1 碗
  const bowlsToAdd = Math.floor(currentCount / 5) - Math.floor((currentCount - 1) / 5)
  
  if (bowlsToAdd > 0) {
    await supabase.rpc('increment_food_bowls', {
      p_user_id: user.id,
      p_amount: bowlsToAdd
    })
  }
  
  // 3. 更新進度
  await supabase
    .from('chick_error_review_progress')
    .upsert({
      user_id: user.id,
      current_count: currentCount,
      last_reset_at: today,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  
  return NextResponse.json({
    success: true,
    currentCount,
    bowlsEarned: bowlsToAdd
  })
}
```

---

### 2.3 UI/UX 優化設計

#### 優化 1: ChickInteractionModal 重新設計

**設計原則**:
- 清晰的信息層級
- 即時反饋
- 情感化設計

**改進點**:

1. **飢餓度顯示優化**:
   ```tsx
   // 新增視覺狀態指示
   - 飽足: 綠色光環 + "Well Fed!" 標籤
   - 正常: 黃色進度條
   - 飢餓: 紅色閃爍 + "Hungry!" 警告
   ```

2. **食物碗獲取提示**:
   ```tsx
   // 移除購買按鈕，新增獲取途徑說明
   <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4 rounded-xl">
     <h4 className="text-sm font-semibold mb-2">如何獲得食物碗？</h4>
     <ul className="space-y-1 text-xs text-slate-300">
       <li>✅ 完成對戰：勝利 +3 碗，失敗 +1 碗</li>
       <li>✅ 完成每日任務：+5 碗</li>
       <li>✅ 複習錯題（每 5 題）：+1 碗</li>
     </ul>
   </div>
   ```

3. **狀態影響說明**:
   ```tsx
   // 動態顯示當前狀態效果
   {hunger < 30 && (
     <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg">
       <div className="flex items-center gap-2">
         <Sparkles className="w-4 h-4 text-green-400" />
         <span className="text-sm text-green-300">
           飽足狀態：對戰 XP +10%，金幣 +10%
         </span>
       </div>
     </div>
   )}
   
   {hunger > 80 && (
     <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg animate-pulse">
       <div className="flex items-center gap-2">
         <AlertTriangle className="w-4 h-4 text-red-400" />
         <span className="text-sm text-red-300">
           飢餓狀態：無法使用戰鬥技能
         </span>
       </div>
     </div>
   )}
   ```

#### 優化 2: ChickAvatar 狀態顯示

**設計**:
- 根據飢餓度顯示不同動畫
- 飽足：光環效果
- 飢餓：虛弱動畫 + 提示氣泡

```tsx
// 在 ChickAvatar 中
const getHungerVisualState = (hunger: number) => {
  if (hunger < 30) return 'well-fed' // 光環效果
  if (hunger > 80) return 'hungry' // 虛弱動畫
  return 'normal'
}

// 動畫效果
{hungerState === 'well-fed' && (
  <motion.div
    className="absolute inset-0 rounded-full border-2 border-green-400/50"
    animate={{
      scale: [1, 1.1, 1],
      opacity: [0.5, 0.8, 0.5]
    }}
    transition={{ repeat: Infinity, duration: 2 }}
  />
)}
```

#### 優化 3: 戰鬥畫面整合

**設計**:
- Chick 出現在右下角（不干擾答題）
- 答對：跳躍動畫 + 煙火特效
- 答錯：驚慌動畫 + 鼓勵訊息
- 連對：燃燒特效

```tsx
// 在 BattleQuestionV3 中
<div className="fixed bottom-4 right-4 z-10">
  <ChickBattleCompanion
    evolutionStage={evolutionStage}
    evolutionVariant={evolutionVariant}
    hunger={hunger}
    intimacy={intimacy}
    onAnswer={handleAnswer}
    streak={player1Streak}
  />
</div>
```

---

### 2.4 戰鬥技能系統

#### SOS 技能設計

**條件**:
- `hunger < 50`（不能太餓）
- `intimacy >= 200`
- 每日限用 1 次（可隨親密度提升）

**效果**:
- 刪除 2 個錯誤選項
- 冷卻時間：24 小時

**UI**:
```tsx
<Button
  onClick={handleSOS}
  disabled={!canUseSOS || isOnCooldown}
  className="bg-purple-600 hover:bg-purple-700"
>
  <HelpCircle className="w-4 h-4 mr-2" />
  SOS (50/50)
  {isOnCooldown && (
    <span className="ml-2 text-xs">
      {formatCooldown(cooldownRemaining)}
    </span>
  )}
</Button>
```

---

## 📋 實作優先級

### Phase 1: 核心機制（P0 - 1週）
1. ✅ 實作飢餓度時間/活動增長機制
2. ✅ 修改對戰結算 API，加入食物碗獎勵
3. ✅ 修改每日任務 API，加入食物碗獎勵
4. ✅ 實作錯題複習進度追蹤
5. ✅ 移除/禁用購買功能
6. ✅ 更新 UI，顯示獲取途徑

### Phase 2: 狀態影響（P1 - 3天）
1. ✅ 實作飽足狀態 Buff（XP/金幣 +10%）
2. ✅ 實作飢餓狀態 Debuff（禁用技能）
3. ✅ 更新 UI 狀態顯示
4. ✅ 優化 ChickAvatar 視覺效果

### Phase 3: 戰鬥整合（P1 - 5天）
1. ✅ 在 BattleQuestionV3 中整合 Chick
2. ✅ 實作答題反應動畫
3. ✅ 實作 SOS 技能
4. ✅ 實作技能使用限制

### Phase 4: 探險優化（P2 - 1週）
1. ✅ 實作自動探險觸發
2. ✅ 實作錯題回歸機制
3. ✅ 實作冷知識卡片
4. ✅ 新增 exploration_loot 表

### Phase 5: 作息系統（P2 - 3天）
1. ✅ 實作時間判斷邏輯
2. ✅ 實作陪讀模式
3. ✅ 新增睡眠/陪讀圖片

---

## 🎨 UI/UX 設計細節

### 色彩系統

```css
/* 飽足狀態 */
--well-fed-primary: #10b981; /* green-500 */
--well-fed-glow: rgba(16, 185, 129, 0.3);

/* 正常狀態 */
--normal-primary: #f59e0b; /* amber-500 */

/* 飢餓狀態 */
--hungry-primary: #ef4444; /* red-500 */
--hungry-warning: rgba(239, 68, 68, 0.2);
```

### 動畫時序

```typescript
// 答對動畫
const correctAnimation = {
  initial: { scale: 1, y: 0 },
  animate: { 
    scale: [1, 1.2, 1],
    y: [0, -20, 0],
    rotate: [0, 10, -10, 0]
  },
  transition: { duration: 0.6, ease: "easeOut" }
}

// 答錯動畫
const incorrectAnimation = {
  initial: { x: 0 },
  animate: { 
    x: [0, -10, 10, -10, 10, 0],
    opacity: [1, 0.7, 1]
  },
  transition: { duration: 0.4 }
}
```

---

## ✅ 驗證標準

### 功能驗證
- [ ] 飢餓度每小時正確增加 5 點
- [ ] 對戰後飢餓度增加 15 點
- [ ] 勝利獲得 3 碗，失敗獲得 1 碗
- [ ] 完成任務獲得 5 碗
- [ ] 複習 5 題獲得 1 碗
- [ ] 飽足狀態正確應用 Buff
- [ ] 飢餓狀態正確禁用技能

### UX 驗證
- [ ] 用戶清楚知道如何獲得食物碗
- [ ] 狀態影響清晰可見
- [ ] 動畫流暢不卡頓
- [ ] 戰鬥中 Chick 不干擾答題

---

## 📝 技術債務與後續優化

1. **性能優化**: 飢餓度更新可改為批量處理
2. **數據分析**: 追蹤食物碗獲取與使用模式
3. **平衡調整**: 根據數據調整獎勵數量
4. **視覺資源**: 需要設計不同階段的 Chick 圖片

---

**設計完成日期**: 2025-01-XX  
**預計實作時間**: 2-3 週  
**負責人**: Engineering Team

