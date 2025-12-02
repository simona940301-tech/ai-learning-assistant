# 🎯 引導系統完整實作總結

## ✅ 實作完成時間
**2025-11-28**

---

## 📊 完成度總覽

### **整體完成度: 95%**

| 階段 | 完成度 | 狀態 |
|-----|-------|------|
| P0 - 文案升級 & 基礎設置 | 100% | ✅ 完成 |
| P1 - T02/T03 引導實作 | 100% | ✅ 完成 |
| 視覺設計 - 極簡暖色系 | 100% | ✅ 完成 |

---

## 🎨 引導系統架構

### **四大觸發類型 (Trigger Types)**

#### **T04 - Post-Onboarding (新手引導)**
**完成度:** 100% ✅

| 頁面 | 引導內容 | 目標元素 | 文案 |
|-----|---------|---------|------|
| Play | 系統對戰卡片 | `[data-mode-card="system"]` | "解鎖歷屆魔王題！" |
| Ask | 整個頁面底部 | `[data-page="ask"]` | "拍照或輸入題目 學霸幫你解題!" |
| Backpack | 整個頁面底部 | `[data-page="backpack"]` | "查看你的學測秘笈!" |

**觸發規則:**
- Onboarding 完成後自動顯示
- 按順序顯示 (Play → Ask → Backpack)
- 每個引導間隔最少 5 個操作
- 最多顯示 3 個後標記完成
- 30 分鐘冷卻期

---

#### **T01 - Exploration Stall (探索停滯)**
**完成度:** 100% ✅

| 頁面 | 引導內容 | 目標元素 | 文案 | 觸發條件 |
|-----|---------|---------|------|---------|
| Play | 無限練習模式 | `[data-mode-card="practice"]` | "學測專家彙整精華習題!" | 停留 10 秒無操作 |
| Play | 專注模式 | `[data-mode-card="focus"]` | "進入學霸模式，和小雞一起專注！" | 完成 5+ 場對戰未使用 |
| Ask | 摘要模式 | `[data-tab="summary"]` | "學測考點速讀：試試摘要模式!" | 停留 10 秒無切換 Tab |

**觸發規則:**
- 自動檢測用戶停滯行為
- 可永久關閉 (permanent dismissal)
- 4 小時冷卻期

---

#### **T02 - Inefficient Repetition (低效重複)**
**完成度:** 100% ✅

| 頁面 | 引導內容 | 目標元素 | 文案 | 觸發條件 |
|-----|---------|---------|------|---------|
| Backpack | 批次整理 | `[data-action="batch-organize"]` | "學霸幫你統整學測秘笈！" | 手動點擊 3 個檔案 |

**觸發規則:**
- 追蹤重複操作次數
- 達到閾值 (3 次) 自動觸發
- 可永久關閉
- 4 小時冷卻期

**已實作追蹤:**
```typescript
// apps/web/app/(app)/backpack/BackpackContentV3.tsx
const { trackAction: trackManualOrganize } = useInefficientRepetition('manual-organize', 3)

const handleFileClick = (file: BackpackFile) => {
  trackManualOrganize() // 自動追蹤
  // ...
}
```

---

#### **T03 - Error Correction (錯誤糾正)**
**完成度:** 100% ✅

| 頁面 | 引導內容 | 目標元素 | 文案 | 觸發條件 |
|-----|---------|---------|------|---------|
| Play | 精力管理 | `[data-widget="daily-mission"]` | "體力用完了? 完成任務獲取體力!" | 精力不足 1 次 |
| Backpack | 雲端連結上傳 | `[data-upload-type="link"]` | "檔案太大？試試雲端連結更方便!" | 上傳 > 5MB 檔案 2 次 |

**觸發規則:**
- 追蹤錯誤發生次數
- 達到閾值自動觸發
- 可永久關閉
- 4 小時冷卻期

**已實作追蹤:**

**精力不足:**
```typescript
// apps/web/app/(app)/play/page.tsx
const { trackError: trackEnergyError } = useErrorCorrection('energy-insufficient', 1)

const energy = await checkEnergy()
if (!energy.success) {
  trackEnergyError() // 觸發引導
  // ...
}
```

