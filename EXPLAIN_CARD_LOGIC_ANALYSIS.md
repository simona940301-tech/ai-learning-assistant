# ExplainCard 生成邏輯完整分析

## 📋 問題背景

你已經把所有解題、題型劃分都篩掉了，但為什麼還會有 E1-E7 的設定？

---

## 🔍 完整流程分析

### 1. API 層 (`/api/explain/route.ts`)

**狀態：✅ 已移除題型分類**

```typescript
// 使用 universal-explainer，完全不依賴題型分類
const universal = await universalExplainer(text)

// 返回格式：
{
  kind: 'vocab' | 'grammar' | ... | undefined,  // 可能是任何值或 undefined
  markdown: string,                              // 主要格式
  structured?: {...},                            // 可選結構化格式
  questions?: [...],                            // 多題格式
  sharedPassage?: {...}                         // 共用題幹格式
}
```

**重點：**
- ✅ 不進行題型分類（E1-E7）
- ✅ 直接生成 markdown 詳解
- ✅ `kind` 欄位可能是 'vocab'、'grammar' 或 undefined

---

### 2. 前端 ExplainCardV2 (`components/solve/ExplainCardV2.tsx`)

**狀態：⚠️ 仍依賴 E1-E7 映射**

#### 步驟 1: 接收 API 回應
```typescript
// API 返回 ExplainViewModel
const vm: ExplainViewModel = {
  kind: 'vocab',  // 可能是 'vocab'、'grammar' 或 undefined
  answer: 'A',
  briefReason: '...',
  // ...
}
```

#### 步驟 2: 轉換為 ExplainCard（需要 E1-E7）
```typescript
// 在 convertExplainViewModelToCard() 中：
const legacyKind = toLegacyCanonicalKind(vm.kind)  // 'vocab' → 'E1'

// 必須映射到 E1-E7 或 FALLBACK
let cardKind: 'E1' | 'E2' | ... | 'FALLBACK' = 'FALLBACK'
if (['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'].includes(legacyKind)) {
  cardKind = legacyKind
}

const card: ExplainCard = {
  kind: cardKind,  // 必須是 E1-E7 或 FALLBACK
  // ...
}
```

#### 步驟 3: 轉換為 ExplainVM（根據 E1-E7 準備資料）
```typescript
// 在 presentExplainCard() 中：
switch (card.kind) {
  case 'E1':
    return prepareVocabularyVM(card, base, baseView)
  case 'E2':
    return prepareGrammarVM(card, base, baseView)
  // ... E3-E7
  default:
    return prepareGenericVM(base, baseView, card)
}
```

#### 步驟 4: 根據 E1-E7 選擇渲染組件
```typescript
// 在 renderByKind() 中：
switch (view.kind) {
  case 'E1':
    return <VocabularyExplain view={view} />
  case 'E2':
    return <GrammarExplain view={view} />
  // ... E3-E7
  case 'GENERIC':
  default:
    return <GenericExplain view={view} />
}
```

---

## 🎯 問題根源

### 為什麼還需要 E1-E7？

1. **前端渲染組件依賴 E1-E7**
   - `VocabularyExplain`、`GrammarExplain`、`ClozeExplain` 等組件是針對特定題型設計的
   - 需要根據 `kind` 來選擇使用哪個組件

2. **資料轉換層需要 E1-E7**
   - `presentExplainCard()` 根據 `card.kind` (E1-E7) 來準備不同的 ViewModel
   - 例如：E1 需要 `VocabularyVM`，E4 需要 `ReadingVM`

3. **向後兼容性**
   - `kind-alias.ts` 提供 `toLegacyCanonicalKind()` 將 'vocab' → 'E1'
   - 這是為了兼容舊的 API 格式

---

## 📊 當前架構圖

```
API 層 (/api/explain)
  ↓
  universal-explainer (不分類，直接生成 markdown)
  ↓
  返回: { kind: 'vocab' | undefined, markdown: '...' }
  ↓
前端 ExplainCardV2
  ↓
  步驟 1: 接收 ExplainViewModel { kind: 'vocab' }
  ↓
  步驟 2: toLegacyCanonicalKind('vocab') → 'E1'
  ↓
  步驟 3: convertExplainViewModelToCard() → ExplainCard { kind: 'E1' }
  ↓
  步驟 4: presentExplainCard() → 根據 'E1' 準備 VocabularyVM
  ↓
  步驟 5: renderByKind() → 根據 'E1' 渲染 <VocabularyExplain />
```

---

## 🔧 解決方案選項

### 方案 1: 完全移除 E1-E7（推薦）

**目標：統一使用 GENERIC 渲染**

1. **修改 `presentExplainCard()`**
   ```typescript
   // 移除所有 E1-E7 的 case，統一使用 GENERIC
   export function presentExplainCard(card: ExplainCard | null): ExplainVM | null {
     if (!card) return null
     const baseView = buildExplainView(card)
     // 直接返回 GenericVM，不根據 kind 分類
     return prepareGenericVM(base, baseView, card)
   }
   ```

