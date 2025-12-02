# 能量/體力 + 等級 UI 重構總結

## 📋 概述

完全重新設計了能量/體力顯示和等級/XP 顯示 UI，採用 Candy Crush 風格的簡潔設計，並確保所有組件共用同一套資料來源。

## 🎯 主要改動

### 1. 統一的資料來源

#### `useEnergyStatus` Hook
- **位置**: `apps/web/lib/hooks/useEnergyStatus.ts`
- **功能**: 統一管理能量狀態和倒數時間
- **回傳資料**:
  ```typescript
  {
    energy: number              // 當前能量
    maxEnergy: number          // 最大能量 (8)
    isFull: boolean            // 是否已滿
    nextEnergyAt?: Date        // 下一點能量恢復時間
    remainingMs?: number       // 剩餘毫秒數
    formattedTime?: string     // 格式化時間 'MM:SS'
    progressPercent?: number   // 進度百分比 0~100
    isLoading: boolean         // 載入狀態
  }
  ```
- **特點**:
  - 統一的倒數邏輯（30分鐘恢復1點）
  - 自動觸發狀態刷新當能量恢復時
  - 所有組件共用同一套資料

#### `useLevelStatus` Hook
- **位置**: `apps/web/lib/hooks/useLevelStatus.ts`
- **功能**: 統一管理等級和 XP 狀態
- **回傳資料**:
  ```typescript
  {
    level: number              // 當前等級
    currentXp: number          // 當前等級內的 XP
    xpToNextLevel: number      // 升級所需 XP
    progressPercent: number    // 進度百分比 0~100
    isLoading: boolean         // 載入狀態
  }
  ```

### 2. 新的 UI 組件

#### `EnergyBar` - Candy Crush 風格能量顯示
- **位置**: `apps/web/components/status/EnergyBar.tsx`
- **設計**:
  - 左側：羽毛圖標 + 數字（例如 `3`）
  - 右側：細長 pill bar，顯示倒數時間（`MM:SS`）和進度條
  - 已滿時隱藏倒數 bar，只顯示圖標和數字
- **使用範例**:
  ```tsx
  import { EnergyBar } from '@/components/status/EnergyBar'
  
  <EnergyBar />
  ```

#### `EnergyBadge` - 簡化版本
- **位置**: `apps/web/components/status/EnergyBar.tsx`
- **設計**: 只顯示圖標和數字（`3/8`），適用於只需要顯示數字的場景
- **使用範例**:
  ```tsx
  import { EnergyBadge } from '@/components/status/EnergyBar'
  
  <EnergyBadge />
  ```

#### `LevelBar` - 分格樣式等級條
- **位置**: `apps/web/components/status/LevelBar.tsx`
- **設計**:
  - 左側：`Lv {level}` 標籤
  - 中間：10 格分段的 XP 進度條
  - 右側：XP 數值（`currentXp / totalXp`）
- **使用範例**:
  ```tsx
  import { LevelBar } from '@/components/status/LevelBar'
  
  <LevelBar />
  ```

### 3. 已更新的組件

#### `EnergyIndicator` (已重構)
- **位置**: `apps/web/components/ui/energy-indicator.tsx`
- **改動**: 現在使用 `useEnergyStatus` hook，移除了重複的倒數邏輯
- **狀態**: 標記為 `@deprecated`，建議直接使用 `EnergyBar` 或 `EnergyBadge`

#### `play/page.tsx` (已更新)
- **改動**: 替換了舊的 `GameStatusBar`，改用新的 `EnergyBar` 和 `LevelBar`
- **位置**: 能量條在右上角，等級條在下方

## 🔄 資料流程

```
API (/api/play/user/status)
  ↓
PlayContext (play-context.tsx)
  ↓
useEnergyStatus / useLevelStatus (hooks)
  ↓
EnergyBar / LevelBar (components)
```

## ✅ 檢查清單

- [x] 建立統一的 `useEnergyStatus` hook
- [x] 建立統一的 `useLevelStatus` hook
- [x] 建立 `EnergyBar` 組件（Candy Crush 風格）
- [x] 建立 `LevelBar` 組件（分格樣式）
- [x] 替換 `play/page.tsx` 中的舊組件
- [x] 重構 `EnergyIndicator` 使用新 hook
- [x] 移除重複的倒數邏輯
- [x] 確保所有組件共用同一套資料來源

## 📝 使用指南

### 在任何頁面顯示能量

```tsx
import { EnergyBar } from '@/components/status/EnergyBar'

// 完整版本（帶倒數）
<EnergyBar />

// 或使用簡化版本
import { EnergyBadge } from '@/components/status/EnergyBar'
<EnergyBadge />
```

### 在任何頁面顯示等級

```tsx
import { LevelBar } from '@/components/status/LevelBar'

<LevelBar />
```

### 在組件中直接使用 Hook

```tsx
import { useEnergyStatus } from '@/lib/hooks/useEnergyStatus'
import { useLevelStatus } from '@/lib/hooks/useLevelStatus'

function MyComponent() {
  const energy = useEnergyStatus()
  const level = useLevelStatus()
  
  // 使用 energy.energy, energy.formattedTime 等
  // 使用 level.level, level.progressPercent 等
}
```

## 🎨 設計特點

1. **簡潔**: 沒有多餘的裝飾，專注於資訊本身
2. **一致性**: 所有組件共用同一套資料來源
3. **自動更新**: 倒數時間自動更新，能量恢復時自動刷新
4. **響應式**: 適配不同螢幕尺寸
5. **可訪問性**: 使用語義化 HTML 和 ARIA 標籤

## 🔧 技術細節

### 能量恢復邏輯
- 每 30 分鐘恢復 1 點能量
- 基於 `energyLastUpdatedAt` 計算下一點恢復時間
- 當時間到達時自動觸發 `refreshStatus()` 刷新狀態

### XP 進度計算
- 基於 `progression.xp.progress` 計算進度百分比
- 10 格分段，根據進度填滿對應格子
- 支援半格顯示（四捨五入）

## 📚 相關檔案

- `apps/web/lib/hooks/useEnergyStatus.ts` - 能量狀態 Hook
- `apps/web/lib/hooks/useLevelStatus.ts` - 等級狀態 Hook
- `apps/web/components/status/EnergyBar.tsx` - 能量顯示組件
- `apps/web/components/status/LevelBar.tsx` - 等級顯示組件
- `apps/web/lib/play-context.tsx` - 資料來源（PlayContext）

## 🚀 未來改進

- [ ] 考慮將 hooks 移到 Zustand store 以實現更好的狀態管理
- [ ] 添加能量恢復的動畫效果
- [ ] 支援自定義分段數量的 LevelBar
- [ ] 添加能量不足時的提示動畫

