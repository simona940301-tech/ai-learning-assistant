# 🚨 Onboarding 流程問題分析

## 📋 問題描述

用戶反映：**玩完遊戲之後會倒回到目標設定**，但正確流程應該是：
1. **目標設定** (`/onboarding/goal`)
2. **玩遊戲** (`/onboarding/challenge`)
3. **註冊保存資料的 CTA** → 導向 `/onboarding` (登入頁)
4. **Google 登入** → 完成註冊並保存資料

---

## 🔍 當前實際流程分析

### 流程步驟追蹤

#### 1️⃣ 目標設定頁 (`/onboarding/goal`)
- **文件**: `apps/web/app/onboarding/goal/page.tsx`
- **完成後導向**: `router.push('/onboarding/challenge')` (第 174, 219 行)
- ✅ **正確**

#### 2️⃣ 挑戰/遊戲頁 (`/onboarding/challenge`)
- **文件**: `apps/web/app/onboarding/challenge/page.tsx`
- **完成後導向**: `router.push('/onboarding/reward')` (第 450, 471, 474 行)
- ✅ **正確**

#### 3️⃣ 獎勵頁 (`/onboarding/reward`)
- **文件**: `apps/web/app/onboarding/reward/page.tsx`
- **問題所在**：

**匿名模式**：
- 第 148-151 行：`handleRegister()` 導向 `/onboarding?from=reward`
- 第 304-332 行：顯示註冊 CTA 卡片
- 第 348-355 行：底部「註冊儲存學習資料」按鈕

**已登入模式**：
- 第 340-346 行：顯示「繼續設定 →」按鈕，導向 `/onboarding/avatar`

#### 4️⃣ 登入/註冊頁 (`/onboarding/page.tsx`)
- **文件**: `apps/web/app/onboarding/page.tsx`
- **問題所在**：

**邏輯分析** (第 31-113 行)：

1. **如果沒有用戶** (`!user`):
   ```typescript
   if (!user) {
     const urlParams = new URLSearchParams(window.location.search)
     const fromReward = urlParams.get('from') === 'reward'
     
     if (fromReward) {
       // 來自 reward 頁面，停留在登入頁
       return
     }
     
     // ❌ 問題：否則會導向 goal 頁，造成循環！
     router.push('/onboarding/goal')
     return
   }
   ```

2. **如果已登入**：
   - 檢查 onboarding 狀態
   - 如果未完成 → 導向 `/onboarding/goal` (第 95, 100 行)
   - 如果已完成 → 導向 `/home`

---

## 🐛 問題根源

### 主要問題

1. **流程循環**：
   - Reward 頁面 → 點擊註冊 CTA → `/onboarding?from=reward`
   - 但如果有任何原因導致 `from=reward` 參數丟失，就會導向 `/onboarding/goal`
   - 這會造成用戶重新開始流程

2. **登入後的重定向邏輯混亂**：
   - 註冊成功後，`AuthProvider` 可能會根據不同狀態導向不同頁面
   - 沒有明確的邏輯處理「從 reward 頁面註冊後，應該回到哪裡」

3. **匿名資料遷移時機**：
   - `migrateAnonymousData()` 在註冊時執行 (第 144-217 行)
   - 但沒有明確的後續流程說明用戶應該去哪裡

### 正確的流程設計（統一流程）

**匿名用戶流程**：
```
/onboarding/goal (目標設定)
  ↓
/onboarding/challenge (遊戲測驗)
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

**已登入用戶流程**：
```
直接到 /home（已註冊過，不需要重新 onboarding）
```

**實際實現中**：
- 目標設定在 **STEP 1** (歡迎頁之前)
- 挑戰在 **STEP 2**
- 獎勵在 **STEP 3**
- 然後直接進入註冊流程

---

## ✅ 正確流程設計（根據用戶描述）

### 匿名流程

1. **目標設定** (`/onboarding/goal`)
   - 選擇大學/科系或「我還在摸索方向」
   - 年級選擇
   - 模考自評

2. **挑戰/遊戲** (`/onboarding/challenge`)
   - 7 題測驗
   - 記錄結果到 localStorage/sessionStorage

3. **獎勵頁** (`/onboarding/reward`)
   - 顯示獎勵 (XP、金幣、徽章)
   - **註冊 CTA**：「註冊儲存學習資料」
   - 點擊後 → `/onboarding` (登入頁)

4. **登入/註冊頁** (`/onboarding`)
   - Google 登入
   - 註冊後 → **遷移匿名資料** → 繼續流程

5. **完成流程** (已登入後)
   - 回到 reward 頁或進入下一步
   - 完成 onboarding

---

## 🔧 修復方案

### 方案 1: 修復登入頁的重定向邏輯

**問題**: `/onboarding/page.tsx` 在沒有 `from=reward` 時會導向 `/onboarding/goal`

**修復**:
```typescript
// 在 /onboarding/page.tsx 中
if (!user) {
  // 檢查是否有匿名資料（表示用戶已經完成了 challenge）
  const hasAnonymousData = 
    sessionStorage.getItem('onboarding_challenge_score') ||
    sessionStorage.getItem('onboarding_challenge_results')
  
  if (hasAnonymousData) {
    // 有匿名資料，說明用戶已經完成 challenge，應該停留在登入頁
    // 不要導向 goal 頁，否則會循環
    return
  }
  
  // 沒有匿名資料，說明是新用戶，導向 goal 頁
  router.push('/onboarding/goal')
  return
}
```

### 方案 2: 註冊後的重定向邏輯

**問題**: 註冊成功後沒有明確的後續流程

**修復**:
```typescript
// 在 /onboarding/page.tsx 的 migrateAnonymousData 後
const handleSubmit = async (e: React.FormEvent) => {
  // ... 註冊邏輯 ...
  
  if (!isLogin) {
    await signUp(email, password, name.trim())
    await migrateAnonymousData()
    
    // 註冊成功後，檢查是否有匿名資料
    const hasAnonymousData = sessionStorage.getItem('onboarding_challenge_score')
    
    if (hasAnonymousData) {
      // 有匿名資料，已經完成 challenge，導向 reward 頁
      router.push('/onboarding/reward')
    } else {
      // 沒有匿名資料，從頭開始 onboarding
      router.push('/onboarding/goal')
    }
  }
}
```

### 方案 3: Auth Callback 的處理

**問題**: `auth/callback/page.tsx` 可能沒有正確處理「從 reward 註冊」的情況

**修復**:
```typescript
// 在 auth/callback/page.tsx 中
const redirectTo = urlParams.get('redirect')