2. **修改 `renderByKind()`**
   ```typescript
   // 移除所有 E1-E7 的 case，統一使用 GenericExplain
   function renderByKind(view: ExplainVM): React.ReactNode {
     return <GenericExplain view={view} />
   }
   ```

3. **簡化 `convertExplainViewModelToCard()`**
   ```typescript
   // 不再需要映射到 E1-E7，統一使用 FALLBACK
   const card: ExplainCard = {
     kind: 'FALLBACK',  // 或移除 kind 欄位
     // ...
   }
   ```

**優點：**
- ✅ 完全移除題型分類邏輯
- ✅ 統一渲染邏輯，易於維護
- ✅ 符合「不分題型都可以回答」的目標

**缺點：**
- ⚠️ 需要重構 `GenericExplain` 來支援所有題型的顯示
- ⚠️ 可能失去某些題型專用的 UI 優化

---

### 方案 2: 保留 E1-E7 但簡化映射

**目標：保留渲染組件，但簡化分類邏輯**

1. **簡化 `kind-alias.ts`**
   ```typescript
   // 只保留必要的映射，其他統一映射到 GENERIC
   export function toLegacyCanonicalKind(kind?: string | null): LegacyCanonicalKind {
     if (!kind) return 'unknown'
     // 只處理明確的映射，其他都返回 'unknown' → GENERIC
     const map: Record<string, LegacyCanonicalKind> = {
       'vocab': 'E1',
       'grammar': 'E2',
       'cloze': 'E3',
       'reading': 'E4',
       // ... 其他明確映射
     }
     return map[kind.toLowerCase()] || 'unknown'
   }
   ```

2. **保留渲染組件但簡化邏輯**
   - 保留 `VocabularyExplain`、`GrammarExplain` 等組件
   - 但統一使用 `GenericExplain` 作為 fallback

**優點：**
- ✅ 保留題型專用的 UI 優化
- ✅ 向後兼容性較好

**缺點：**
- ⚠️ 仍然需要維護 E1-E7 的映射邏輯
- ⚠️ 不符合「完全移除題型分類」的目標

---

### 方案 3: 使用 Markdown 渲染（最簡潔）

**目標：直接渲染 markdown，不經過 E1-E7 轉換**

1. **修改 ExplainCardV2**
   ```typescript
   // 直接使用 API 返回的 markdown
   if (vm.markdown) {
     return <MarkdownExplain markdown={vm.markdown} />
   }
   ```

2. **移除所有 E1-E7 相關邏輯**
   - 移除 `convertExplainViewModelToCard()`
   - 移除 `presentExplainCard()`
   - 移除 `renderByKind()`

**優點：**
- ✅ 最簡潔，完全移除題型分類
- ✅ 直接使用 API 返回的 markdown
- ✅ 符合「像 ChatGPT 一樣回答」的目標

**缺點：**
- ⚠️ 需要實作 `MarkdownExplain` 組件
- ⚠️ 可能失去互動功能（如儲存到錯題本）

---

## 📝 建議

根據你的需求「已經把所有解題、題型劃分都篩掉了」，建議採用**方案 1 或方案 3**：

1. **如果已經有 `MarkdownExplain` 組件** → 使用方案 3
2. **如果需要保留互動功能** → 使用方案 1，統一使用 `GenericExplain`

---

## 🔍 相關檔案清單

### 需要修改的檔案：

1. **`components/solve/ExplainCardV2.tsx`**
   - `convertExplainViewModelToCard()` - 移除 E1-E7 映射
   - `renderByKind()` - 統一使用 GENERIC
   - `explainView` useMemo - 簡化轉換邏輯

2. **`lib/mapper/explain-presenter.ts`**
   - `presentExplainCard()` - 移除 E1-E7 switch，統一使用 GENERIC

3. **`lib/explain/kind-alias.ts`**（可選）
   - 如果完全移除，可以刪除或簡化

4. **`lib/contracts/explain.ts`**
   - `ExplainCardSchema` - 如果移除 kind，需要修改 schema

### 可以保留的檔案（但不再使用）：

- `components/solve/explain/VocabularyExplain.tsx`
- `components/solve/explain/GrammarExplain.tsx`
- `components/solve/explain/ClozeExplain.tsx`
- `components/solve/explain/ReadingExplain.tsx`
- 其他 E1-E7 專用組件

---

## ✅ 總結

**問題：** 為什麼還會有 E1-E7 的設定？

**答案：** 
- API 層已經移除題型分類 ✅
- 但前端渲染層仍然需要 E1-E7 來選擇不同的渲染組件 ⚠️
- 這是因為 `VocabularyExplain`、`GrammarExplain` 等組件是針對特定題型設計的

**解決：**
- 統一使用 `GenericExplain` 或 `MarkdownExplain`
- 移除所有 E1-E7 的映射和 switch 邏輯
- 簡化資料轉換流程


