# ✅ Onboarding 舊流程清理總結

## 🎯 清理目標

刪除專案中與新的統一 onboarding 流程不同的所有舊邏輯和引用。

---

## ✅ 已完成項目

### 1. 刪除不需要的頁面
- ✅ `/onboarding/goal-setup` - 已刪除（與 `/onboarding/goal` 重複）
- ✅ `/onboarding/intro` - 已刪除（不需要介紹頁）
- ✅ `/onboarding/review` - 已刪除（錯題回顧已在 challenge 頁面內）
- ✅ `/onboarding/page.tsx.backup` - 已刪除（備份文件）

### 2. 刪除舊流程文檔
- ✅ `ONBOARDING_IMPLEMENTATION_PLAN.md` - 已刪除
  - 包含舊流程 STEP 4-6（goal-setup, basic-info, daily-mission）
  - 包含舊流程 STEP 7-10（scorecard 流程）
  - 這些都與新的統一流程不符

### 3. 更新 ProgressIndicator 組件
- ✅ `apps/web/components/onboarding/ProgressIndicator.tsx` - 已更新
  - 移除了舊步驟映射（goal-setup, basic-info, daily-mission）
  - 更新為新流程的 6 個步驟：
    1. 目標設定 (Goal)
    2. 遊戲測驗 (Challenge)
    3. 獎勵 (Reward)
    4. 頭像設定 (Avatar)
    5. 學習習慣問卷 (Habits)
    6. 完成 (Complete)
  - 更新 `getStepFromRoute()` 函數以匹配新流程

### 4. 更新流程分析文檔
- ✅ `ONBOARDING_FLOW_ISSUE_ANALYSIS.md` - 已更新
  - 修正流程描述，加入 `habits` 和 `complete` 步驟

---

## 🔍 檢查結果

### 確認無舊流程引用

**搜索結果**：
- ❌ 沒有找到 `goal-setup` 頁面的引用（已刪除）
- ❌ 沒有找到 `basic-info` 頁面的引用（不存在）
- ❌ 沒有找到 `daily-mission` onboarding 流程引用（不存在）
- ❌ 沒有找到 `welcome` onboarding 頁面引用（不存在）
- ❌ 沒有找到 `intro` onboarding 頁面引用（已刪除）
- ❌ 沒有找到 `review` onboarding 頁面引用（已刪除）

**保留的引用**：
- ✅ `daily-mission` 在 `play/page.tsx` 和 `dev-tools/guidance-demo/page.tsx` 中
  - 這是 **widget 標記**，不是 onboarding 流程的一部分
  - 用於主應用中的日常任務功能
  - **不需要刪除**

### 保留的註釋（正確）

以下頁面中的 STEP 註釋是**正確的**，符合新流程：
- ✅ `apps/web/app/onboarding/goal/page.tsx` - `STEP 1 — 目標設定`
- ✅ `apps/web/app/onboarding/challenge/page.tsx` - `STEP 2 — 快速測驗`
- ✅ `apps/web/app/onboarding/reward/page.tsx` - `STEP 3 — 獎勵頁面`
- ✅ `apps/web/app/onboarding/avatar/page.tsx` - `STEP 4 — 選擇頭像`

**注意**：新流程實際上還有 STEP 5 (habits) 和 STEP 6 (complete)，但這些頁面的註釋可以保持現狀，因為它們標記的是各自頁面的位置。

---

## 📋 新的統一流程（確認）

### 匿名用戶流程（8 步）

```
1. /onboarding/goal (目標設定)
   ↓
2. /onboarding/challenge (遊戲測驗 - 7題)
   ↓
3. /onboarding/reward (獎勵頁，顯示註冊 CTA)
   ↓
4. /onboarding (登入頁)
   ↓
5. [Google 登入] → /auth/callback
   ↓
6. /onboarding/avatar (設定頭像)
   ↓
7. /onboarding/habits (5題學習習慣問卷) ⭐
   ↓
8. /onboarding/complete (完成頁)
   ↓
9. /home (完成 onboarding)
```

### 已登入用戶流程

```
直接到 /home（不需要重新 onboarding）
```

---

## 🗂️ 保留的文件

### 保留的核心文件
- ✅ `ONBOARDING_COMPLETE_FLOW_DESIGN.md` - 新的統一流程設計
- ✅ `ONBOARDING_FLOW_FINAL_IMPLEMENTATION.md` - 最終實作總結
- ✅ `ONBOARDING_FLOW_ISSUE_ANALYSIS.md` - 流程問題分析（已更新）
- ✅ `ONBOARDING_CLEANUP_SUMMARY.md` - 本文件（清理總結）

### 保留的頁面（7 個）
1. ✅ `/onboarding/goal` - 目標設定
2. ✅ `/onboarding/challenge` - 遊戲測驗
3. ✅ `/onboarding/reward` - 獎勵頁
4. ✅ `/onboarding` (page.tsx) - 登入頁
5. ✅ `/onboarding/avatar` - 頭像設定
6. ✅ `/onboarding/habits` - **5題學習習慣問卷** ⭐
7. ✅ `/onboarding/complete` - 完成頁

---

## 🎯 清理完成狀態

### ✅ 已完成
- [x] 刪除舊頁面（goal-setup, intro, review, backup）
- [x] 刪除舊流程文檔（ONBOARDING_IMPLEMENTATION_PLAN.md）
- [x] 更新 ProgressIndicator 組件
- [x] 更新流程分析文檔
- [x] 確認無舊流程引用

### ✅ 確認無誤
- [x] 所有保留的頁面符合新流程
- [x] 所有保留的註釋正確
- [x] 無遺漏的舊流程引用

---

## 📝 注意事項

### Widget 引用
- `data-widget="daily-mission"` 在主應用中使用，**不是 onboarding 流程的一部分**
- 用於日常任務功能，**不需要刪除**

### 實驗框架
- `lib/experiment-framework.ts` 中的 onboarding 實驗是 A/B 測試框架
- 不影響實際流程，**保留**

---

**清理完成日期**: 2025-01-XX
**狀態**: ✅ **完成 - 所有舊流程邏輯已刪除**

🎉 **專案現在只有一個統一的 onboarding 流程！**

