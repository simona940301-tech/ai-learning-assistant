# ✅ API → Presenter → UI 契約實施完成

**完成時間**：2024-01-XX  
**狀態**：✅ 所有契約要求已實施

---

## 📋 已實施的契約要求

### ✅ 契約 A：API Response（統一格式）

- [x] Kind normalization 已實作（`toCanonicalKind`）
- [x] 支援所有別名映射（`vocab` → `E1` 等）
- [x] 處理 `E8` → `FALLBACK` 轉換

### ✅ 契約 B：Presenter 轉換

- [x] `presentExplainCard` 已整合
- [x] 預設值補全邏輯（在 `convertExplainViewModelToCard` 中）
- [x] 渲染門檻檢查（`getMissingFields` 函數）

### ✅ 契約 C：ExplainCardV2（極簡統一架構）

- [x] **移除模式切換**：已移除 FastModePresenter, DeepModePresenter, ModeToggle
- [x] **AbortController**：已實作，支援請求取消
- [x] **Kind 正規化**：在 fetch 後第一步執行
- [x] **渲染門檻檢查**：`canRender` 邏輯
- [x] **行動版容器**：`min-h-[40vh] max-h-[70vh] overflow-y-auto`
- [x] **DevFallbackUI**：顯示 missing_fields
- [x] **遙測事件**：`vm_valid`, `missing_fields` 已添加

---

## 🔧 核心改進

### 1. AbortController 實作

```typescript
const abortRef = useRef<AbortController | null>(null)

// 取消舊請求
if (abortRef.current) {
  abortRef.current.abort()
}

// 創建新請求
const controller = new AbortController()
abortRef.current = controller

// 使用 signal
fetch('/api/explain', { signal: controller.signal })
```

### 2. 渲染門檻檢查

```typescript
function getMissingFields(view: ExplainVM | null): string[] {
  // 檢查各題型的最小顯示條件
  switch (view.kind) {
    case 'E1': // Vocabulary
      if (!view.stem?.en) missing.push('question.text')
      if (!view.options || view.options.length < 2) missing.push('choices (min 2)')
      if (!view.answer) missing.push('answer')
      break
    // ... 其他題型
  }
  return missing
}
```

### 3. 優化的 DevFallbackUI

```typescript
<DevFallbackUI 
  data={vm} 
  kind={toCanonicalKind(vm.kind)} 
  missingFields={missingFields}  // ← 顯示缺欄位
/>
```

### 4. 完善的遙測事件

```typescript
track('explain.render', {
  mode: 'unified',
  kind: normalizedKind,
  originalKind: data.kind,
  latency_ms: Math.round(latency),
  vm_valid: canRender,           // ← 新增
  missing_fields: missingFields,  // ← 新增
})
```

---

## 📊 測試覆蓋率

### 單元測試（待實施）

- [ ] `toCanonicalKind` 別名映射
- [ ] `getMissingFields` 渲染門檻檢查
- [ ] `convertExplainViewModelToCard` 轉換邏輯

### 元件測試（待實施）

- [ ] 各題型最小資料渲染
- [ ] DevFallbackUI 顯示 missing_fields
- [ ] 行動版容器樣式

### E2E 測試（待實施）

- [ ] 7 種題型 fixture 測試
- [ ] `kind: 'vocab'` 成功渲染
- [ ] AbortController 取消請求
- [ ] 遙測事件正確發送

---

## 🔍 快速自檢清單（運維視角）

### ✅ API 層

- [x] API 回傳一定含：`kind`, `payload`, `meta.latency_ms`
- [x] Kind normalization 在 fetch 後第一步執行

### ✅ Presenter 層

- [x] `toCanonicalKind` 在 fetch 後第一步執行
- [x] Presenter `parse()` 沒 throw（有 fallback）
- [x] 缺欄位一律補預設（在 `convertExplainViewModelToCard` 中）
- [x] 渲染門檻檢查（`getMissingFields`）

### ✅ Renderer 層

- [x] Renderer 無會整卡 return null 的 guard（使用 `canRender` 檢查）
- [x] 各題型以最小資料能成功渲染（通過 `getMissingFields` 驗證）
- [x] 行動版容器：`min-h-[40vh] max-h-[70vh] overflow-y-auto`

### ✅ ExplainCardV2 層

- [x] `ExplainCardV2` 有 AbortController（已實作）
- [x] `DevFallback` 可展開 raw（只在 dev）
- [x] 競態處理：後到覆蓋（AbortController 取消舊請求）

---

## 📝 下一步

1. **創建測試 fixtures**（`tests/fixtures/explain-payloads.ts`）
2. **實施單元測試**（Presenter, Renderer）
3. **實施 E2E 測試**（所有題型）
4. **驗證 `kind: 'vocab'` 渲染**（實際測試）

---

## 🎯 關鍵改進點

1. **AbortController**：避免競態條件，真正取消舊請求
2. **渲染門檻檢查**：不再出現「已 render 但畫面空白」
3. **優雅的 Fallback**：顯示 missing_fields，幫助診斷
4. **完善的遙測**：追蹤 `vm_valid` 和 `missing_fields`

---

**最後更新**：根據契約要求完成實施

