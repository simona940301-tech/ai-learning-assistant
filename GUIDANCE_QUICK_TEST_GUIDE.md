# 🧪 引導系統快速測試指南

## 🚀 快速開始 (5 分鐘)

### **前置條件**

1. ✅ 確保已完成 Onboarding 流程
2. ✅ 瀏覽器開啟開發者工具 (Console)
3. ✅ 清除 localStorage (可選,用於重置引導狀態)

```javascript
// 🎯 清除所有引導狀態 (重新開始測試)
localStorage.removeItem('moonshot_guidance_state')
localStorage.removeItem('moonshot_cooldown_state')
localStorage.removeItem('moonshot_operation_count')
localStorage.removeItem('moonshot_dismissed_features')
sessionStorage.setItem('first_run_after_onboarding', 'true')

// 重新整理頁面
location.reload()
```

---

## 📋 測試場景

### **場景 1: T04 引導 (Onboarding 完成後)**

#### **1.1 Play 頁面引導**

**步驟:**
1. 完成 Onboarding
2. 跳轉到 `/play?from=onboarding`
3. 應該看到「解鎖歷屆魔王題！」引導 (系統對戰卡片周圍發光)

**預期結果:**
- ✅ 系統對戰卡片 (`[data-mode-card="system"]`) 周圍有柔和發光效果
- ✅ 上方顯示「解鎖歷屆魔王題！」文字氣泡
- ✅ 7 秒後自動消失
- ✅ Console 顯示: `[useGuidance] Showing guidance: Play_StartBattle`

**驗證方式:**
```javascript
// 檢查引導狀態
const cooldown = JSON.parse(localStorage.getItem('moonshot_cooldown_state'))
console.log('T04 引導計數:', cooldown.onboardingGuidanceCount) // 應為 1
console.log('上次顯示時間:', new Date(cooldown.lastGuidanceShownAt))
```

---

#### **1.2 Ask 頁面引導**

**步驟:**
1. 完成 Play 頁面引導後
2. 執行 5+ 個操作 (點擊不同卡片)
3. 點擊底部 Tab Bar 的「Ask」
4. 等待 1 秒

**預期結果:**
- ✅ 整個 Ask 頁面底部區域有發光效果
- ✅ 顯示「拍照或輸入題目 學霸幫你解題!」文字氣泡
- ✅ 7 秒後自動消失
- ✅ Console 顯示: `[useGuidance] Showing guidance: Ask_QuickSolve`

**驗證方式:**
```javascript
const cooldown = JSON.parse(localStorage.getItem('moonshot_cooldown_state'))
console.log('T04 引導計數:', cooldown.onboardingGuidanceCount) // 應為 2
```

---

#### **1.3 Backpack 頁面引導**

**步驟:**
1. 完成 Ask 頁面引導後
2. 執行 5+ 個操作
3. 點擊底部 Tab Bar 的「Backpack」
4. 等待 1 秒

**預期結果:**
- ✅ Backpack 頁面底部區域有發光效果
- ✅ 顯示「查看你的學測秘笈!」文字氣泡
- ✅ 7 秒後自動消失
- ✅ Console 顯示: `[useGuidance] Showing guidance: Backpack_ViewNotes`

**驗證方式:**
```javascript
const cooldown = JSON.parse(localStorage.getItem('moonshot_cooldown_state'))
console.log('T04 引導計數:', cooldown.onboardingGuidanceCount) // 應為 3
console.log('T04 階段完成:', cooldown.onboardingPhaseCompleted) // 應為 true
```

---

### **場景 2: T01 引導 (探索停滯)**

#### **2.1 Play 頁面 - 無限練習模式**

**步驟:**
1. 在 Play 頁面停留 > 10 秒,不要點擊任何按鈕
2. 等待引導出現

**預期結果:**
- ✅ 「無限練習」卡片 (`[data-mode-card="practice"]`) 上方出現 Tooltip
- ✅ 顯示「學測專家彙整精華習題!」
- ✅ 有關閉按鈕 (X)
- ✅ 7 秒後自動消失

**驗證方式:**
```javascript
const states = JSON.parse(localStorage.getItem('moonshot_guidance_state'))
console.log('Practice 引導狀態:', states.Play_PracticeMode)
```

---

#### **2.2 Play 頁面 - 專注模式**

**步驟:**
1. 完成 5+ 場對戰 (不使用專注模式)
2. 回到 Play 頁面

**預期結果:**
- ✅ 「專注修煉」卡片 (`[data-mode-card="focus"]`) 上方出現 Tooltip
- ✅ 顯示「進入學霸模式，和小雞一起專注！」
- ✅ 可以關閉

**注意:** 這個引導需要實際完成 5+ 場對戰,測試時間較長

---

#### **2.3 Ask 頁面 - 摘要模式**

**步驟:**
1. 在 Ask 頁面停留 > 10 秒,不要切換 Tab
2. 等待引導出現

**預期結果:**
- ✅ 「重點統整」Tab (`[data-tab="summary"]`) 下方出現 Tooltip
- ✅ 顯示「學測考點速讀：試試摘要模式!」
- ✅ 7 秒後自動消失

---

### **場景 3: T02 引導 (低效重複)**

#### **3.1 Backpack 頁面 - 批次整理**

