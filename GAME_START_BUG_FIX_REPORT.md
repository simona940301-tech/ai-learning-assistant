# 遊戲啟動 Bug 修復報告

## 問題總結

用戶報告：點擊「AI 對戰」和「專注模式」按鈕後無法開始遊戲。

## 根本原因分析

### 問題 1: AI 對戰無法啟動
**位置**: [apps/web/app/(app)/play/page.tsx](apps/web/app/(app)/play/page.tsx)

**原因**: `SystemBattleModal` 組件雖然被導入，但從未在頁面中渲染。

- 第 17-20 行：導入了 `SystemBattleModal`
- 第 751 行：按鈕的 `onClick` 調用 `openSystemModal()`，設置 `activeModal = 'SYSTEM'`
- **但是**：整個頁面中沒有任何代碼監聽 `activeModal === 'SYSTEM'` 並渲染 `SystemBattleModal`

### 問題 2: 專注模式按鈕無反應
**位置**: [apps/web/app/(app)/play/page.tsx](apps/web/app/(app)/play/page.tsx)

**原因**: 使用了錯誤的組件名稱。

- 第 44 行：定義了空組件 `const FocusModal = () => null`
- 第 58-61 行：動態導入了實際組件 `FocusModeModal`
- 第 890 行：渲染使用了空組件 `<FocusModal .../>`，應該使用 `<FocusModeModal .../>`

### 問題 3: 專注模式自動彈出
**位置**: [apps/web/components/play/FocusModeModal.tsx](apps/web/components/play/FocusModeModal.tsx)

**原因**: `FocusModeModal` 組件沒有處理 `isOpen` prop，總是渲染。

- 組件的 props interface 只定義了 `onClose`，缺少 `isOpen`
- 組件直接返回 `<div className="fixed inset-0 ...">`，沒有檢查 `isOpen` 狀態

## 修復方案

### 修復 1: 添加 SystemBattleModal 渲染邏輯
```typescript
// apps/web/app/(app)/play/page.tsx (第 888-890 行)

{/* Battle Modals - Controlled by activeModal state */}
{activeModal === 'SYSTEM' && (
  <SystemBattleModal onClose={closeModal} />
)}
```

### 修復 2: 使用正確的組件名稱
```typescript
// apps/web/app/(app)/play/page.tsx

// 1. 移除空組件定義（第 44 行）
- const FocusModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => null

// 2. 使用正確的組件名稱（第 894 行）
- <FocusModal isOpen={isFocusModalOpen} onClose={() => setFocusModalOpen(false)} />
+ <FocusModeModal isOpen={isFocusModalOpen} onClose={() => setFocusModalOpen(false)} />
```

### 修復 3: 添加 isOpen 檢查
```typescript
// apps/web/components/play/FocusModeModal.tsx

// 1. 更新 props interface
interface FocusModeModalProps {
+   isOpen: boolean
    onClose: () => void
}

// 2. 接收 isOpen prop
-export function FocusModeModal({ onClose }: FocusModeModalProps) {
+export function FocusModeModal({ isOpen, onClose }: FocusModeModalProps) {

// 3. 添加條件渲染
+   if (!isOpen) return null
+
    return (
        <div className="fixed inset-0 ...">
```

## 其他檢查的組件

檢查了以下組件，確認它們正確處理了 `isOpen` prop：

✅ `PracticeSourceModal` - 使用 `<Dialog open={isOpen}>`
✅ `EditorGameModal` - 使用 `<Dialog open={isOpen}>`
✅ `PVEResultModal` - 使用 `<Dialog open={isOpen}>`

## 潛在的類似問題

在專案中發現以下空組件，它們目前由 feature flags 控制，暫時不會顯示：

```typescript
// apps/web/app/(app)/play/page.tsx
const ChestModal = () => null        // 寶箱 modal
const EditorModal = () => null       // 編輯器 modal
const PracticeSetupModal = () => null // 練習設置 modal
```

**建議**: 當這些功能啟用時，需要：
1. 實現這些組件，或
2. 使用動態導入的實際組件替換空組件

## 測試建議

1. **AI 對戰測試**:
   - 點擊「AI 對戰」按鈕
   - 應該看到 SystemBattleModal 彈出
   - 選擇學科和時間後，應該能成功開始對戰

2. **專注模式測試**:
   - 進入 /play 頁面，專注模式不應該自動彈出
   - 點擊「專注模式」按鈕
   - 應該看到 FocusModeModal 彈出
   - 設置時間後，應該能開始專注計時

3. **回歸測試**:
   - 確認其他 modal（如練習模式、PVE 結果等）仍然正常工作
   - 確認 modal 的關閉功能正常

## 修改的檔案

1. [apps/web/app/(app)/play/page.tsx](apps/web/app/(app)/play/page.tsx)
   - 移除空的 `FocusModal` 組件
   - 添加 `SystemBattleModal` 渲染邏輯
   - 將 `FocusModal` 改為 `FocusModeModal`

2. [apps/web/components/play/FocusModeModal.tsx](apps/web/components/play/FocusModeModal.tsx)
   - 添加 `isOpen` prop
   - 添加條件渲染邏輯

## 結論

所有發現的問題已修復。主要問題是組件導入但未渲染，以及組件名稱錯誤。建議進行完整的功能測試確保所有遊戲模式都能正常啟動。