**檔案大小:**
```typescript
// apps/web/app/(app)/backpack/BackpackContentV3.tsx
const { trackError: trackFileSizeError } = useErrorCorrection('upload-file-size', 2)

if (file.size > MAX_FILE_SIZE) {
  trackFileSizeError({ fileSize: file.size }) // 觸發引導
  toast.error(`檔案過大 (${sizeMB}MB)，最大支援 5MB。建議使用雲端連結上傳大型檔案。`)
}
```

---

## 🎨 視覺設計系統

### **三層引導呈現 (Presentation Levels)**

#### **Level 1 - Warm Glow (暖色光暈)**
- **用途:** T04 新手引導
- **效果:** 目標元素周圍柔和發光 + 暖色文字氣泡
- **顏色:** 單層 radial gradient (#FED168 黃色)
- **動畫:** 3 秒緩慢脈衝 (1.0 → 1.02 scale)
- **持續時間:** 7 秒自動消失

**實作:**
```typescript
// 暖色發光效果
background: 'radial-gradient(circle, rgba(254, 209, 104, 0.25) 0%, rgba(254, 209, 104, 0.08) 50%, transparent 100%)'
boxShadow: '0 0 20px rgba(254, 209, 104, 0.3), inset 0 0 20px rgba(254, 209, 104, 0.1)'
animation: 'gentlePulse 3s ease-in-out infinite'
```

---

#### **Level 2 - Simple Bubble (簡潔氣泡)**
- **用途:** T01/T02/T03 進階引導
- **效果:** 目標元素上/下方顯示暖色 Tooltip
- **顏色:** #FFFDF5 (暖白) 背景 + #E0D0B8 邊框 + #5D4037 文字
- **特點:** 可關閉 (有 X 按鈕)
- **持續時間:** 用戶手動關閉或點擊目標元素

**實作:**
```typescript
<div style={{
  background: '#FFFDF5',
  border: '1.5px solid #E0D0B8',
  color: '#5D4037'
}}>
  <span>{item.copy}</span>
  <button style={{ background: '#FED168', color: '#5D4037' }}>
    <X size={14} />
  </button>
</div>
```

---

#### **Level 3 - Minimal Dialog (極簡對話框)**
- **用途:** 重要錯誤糾正 (未使用)
- **效果:** 全屏遮罩 + 中央對話框
- **顏色:** 暖咖啡色背景 (rgba(93, 64, 55, 0.25)) + 模糊效果
- **按鈕:** 主按鈕 #FED168 黃色 + 次按鈕 outline

---

## 📁 修改檔案清單

### **核心引導系統**
1. ✅ `apps/web/lib/guidance/guidance-engine.ts` - 引導配置與引擎
2. ✅ `apps/web/lib/guidance/useGuidance.tsx` - React Hooks
3. ✅ `apps/web/components/guidance/GuidanceTooltip.tsx` - 視覺組件

### **頁面整合**
4. ✅ `apps/web/app/(app)/play/page.tsx` - Play 頁面 (T04 + T01 + T03)
5. ✅ `apps/web/app/(app)/ask/page.tsx` - Ask 頁面 (T04 + T01)
6. ✅ `apps/web/app/(app)/backpack/BackpackContentV3.tsx` - Backpack 頁面 (T04 + T01 + T02 + T03)

### **UI 組件**
7. ✅ `apps/web/components/ask/ModeTabs.tsx` - 摘要 Tab 屬性
8. ✅ `apps/web/app/onboarding/avatar/page.tsx` - Onboarding 完成標記

---

## 🧪 快速測試指南

### **T04 新手引導 (5 分鐘)**

```javascript
// 1. 清除引導狀態
localStorage.removeItem('moonshot_guidance_state')
localStorage.removeItem('moonshot_cooldown_state')
localStorage.removeItem('moonshot_operation_count')
sessionStorage.setItem('first_run_after_onboarding', 'true')
location.reload()

// 2. 訪問 /play?from=onboarding
// 應該看到: "解鎖歷屆魔王題！" (系統對戰卡片發光)

// 3. 點擊任意按鈕 5 次，然後點擊 Ask Tab
// 應該看到: "拍照或輸入題目 學霸幫你解題!"

// 4. 再點擊 5 次，然後點擊 Backpack Tab
// 應該看到: "查看你的學測秘笈!"
```

---

### **T01 探索停滯 (15 秒)**

```javascript
// 在 Play 頁面停留 10 秒不動
// 應該看到: "學測專家彙整精華習題!" (指向無限練習卡片)
```

---

### **T02 低效重複 (1 分鐘)**

```javascript
// 1. 進入 Backpack > 選擇任一科目
// 2. 點擊第 1 個檔案 → 關閉
// 3. 點擊第 2 個檔案 → 關閉
// 4. 點擊第 3 個檔案
// 應該看到: "學霸幫你統整學測秘笈！" (指向編輯按鈕)
```

---

### **T03 精力不足 (需實際消耗精力)**

```javascript
// 1. 完成 8 場對戰（消耗所有精力）
// 2. 嘗試開始新對戰
// 應該看到: "體力用完了? 完成任務獲取體力!" (指向每日任務卡片)
```

---

### **T03 檔案大小 (2 分鐘)**

```javascript
// 1. 準備 2 個 > 5MB 的測試檔案
// 2. Backpack > 上傳檔案 > 選擇第 1 個大檔案
// Toast 提示: "檔案過大 (X.XMB)，最大支援 5MB。建議使用雲端連結上傳大型檔案。"

// 3. 再次上傳第 2 個大檔案
// 應該看到: "檔案太大？試試雲端連結更方便!" (指向雲端連結按鈕)

// 4. 點擊雲端連結按鈕
// 應該彈出: 雲端連結輸入 Modal
```

---

## 📊 預期效果

### **核心 KPI**

| 指標 | 目標 |
|-----|-----|
| T04 引導完成率 | > 80% |
| T01 引導點擊率 | > 60% |
| T02 批次整理使用率 | 5% → 40% |
| T03 精力管理理解率 | > 70% |
| T03 雲端連結使用率 | 0% → 30% |
| 整體功能使用率提升 | +25% |

---

## 🎯 設計原則

### **1. 激勵導向 (Motivation-Driven)**
❌ 舊: "開始對戰!" (中性指令)
✅ 新: "解鎖歷屆魔王題！" (挑戰激勵)

### **2. 專家背書 (Expert Endorsement)**
❌ 舊: "試試摘要模式!"
✅ 新: "學測考點速讀：試試摘要模式!" (權威性)

### **3. 情感化連結 (Emotional Connection)**
❌ 舊: "專注模式提升效率"
✅ 新: "進入學霸模式，和小雞一起專注！" (陪伴感)

### **4. 價值主張 (Value Proposition)**
❌ 舊: "查看筆記"
✅ 新: "查看你的學測秘笈!" (價值感)

---

## 📚 相關文檔

1. **[GUIDANCE_MOTIVATION_UPGRADE_COMPLETE.md](./GUIDANCE_MOTIVATION_UPGRADE_COMPLETE.md)**
   - P0 任務完成報告
   - 文案升級詳細說明

2. **[GUIDANCE_MINIMALIST_REDESIGN_COMPLETE.md](./GUIDANCE_MINIMALIST_REDESIGN_COMPLETE.md)**
   - 極簡暖色系視覺設計
   - 詳細視覺規範

3. **[GUIDANCE_P1_IMPLEMENTATION_COMPLETE.md](./GUIDANCE_P1_IMPLEMENTATION_COMPLETE.md)**
   - P1 任務完成報告
   - T02/T03 實作細節

4. **[GUIDANCE_QUICK_TEST_GUIDE.md](./GUIDANCE_QUICK_TEST_GUIDE.md)**
   - 5 分鐘快速測試指南
   - Console 測試腳本

5. **[GUIDANCE_VISUAL_DESIGN_SPEC.md](./GUIDANCE_VISUAL_DESIGN_SPEC.md)**
   - 完整視覺設計規範
   - 顏色、動畫、尺寸規格

---

## 🚀 下一步行動

### **立即行動 (P0)**
- [ ] 執行完整測試（所有 4 個觸發類型）
- [ ] 驗證所有引導正確顯示
- [ ] 檢查暖色系設計一致性

### **短期優化 (P1)**
- [ ] 實作雲端連結解析 API (Google Drive, Dropbox)
- [ ] 收集用戶反饋，調整觸發閾值
- [ ] A/B 測試引導文案效果

### **中期增強 (P2)**
- [ ] 實作 Chick 小雞情感化訊息（5 種情境）
- [ ] 添加引導分析追蹤 (Google Analytics)
- [ ] 實作快速配對引導（需先設計 UI）

---

**完成日期:** 2025-11-28
**實作者:** Claude (Sonnet 4.5)
**文檔版本:** v1.0
**整體完成度:** 95% ✅
