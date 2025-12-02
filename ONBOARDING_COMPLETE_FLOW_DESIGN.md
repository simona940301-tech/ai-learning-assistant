# 🎯 Onboarding 完整流程設計（統一流程）

## 📋 流程總覽

### 匿名用戶流程（新用戶首次開啟）

```
/onboarding/goal (目標設定)
  ↓
/onboarding/challenge (遊戲測驗 - 7題)
  ↓
/onboarding/reward (獎勵頁，顯示註冊 CTA)
  ↓
/onboarding (登入頁，從 reward 來的)
  ↓
[Google 登入]
  ↓
/auth/callback (檢查匿名資料，遷移資料)
  ↓
/onboarding/avatar (設定 profile 個人資訊、頭像)
  ↓
/onboarding/habits (5題學習習慣問卷 - 生成台大團隊學習計劃)
  ↓
/onboarding/complete (完成頁 - 顯示「24小時內由台大團隊制定完畢」)
  ↓
/home (完成 onboarding)
```

### 已登入用戶流程（已註冊過，保持登入狀態）

```
直接到 /home（不需要重新 onboarding）
```

---

## 📝 各步驟詳細說明

### STEP 1: 目標設定 (`/onboarding/goal`)
- **功能**：選擇大學/科系或「我還在摸索方向」、年級、模考自評
- **資料儲存**：localStorage（匿名模式）或資料庫（已登入）
- **完成後**：導向 `/onboarding/challenge`

### STEP 2: 挑戰/遊戲 (`/onboarding/challenge`)
- **功能**：7 題測驗，動態難度調整
- **資料儲存**：sessionStorage（匿名模式）或資料庫（已登入）
- **完成後**：導向 `/onboarding/reward`

### STEP 3: 獎勵頁 (`/onboarding/reward`)
- **功能**：顯示獎勵（XP、金幣、徽章）、今日任務（已登入）
- **匿名模式**：顯示「註冊儲存學習資料」CTA
- **已登入模式**：顯示「繼續設定 →」按鈕
- **完成後**：
  - 匿名：導向 `/onboarding?from=reward`
  - 已登入：導向 `/onboarding/avatar`

### STEP 4: 登入/註冊頁 (`/onboarding`)
- **功能**：Google 登入、Email/密碼登入
- **匿名資料遷移**：註冊成功後自動遷移 localStorage 和 sessionStorage 資料
- **完成後**：導向 `/auth/callback`

### STEP 5: Auth Callback (`/auth/callback`)
- **功能**：檢查認證狀態、遷移匿名資料到資料庫
- **邏輯**：
  - 如果有匿名資料 → 導向 `/onboarding/avatar`（繼續完成 onboarding）
  - 如果已完成 onboarding → 導向 `/home`
  - 否則 → 導向 `/onboarding/goal`

### STEP 6: 頭像設定 (`/onboarding/avatar`)
- **功能**：選擇個人頭像
- **資料儲存**：更新 `profiles.avatar_url`
- **完成後**：導向 `/onboarding/habits`

### STEP 7: 學習習慣問卷 (`/onboarding/habits`) ⭐ **重要：不能刪除**
- **功能**：5 題學習習慣調查，基於 Hooked Model
- **題目設計**：
  1. **Trigger（觸發）** - 什麼時候你會想要開始學習？
  2. **Action（行動）** - 你比較喜歡哪種學習方式？
  3. **Reward（獎勵）** - 什麼最能激勵你持續學習？
  4. **Investment（投資）** - 你願意在學習上投入什麼？
  5. **Frequency（頻率）** - 你希望多久收到一次學習提醒？
- **資料儲存**：
  - `onboarding_sessions.scorecard_responses`: JSONB 格式儲存所有答案
  - `onboarding_sessions.scorecard_submitted_at`: 提交時間
- **用途**：生成台大團隊學習計劃（24小時內）
- **完成後**：導向 `/onboarding/complete`

### STEP 8: 完成頁 (`/onboarding/complete`)
- **功能**：
  - 顯示「恭喜完成註冊！」
  - 顯示「您的專屬個人計劃會在 24 小時內由台大團隊制定完畢」
  - 開啟通知提醒（可選）
- **資料儲存**：
  - `onboarding_sessions.status = 'completed'`
  - `profiles.onboarding_completed = true`
- **完成後**：導向 `/home`

---

## 🚫 不需要的頁面（可以刪除）

根據統一流程，以下頁面不需要：

1. ❌ `/onboarding/goal-setup` - 重複的目標設定頁（已有 `/onboarding/goal`）
2. ❌ `/onboarding/intro` - 介紹頁（不需要）
3. ❌ `/onboarding/review` - 錯題回顧頁（已在 challenge 頁面內處理）
4. ❌ `/onboarding/page.tsx.backup` - 備份文件

## ✅ 需要保留的頁面

1. ✅ `/onboarding/goal` - 目標設定
2. ✅ `/onboarding/challenge` - 遊戲測驗
3. ✅ `/onboarding/reward` - 獎勵頁
4. ✅ `/onboarding` (page.tsx) - 登入頁
5. ✅ `/onboarding/avatar` - 頭像設定
6. ✅ `/onboarding/habits` - **5題學習習慣問卷（重要！用於生成台大團隊學習計劃）**
7. ✅ `/onboarding/complete` - 完成頁