// 檢查是否有匿名資料
const hasAnonymousData = sessionStorage.getItem('onboarding_challenge_score')

if (hasAnonymousData) {
  // 有匿名資料，導向 reward 頁繼續流程
  router.push('/onboarding/reward')
} else if (redirectTo) {
  // 有明確的重定向目標
  router.push(redirectTo)
} else {
  // 否則按照正常的 onboarding 流程
  if (data?.onboarding_completed) {
    router.push('/home')
  } else {
    router.push('/onboarding/goal')
  }
}
```

---

## 📊 流程對比表

| 步驟 | 預期流程 | 當前實際流程 | 問題 |
|------|---------|-------------|------|
| 1 | 目標設定 | 目標設定 | ✅ 正確 |
| 2 | 挑戰/遊戲 | 挑戰/遊戲 | ✅ 正確 |
| 3 | 獎勵頁 | 獎勵頁 | ✅ 正確 |
| 4 | 註冊 CTA → `/onboarding` | 註冊 CTA → `/onboarding?from=reward` | ⚠️ 參數可能丟失 |
| 5 | 登入後回到 reward | 登入後可能導向 goal | ❌ 造成循環 |
| 6 | 完成 onboarding | 流程混亂 | ❌ 沒有統一流程 |

---

## 🎯 統一流程設計

### 只有一種流程

**匿名用戶流程**：
```
/onboarding/goal (目標設定)
  ↓
/onboarding/challenge (遊戲測驗)
  ↓
/onboarding/reward (獎勵頁，顯示註冊 CTA)
  ↓
/onboarding (登入頁，從 reward 來的)
  ↓
[Google 登入]
  ↓
/auth/callback (檢查匿名資料)
  ↓
/onboarding/reward (回到獎勵頁，已登入狀態)
  ↓
/onboarding/avatar 或其他後續步驟
  ↓
完成 onboarding → /home
```

**已登入用戶流程**：
```
/onboarding/goal (目標設定)
  ↓
/onboarding/challenge (遊戲測驗)
  ↓
/onboarding/reward (獎勵頁)
  ↓
/onboarding/avatar 或其他後續步驟
  ↓
完成 onboarding → /home
```

---

## 🔍 需要檢查的文件

1. ✅ `apps/web/app/onboarding/page.tsx` - 登入頁重定向邏輯
2. ✅ `apps/web/app/onboarding/reward/page.tsx` - 註冊 CTA 處理
3. ✅ `apps/web/app/(auth)/auth/callback/page.tsx` - 登入後回調
4. ✅ `apps/web/app/page.tsx` - 根頁面重定向
5. ✅ `apps/web/lib/auth-context.tsx` - 認證上下文的重定向邏輯

---

## 🚨 關鍵問題總結

1. **登入頁會無條件導向 goal 頁**，即使用戶已經完成 challenge
2. **沒有統一的流程設計文檔**，導致不同開發者實作時理解不同
3. **註冊後的重定向邏輯不清晰**，不知道應該去哪裡
4. **匿名資料遷移後沒有明確的後續流程**

---

## 📝 下一步行動

1. **統一流程設計文檔** - 明確只有一種流程
2. **修復登入頁邏輯** - 檢查匿名資料，避免循環
3. **修復註冊後重定向** - 明確後續步驟
4. **測試完整流程** - 確保不會回到 goal 頁

---

**最後更新**: 2025-01-XX
**狀態**: 🔴 需要立即修復

