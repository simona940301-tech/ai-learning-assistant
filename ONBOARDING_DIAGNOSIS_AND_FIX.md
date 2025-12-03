# 🔍 Onboarding 流程診斷報告

## 問題描述

你遇到的問題：**完成匿名 onboarding 流程後註冊，卻發現自己是老用戶（onboarding_completed = true）**

## 問題根源分析

經過徹底檢查，我發現流程本身是**正確的**，問題最可能的原因是：

### ✅ 正確的流程設計

1. **新用戶創建** (handle_new_user trigger)
   - ✅ 正確設置 `onboarding_completed = false`
   - ✅ 初始化所有必要欄位
   - 📍 位置：[supabase/migrations/20251201_ultimate_fix.sql:104-144](supabase/migrations/20251201_ultimate_fix.sql#L104-L144)

2. **匿名資料遷移** (auth callback)
   - ✅ 正確檢查是否為老用戶
   - ✅ 只為新用戶遷移匿名數據
   - ✅ 老用戶直接導向 /home 並清除匿名資料
   - 📍 位置：[apps/web/app/(auth)/auth/callback/page.tsx:287-328](apps/web/app/(auth)/auth/callback/page.tsx#L287-L328)

3. **Onboarding 完成** (complete page)
   - ✅ 正確設置 `onboarding_completed = true`
   - ✅ 只在用戶完成所有步驟後才設置
   - 📍 位置：[apps/web/app/onboarding/complete/page.tsx:159-165](apps/web/app/onboarding/complete/page.tsx#L159-L165)

### 🎯 最可能的原因

**你使用的是已經存在的老用戶帳號！**

Duolingo 的流程設計是：
- 新用戶 → `onboarding_completed = false` → 完整 onboarding
- 老用戶 → `onboarding_completed = true` → 跳過 onboarding，直接到首頁

你的情況：
```
1. 打開 App → 進入匿名 onboarding
2. Goal → Avatar → Challenge → 測驗
3. 測驗完成 → Reward 頁面
4. 點擊「註冊」→ 使用已存在的 Email 登入
5. Auth callback 檢查：onboarding_completed = true ✅
6. 判定為老用戶 → 清除匿名資料 → 導向 /home
```

## 🔧 解決方案

### 方案 1：使用全新的 Email 註冊（推薦）

**這是最簡單且最能驗證流程的方法：**

1. 登出所有帳號
2. 清除瀏覽器資料（或使用無痕模式）
3. 使用**從未註冊過**的 Email
4. 完整走一遍流程

### 方案 2：重置現有用戶的 Onboarding 狀態

**如果你想測試現有帳號：**

1. 先使用診斷工具檢查狀態：
```bash
npx tsx diagnose-onboarding.ts your-email@example.com
```

2. 如果確認是老用戶，手動重置：
```sql
-- 重置 profile
UPDATE profiles
SET onboarding_completed = false,
    avatar_url = NULL,
    target_university = NULL,
    target_department = NULL,
    updated_at = NOW()
WHERE id = 'your-user-id';

-- 刪除舊的 onboarding sessions
DELETE FROM onboarding_sessions WHERE user_id = 'your-user-id';

-- 刪除舊的學習計畫筆記（可選）
DELETE FROM backpack_notes
WHERE user_id = 'your-user-id'
AND question = '我的專屬學習計畫';
```

3. 登出並重新開始流程

### 方案 3：添加「重新開始 Onboarding」功能（開發用）

如果需要頻繁測試，可以添加一個開發工具：

```typescript
// apps/web/app/dev/reset-onboarding/page.tsx
'use client'

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { supabaseBrowserClient } from '@/lib/supabase'

export default function ResetOnboardingPage() {
  const { user } = useAuth()

  const handleReset = async () => {
    if (!user) {
      alert('請先登入')
      return
    }

    if (!confirm('確定要重置 onboarding 狀態？這會清除所有相關資料！')) {
      return
    }

    try {
      // Reset profile
      await supabaseBrowserClient
        .from('profiles')
        .update({
          onboarding_completed: false,
          avatar_url: null,
          target_university: null,
          target_department: null,
        })
        .eq('id', user.id)

      // Delete sessions
      await supabaseBrowserClient
        .from('onboarding_sessions')
        .delete()
        .eq('user_id', user.id)

      alert('重置成功！請重新開始 onboarding')
      window.location.href = '/onboarding'
    } catch (error) {
      console.error('Reset failed:', error)
      alert('重置失敗')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">開發工具：重置 Onboarding</h1>
      <Button onClick={handleReset} variant="destructive">
        重置我的 Onboarding 狀態
      </Button>
    </div>
  )
}
```

## 📊 Duolingo 的 Onboarding 設計模式

經過分析，Duolingo 採用的是：

### 核心原則

1. **匿名優先體驗** (Anonymous-First Experience)
   - 不要求登入，先讓用戶體驗產品
   - 降低進入門檻，提高轉換率

2. **延遲註冊** (Delayed Registration)
   - 在用戶已經投入後才要求註冊
   - 此時用戶更願意註冊以保存進度

3. **無縫資料遷移** (Seamless Data Migration)
   - 使用 localStorage/sessionStorage 暫存匿名數據
   - 註冊後自動遷移到資料庫
   - 用戶感覺不到任何中斷

4. **智能狀態恢復** (Smart State Recovery)
   - 如果中斷，下次可從斷點繼續
   - 基於 session 記錄智能判斷應該導向哪個步驟

### 後端架構

```
┌─────────────────────────────────────────────────────────┐
│ auth.users (Supabase Auth)                              │
│ - 用戶認證基礎                                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Trigger: on_auth_user_created
                   ↓
┌─────────────────────────────────────────────────────────┐
│ profiles                                                 │
│ - onboarding_completed: false (新用戶預設)               │
│ - 其他用戶基本資料                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ 1:N Relationship
                   ↓
┌─────────────────────────────────────────────────────────┐
│ onboarding_sessions                                      │
│ - status: 'in_progress' / 'completed' / 'abandoned'      │
│ - current_step: 1-5                                      │
│ - challenge_completed_at, scorecard_submitted_at         │
│ - 各步驟的完成時間戳記                                      │
└─────────────────────────────────────────────────────────┘
```

### 狀態機設計

```
未登入用戶:
  /onboarding → Goal → Avatar → Challenge → [需要註冊]
                                               ↓
                                          Reward (顯示「註冊保存進度」CTA)
                                               ↓
                                          點擊註冊 → /auth/login

已登入新用戶 (onboarding_completed = false):
  - 檢查 onboarding_sessions 的進度
  - 智能導向到對應步驟繼續

已登入老用戶 (onboarding_completed = true):
  - 直接導向 /home
  - 如果有匿名資料，清除之
```

## 🧪 測試流程

### 完整的新用戶測試流程

```bash
# 1. 準備一個全新的 Email（從未註冊過）
NEW_EMAIL="test_$(date +%s)@example.com"
echo "測試 Email: $NEW_EMAIL"

# 2. 清除瀏覽器所有資料
# - 清除 cookies
# - 清除 localStorage
# - 清除 sessionStorage
# 或使用無痕模式

# 3. 開始測試
# 步驟 1: 打開網站（未登入）
open http://localhost:3000

# 預期: 自動導向 /onboarding/goal

# 步驟 2: 完成目標設定
# - 選擇目標大學
# - 選擇目標科系
# - 點擊「下一步」
# 預期: 導向 /onboarding/avatar

# 步驟 3: 選擇頭像
# - 選擇一個頭像
# - 點擊「確認」
# 預期: 導向 /onboarding/challenge

# 步驟 4: 完成測驗
# - 回答 6 題
# - 查看錯題詳解
# - 點擊「查看獎勵」
# 預期: 導向 /onboarding/reward

# 步驟 5: 查看獎勵並註冊
# - 看到 XP、金幣、徽章
# - 看到「註冊保存進度」CTA
# - 點擊「立即註冊」
# 預期: 導向 /auth/login

# 步驟 6: 使用新 Email 註冊
# - 輸入新的 Email
# - 完成 OAuth 或 Email 註冊
# 預期:
#   1. 導向 /auth/callback
#   2. 檢查到是新用戶 (onboarding_completed = false)
#   3. 遷移匿名資料到 onboarding_sessions
#   4. 根據進度導向 /onboarding/reward（因為已完成 challenge）

# 步驟 7: 繼續完成流程
# - 在 Reward 頁面點擊「繼續設定」
# 預期: 導向 /onboarding/habits

# 步驟 8: 完成習慣問卷
# - 填寫學習習慣問卷
# - 點擊「完成」
# 預期: 導向 /onboarding/complete

# 步驟 9: 完成頁面
# - 看到「恭喜完成註冊」
# - 可選擇開啟通知
# - 點擊「開始使用」
# 預期:
#   1. 設置 onboarding_completed = true
#   2. 導向 /home
```

### 驗證資料庫狀態

```bash
# 使用診斷工具
npx tsx diagnose-onboarding.ts $NEW_EMAIL

# 預期輸出:
# ✅ onboarding_completed = true
# ✅ 有完整的 onboarding_session (status = 'completed')
# ✅ 有 challenge 分數記錄
# ✅ 有 avatar_url
# ✅ 有 target_university / target_department
```

## 📝 確認清單

測試前請確認：

- [ ] 使用的是**全新的 Email**（從未註冊過）
- [ ] 清除了瀏覽器快取和 storage
- [ ] 資料庫的 `handle_new_user` trigger 已正確部署
- [ ] 所有 onboarding 相關的 migration 都已執行

測試後請確認：

- [ ] 新用戶的 `onboarding_completed` 初始為 `false`
- [ ] 匿名資料成功遷移到 `onboarding_sessions`
- [ ] 完成所有步驟後 `onboarding_completed` 變為 `true`
- [ ] 可以正常登入並導向 `/home`

## 🔍 Debug 技巧

### 1. 查看瀏覽器 Console Logs

關鍵日誌標記：
- `[Onboarding]` - onboarding 頁面的路由邏輯
- `[AuthCallback]` - 認證回調的處理邏輯
- `[Reward]` - Reward 頁面的資料處理
- `[Complete]` - Complete 頁面的完成邏輯

### 2. 查看 localStorage/sessionStorage

```javascript
// 在 Chrome DevTools Console 中執行
console.log('Anonymous Data:', localStorage.getItem('onboarding_anonymous_data'))
console.log('Challenge Score:', sessionStorage.getItem('onboarding_challenge_score'))
console.log('Challenge Results:', sessionStorage.getItem('onboarding_challenge_results'))
```

### 3. 查看資料庫狀態

```sql
-- 查詢用戶狀態
SELECT
  id,
  email,
  onboarding_completed,
  avatar_url,
  target_university,
  created_at
FROM profiles
WHERE email = 'your-email@example.com';

-- 查詢 onboarding sessions
SELECT
  id,
  user_id,
  status,
  current_step,
  challenge_completed_at,
  scorecard_submitted_at,
  completed_at,
  created_at
FROM onboarding_sessions
WHERE user_id = 'user-id-here'
ORDER BY created_at DESC;
```

## 總結

你的 onboarding 流程設計是**完全正確**的，符合 Duolingo 的最佳實踐。

問題很可能是：
1. **使用了已存在的老用戶帳號**進行測試
2. 老用戶的 `onboarding_completed = true` 觸發了保護機制
3. 系統正確地將老用戶導向 `/home` 並清除了匿名資料

**建議：使用全新的 Email 重新測試一遍完整流程。**

如果使用新 Email 仍有問題，請使用診斷工具並提供輸出給我。