---

## 🔧 需要修復的重定向邏輯

### 1. Auth Callback (`/auth/callback/page.tsx`)
**當前問題**：檢查 `scorecard_submitted_at` 來決定導向，但邏輯混亂

**修復方案**：
```typescript
// 檢查匿名資料（是否有 challenge 結果）
const hasAnonymousData = sessionStorage.getItem('onboarding_challenge_score')

if (hasAnonymousData) {
  // 有匿名資料，繼續完成 onboarding
  // 檢查已完成步驟
  const { data: session } = await supabase
    .from('onboarding_sessions')
    .select('scorecard_submitted_at')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (session?.scorecard_submitted_at) {
    // 已完成問卷，導向完成頁
    router.push('/onboarding/complete')
  } else {
    // 檢查是否已設定頭像
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
    
    if (profile?.avatar_url) {
      // 已設定頭像，導向問卷
      router.push('/onboarding/habits')
    } else {
      // 未設定頭像，導向頭像頁
      router.push('/onboarding/avatar')
    }
  }
} else if (data?.onboarding_completed) {
  // 已完成 onboarding，導向首頁
  router.push('/home')
} else {
  // 從頭開始 onboarding
  router.push('/onboarding/goal')
}
```

### 2. Reward 頁面 (`/onboarding/reward/page.tsx`)
**當前問題**：已登入用戶導向 `/onboarding/avatar`，但應檢查是否已設定頭像

**修復方案**：
- 已登入用戶：檢查是否已設定頭像，如果沒有 → `/onboarding/avatar`，如果有 → `/onboarding/habits`
- 匿名用戶：保持不變 → `/onboarding?from=reward`

### 3. Avatar 頁面 (`/onboarding/avatar/page.tsx`)
**當前問題**：完成後直接導向 `/home`

**修復方案**：
```typescript
// 完成後導向問卷頁
router.push('/onboarding/habits')
```

### 4. Habits 頁面 (`/onboarding/habits/page.tsx`)
**當前問題**：完成後導向 `/onboarding/complete`

**修復方案**：
- ✅ 保持不變，導向 `/onboarding/complete`（正確）

### 5. 登入頁 (`/onboarding/page.tsx`)
**當前問題**：可能導向 `/onboarding/goal` 造成循環

**修復方案**：
```typescript
// 檢查是否有匿名資料（已完成 challenge）
const hasAnonymousData = 
  sessionStorage.getItem('onboarding_challenge_score') ||
  sessionStorage.getItem('onboarding_challenge_results')

if (hasAnonymousData) {
  // 有匿名資料，停留在登入頁，不要導向 goal
  return
}
```

---

## 📊 資料庫 Schema

### `onboarding_sessions` 表
```sql
CREATE TABLE onboarding_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL, -- 'in_progress' | 'completed'
  current_step INTEGER,
  
  -- Challenge 資料
  challenge_score INTEGER,
  challenge_results JSONB,
  challenge_completed_at TIMESTAMPTZ,
  
  -- 習慣問卷資料 ⭐
  scorecard_responses JSONB DEFAULT '{}'::jsonb,
  scorecard_submitted_at TIMESTAMPTZ,
  
  -- 目標設定資料
  target_university TEXT,
  target_department TEXT,
  is_exploring BOOLEAN,
  current_grade TEXT,
  mock_exam_level INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### `profiles` 表
```sql
-- 相關欄位
avatar_url TEXT,
onboarding_completed BOOLEAN DEFAULT false,
target_university TEXT,
target_department TEXT,
```

---

## 🎯 關鍵決策點

### 1. 匿名資料遷移時機
- **時機**：註冊成功後立即遷移
- **位置**：`/onboarding/page.tsx` 的 `migrateAnonymousData()` 函數
- **遷移內容**：
  - `goalData` → `onboarding_sessions` 和 `profiles`
  - `challenge` 結果 → `onboarding_sessions.challenge_results`
  - 設定 `current_step = 3`（已完成 challenge，準備進入 reward）

### 2. 已登入用戶的流程判斷
- **條件**：`profiles.onboarding_completed = true`
- **行為**：直接導向 `/home`，不進入 onboarding 流程

### 3. 習慣問卷的時機
- **時機**：註冊並設定頭像後
- **目的**：收集學習習慣資料，生成台大團隊學習計劃
- **必須完成**：不能跳過（但可以稍後再填？需要確認）

---

## 🚀 實作優先級

### 高優先級（立即修復）
1. ✅ 修復登入頁重定向邏輯（避免循環）
2. ✅ 修復 auth callback 重定向邏輯
3. ✅ 修復 avatar 頁面完成後的導向（應導向 habits）
4. ✅ 確保 habits 問卷保留並正常運作

### 中優先級（後續優化）
1. 刪除不需要的頁面（goal-setup, intro, review）
2. 優化匿名資料遷移邏輯
3. 增加流程進度追蹤（顯示進度條）

### 低優先級（未來考慮）
1. 允許用戶稍後完成問卷（可選）
2. 問卷進度保存（允許中斷後繼續）

---

**最後更新**: 2025-01-XX
**狀態**: ✅ 流程設計完成，等待實作