**步驟:**
1. 在 Backpack 頁面手動整理單個檔案 3 次
2. 觀察引導出現

**預期結果:**
- ✅ 批次整理按鈕 (`[data-action="batch-organize"]`) 下方出現 Tooltip
- ✅ 顯示「學霸幫你統整學測秘笈！」

**注意:** 需要先實作 `useInefficientRepetition` Hook

---

### **場景 4: T03 引導 (錯誤糾正)**

#### **4.1 Play 頁面 - 精力不足**

**步驟:**
1. 消耗所有精力 (完成 8 場對戰)
2. 嘗試開始新對戰

**預期結果:**
- ✅ 每日任務卡片 (`[data-widget="daily-mission"]`) 上方出現 Tooltip
- ✅ 顯示「體力用完了? 完成任務獲取體力!」

**注意:** 需要先實作 `useErrorCorrection` Hook

---

#### **4.2 Backpack 頁面 - 檔案過大**

**步驟:**
1. 嘗試上傳 > 5MB 檔案
2. 重複 2 次

**預期結果:**
- ✅ 雲端連結按鈕 (`[data-upload-type="link"]`) 出現 Modal
- ✅ 顯示「檔案太大？試試雲端連結更方便!」
- ✅ 有「我知道了」和「立即試試」按鈕

**注意:** 需要先實作 `useErrorCorrection` Hook

---

## 🛠️ 開發者工具

### **強制觸發引導**

```javascript
// 🎯 在瀏覽器 Console 執行

// 1. 重置引導狀態
localStorage.clear()
sessionStorage.setItem('first_run_after_onboarding', 'true')

// 2. 強制顯示 T04 引導 (Play)
// 跳轉到 /play?from=onboarding

// 3. 查看引導統計
const engine = window.__guidanceEngine__ // 需要先 export
console.log(engine.getStats())
```

### **檢查引導狀態**

```javascript
// 查看所有引導狀態
const states = JSON.parse(localStorage.getItem('moonshot_guidance_state'))
console.table(states)

// 查看冷卻狀態
const cooldown = JSON.parse(localStorage.getItem('moonshot_cooldown_state'))
console.log('冷卻狀態:', cooldown)

// 查看已關閉的引導
const dismissed = JSON.parse(localStorage.getItem('moonshot_dismissed_features'))
console.log('已關閉引導:', dismissed)
```

### **手動重置**

```javascript
// 重置特定引導
localStorage.removeItem('moonshot_guidance_state')

// 重置冷卻期
localStorage.removeItem('moonshot_cooldown_state')

// 重置操作計數
localStorage.removeItem('moonshot_operation_count')
```

---

## 📊 測試檢查表

### **T04 引導 (Post-Onboarding)**

- [ ] Play 頁面引導正確顯示
- [ ] Ask 頁面引導正確顯示
- [ ] Backpack 頁面引導正確顯示
- [ ] 引導按順序顯示 (間隔 5+ 操作)
- [ ] 引導最多顯示 3 個
- [ ] 顯示後進入 30 分鐘冷卻期
- [ ] T04 階段完成後標記 `onboardingPhaseCompleted = true`

### **T01 引導 (探索停滯)**

- [ ] Play 頁面停留 10 秒後顯示練習模式引導
- [ ] Ask 頁面停留 10 秒後顯示摘要模式引導
- [ ] 引導可以永久關閉

### **T02 引導 (低效重複)**

- [ ] Backpack 手動整理 3 次後顯示批次整理引導
- [ ] 引導可以永久關閉

### **T03 引導 (錯誤糾正)**

- [ ] 精力不足時顯示任務引導
- [ ] 上傳大檔案 2 次後顯示雲端連結引導
- [ ] Modal 引導可以點擊背景關閉

---

## 🐛 常見問題

### **Q1: 引導沒有顯示?**

**檢查:**
1. 是否在冷卻期內? (查看 `lastGuidanceShownAt`)
2. 是否已被永久關閉? (查看 `moonshot_dismissed_features`)
3. 目標元素是否存在? (檢查 `data-*` 屬性)
4. Console 是否有錯誤訊息?

**解決方式:**
```javascript
// 清除所有狀態重新測試
localStorage.clear()
location.reload()
```

---

### **Q2: 引導重複顯示?**

**原因:** 可能是操作計數未正確重置

**解決方式:**
```javascript
// 檢查操作計數
const count = localStorage.getItem('moonshot_operation_count')
console.log('操作計數:', count)

// 手動重置
localStorage.setItem('moonshot_operation_count', '0')
```

---

### **Q3: 引導位置錯誤?**

**原因:** 目標元素渲染時機問題

**解決方式:**
1. 檢查 `targetElement` 選擇器是否正確
2. 確認元素已渲染 (使用 `MutationObserver`)
3. 調整 `position` 參數 (top/bottom/left/right)

---

## 🎉 測試完成檢查

完成所有測試後,確認:

- ✅ 所有引導文案正確顯示新的激勵內容
- ✅ 引導觸發時機符合預期
- ✅ 引導視覺效果正確 (Halo/Tooltip/Modal)
- ✅ 冷卻機制正常運作
- ✅ 用戶可以正常關閉引導
- ✅ Console 無錯誤訊息

---

**測試指南版本:** v1.0
**最後更新:** 2025-11-28
**適用版本:** PLMS Guidance System v2.0
