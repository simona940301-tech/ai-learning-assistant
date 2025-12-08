# LevelBar UI 元素功能分析

## 📊 UI 元素說明

根據圖片和代碼實作，LevelBar 組件包含三個主要 UI 元素：

### 1. 左側：等級標籤 `Lv {level}`

**功能**：
- 顯示玩家當前等級
- 從 `useLevelStatus()` hook 取得 `level` 數值
- 資料來源：`progression.xp.level`（由 `levelForXp()` 函數計算）

**顯示格式**：
- `Lv 1`、`Lv 2`、`Lv 3` 等
- 使用 `tabular-nums` 確保數字對齊

**資料流程**：
```
API (/api/play/progression/status)
  ↓
PlayContext (progression.xp.level)
  ↓
useLevelStatus() hook
  ↓
LevelBar 組件顯示
```

---

### 2. 中間：10 格進度指示器（圓圈）

**功能**：
- 視覺化顯示當前等級的 XP 進度
- 10 個圓圈代表當前等級的進度分段
- 根據 `progressPercent` 填滿對應數量的圓圈

**計算邏輯**：
```typescript
const filledSegments = Math.round((progressPercent / 100) * XP_BAR_SEGMENTS)
// XP_BAR_SEGMENTS = 10
```

**狀態顯示**：
- **已填滿**：有顏色填充的圓圈（表示已完成該段進度）
- **未填滿**：空圓圈（表示尚未達到該段進度）

**進度計算**：
- `progressPercent = (currentXp / xpToNextLevel) * 100`
- 例如：如果 `currentXp = 25`，`xpToNextLevel = 50`，則 `progressPercent = 50%`
- 50% 進度會填滿 5 個圓圈（10 * 0.5 = 5）

---

### 3. 右側：XP 數值 `currentXp / totalXp`

**功能**：
- 顯示當前等級內的 XP 數值
- 格式：`當前 XP / 升級所需總 XP`

**顯示格式**：
- `0/50`：當前 0 XP，需要 50 XP 升級
- `25/50`：當前 25 XP，還需要 25 XP 升級
- `50/50`：已滿，準備升級

**計算邏輯**：
```typescript
currentXp = Math.floor(progress * nextLevelXp)  // 當前等級內的 XP
xpToNextLevel = nextLevelXp - currentXp         // 還需要的 XP
顯示：currentXp / (currentXp + xpToNextLevel)  // 即 currentXp / nextLevelXp
```

**資料來源**：
- `currentXp`：當前等級內已獲得的 XP
- `xpToNextLevel`：升級到下一級還需要的 XP
- 兩者相加 = `nextLevelXp`（升級所需總 XP）

---

## 🔄 完整資料流程

```
1. 用戶完成對戰/任務
   ↓
2. 後端計算並更新 XP
   ↓
3. API 返回 progression 資料
   {
     xp: {
       total: 25,           // 總 XP
       level: 1,            // 當前等級
       progress: 0.5,       // 進度百分比 (0-1)
       nextLevelXp: 50     // 升級所需總 XP
     }
   }
   ↓
4. PlayContext 更新 progression 狀態
   ↓
5. useLevelStatus() hook 計算：
   - level = 1
   - currentXp = Math.floor(0.5 * 50) = 25
   - xpToNextLevel = 50 - 25 = 25
   - progressPercent = 0.5 * 100 = 50%
   ↓
6. LevelBar 組件渲染：
   - 左側：Lv 1
   - 中間：5 個填滿的圓圈 + 5 個空圓圈
   - 右側：25/50
```

---

## 🎨 視覺設計

### 當前實作（矩形格子）
- 使用 `rounded-sm` 的矩形格子
- 已填滿：`bg-primary shadow-sm`
- 未填滿：`bg-muted/30 border border-border/30`

### 圖片要求（圓圈）
- 應改為圓形（`rounded-full`）
- 淺色背景 + 細邊框
- 已填滿的圓圈應有明顯的顏色填充

---

## 📝 使用場景

1. **Play 頁面**：顯示玩家等級和進度
2. **Profile 頁面**：顯示玩家統計資訊
3. **對戰結果頁面**：顯示 XP 獲得後的進度更新
4. **任務完成頁面**：顯示任務獎勵的 XP 進度

---

## 🔧 技術細節

### Hook 依賴
- `useLevelStatus()` 依賴 `usePlay()` 的 `progression` 狀態
- 當 `progression` 更新時，`useLevelStatus()` 會自動重新計算
- 所有使用 `LevelBar` 的組件都會自動同步更新

### 響應式設計
- 使用 `flex-1` 讓進度條自動適應寬度
- `min-w-[60px]` 確保文字不會被壓縮
- `tabular-nums` 確保數字對齊

### 動畫效果
- 填滿動畫：`transition-all duration-300`
- 延遲效果：`transitionDelay: ${index * 20}ms`（漸進式填滿）
























