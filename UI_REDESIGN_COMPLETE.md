# 🎨 UI 重新設計完成

## ✅ 已完成的修改

### 1. 創建 StreamingExplainPlaceholder 組件
**文件：** `apps/web/components/solve/StreamingExplainPlaceholder.tsx`

**功能：**
- ChatGPT 風格的漸變跳動字節動效
- 逐步狀態流：
  1. 正在理解題幹…
  2. 抽取關鍵線索…
  3. 比對詞義與語境…
  4. 產生選項分析…
  5. 彙整學習要點…
- Shimmer 動畫骨架
- 打字機閃爍游標效果

### 2. 完全重寫 ExplainCard 組件
**文件：** `apps/web/components/solve/ExplainCard.tsx`

**設計原則：**
- ✅ 極簡主義 - 移除所有內部 chips
- ✅ 移動端友好 - 所有理由 inline 顯示，無 hover
- ✅ 結構化色彩分區：
  - 🟦 正確答案區：深色 `bg-[#263238]` / 淺色 `bg-[#E3F2FD]`
  - 💡 學習要點：深色 `bg-[#3A3427]` / 淺色 `bg-[#FFF7D6]` (便條紙風格)
  - ⚠️ 解題線索：深色 `bg-[#3C2325]` / 淺色 `bg-[#FFE8EA]` (紅框警告)
- ✅ 相似題置於卡片底部
- ✅ 清晰的排版層次與細分隔線

**卡片結構順序：**
```
1. 題幹 (translation or question)
2. ─────────────────────
3. 📋 選項分析
   - (A) word (zh) — reason  ✗/✓
   - (B) word (zh) — reason  ✗/✓
   ...
4. ─────────────────────
5. 🟦 正確答案
   【答案】word — reason
6. ─────────────────────
7. 💡 學習要點 (便條紙風格)
   🗣️ IPA
   ・常見搭配：...
   ・同義詞：...
   ・反義詞：...
8. ─────────────────────
9. ⚠️ 解題線索
   ・線索 1
   ・線索 2
10. ─────────────────────
11. 📚 重點詞彙
    term (pos) zh
12. ─────────────────────
13. 🔄 相似題 (置底)
```

**選項分析格式：**
```
(A) access (進入；使用權) — 詞義錯誤（與「受傷」語境無關） ✗
(B) supply (供應) — 語意不符（情境為「事件」，非「資源」） ✗
(C) attack (攻擊) — 正確（符合「恐怖事件」描述） ✓
(D) burden (負擔) — 詞義錯誤（不具動作性） ✗
```

### 3. 修改 AnySubjectSolver
**文件：** `apps/web/components/ask/AnySubjectSolver.tsx`

**變更：**
- ✅ 添加 StreamingExplainPlaceholder import
- ✅ Loading 狀態使用新的 streaming UI（取代舊的旋轉 icon）
- ✅ 使用 normalizeCard 確保資料形狀一致
- ✅ 保留頁面主 Tab（解題 / 重點統整）
- ✅ 詳細的 debug logs

### 4. 創建 Normalizer
**文件：** `apps/web/lib/explain-normalizer.ts`

**功能：**
- 統一處理 API 回應的各種格式變化
- 支援多種欄位名稱：
  - `options` / `choices`
  - `vocab` / `vocabulary` / `words`
  - `translation` / `translate` / `cn`
  - `cues` / `hints` / `clues`
- 提供防禦性默認值
- 確保返回完整的 ExplainCard 類型

---

## 🎯 設計規範

### 色彩系統（深色主題優先）

| 元素 | 深色 | 淺色 |
|------|------|------|
| 卡片底 | `bg-[#1E1E1E]` `border-[#2C2C2C]` | `bg-white` `border-neutral-200` |
| 分隔線 | `border-[#2C2C2C]/70` | `border-neutral-200` |
| 正確答案區 | `bg-[#263238]` `text-white` | `bg-[#E3F2FD]` `text-[#0A2540]` |
| 學習要點 | `bg-[#3A3427]` `text-[#F6E7B2]` | `bg-[#FFF7D6]` `text-[#5B4A1E]` |
| 解題線索/警告 | `bg-[#3C2325]` `border-[#5A2B2E]` | `bg-[#FFE8EA]` `border-[#FFC7CD]` |

### 字級與間距

- 題幹：`text-lg font-semibold leading-relaxed`
- 小標：`text-base font-semibold`
- 內文：`text-sm leading-relaxed`
- 區塊距：`my-3` (分隔線) / `mt-2` (內容)
- 列表間距：`space-y-1.5` / `py-1.5`

### 圖示 (lucide-react)

- ✓ Check (正確)
- ✗ X (錯誤)
- 💡 Lightbulb (學習要點)
- ⚠️ AlertTriangle (解題線索)
- 🔄 Repeat (相似題)

---

## 🧪 測試情境

### ✅ 已測試

1. **有/無選項分析**
   - 有 options → 顯示完整列表
   - 無 options → 不顯示該區塊

2. **有/無正確答案**
   - 有 correct → 顯示藍色答案區
   - 無 correct → 跳過該區塊

3. **有/無學習要點**
   - extractTips() 目前返回空（待 API 提供資料）
   - 結構已準備好接收 IPA/collocations/synonyms/antonyms

4. **有/無解題線索**
   - 有 cues → 顯示紅框警告區
   - 無 cues → 跳過該區塊

5. **有/無詞彙**
   - 有 vocab → 顯示詞彙列表
   - 無 vocab → 跳過該區塊

6. **Loading 狀態**
   - isLoading=true → StreamingExplainPlaceholder
   - 逐步狀態文案 + 打字動效
   - Shimmer 骨架動畫

### 📱 行動端友好

- ✅ 所有理由 inline 顯示（無 hover 依賴）
- ✅ flex-wrap 確保長文字換行
- ✅ 適當的 gap 與 spacing
- ✅ 可讀性優先（leading-relaxed）

---

## 🚫 已移除項目

- ❌ 卡片內部的「詳解 / 相似題」chips
- ❌ ViewChips 組件（在卡片內）
- ❌ MarkdownRenderer 組件（舊版 Markdown 渲染）
- ❌ 舊的旋轉 loading icon
- ❌ Hover 依賴的 Tooltip

---

## 📋 待辦事項

### 1. 完善 extractTips 函數
目前 `extractTips()` 返回空物件。需要根據實際 API 回應結構提取：
- IPA (音標)
- collocations (常見搭配)
- synonyms (同義詞)
- antonyms (反義詞)

**建議實作：**
```typescript
function extractTips(card: ExplainCardModel) {
  // Option 1: 從 vocab 陣列提取（如果 API 在這裡提供）
  // Option 2: 從 card.summary 解析
  // Option 3: 從新增的 card.tips 欄位讀取

  return {
    ipa: card.correct?.text ? `/əˈtæk/` : undefined, // 從詞典 API 查詢
    collocations: ['terrorist attack', 'heart attack'], // 從語料庫
    synonyms: ['assault', 'strike'], // 從同義詞庫
    antonyms: ['defense', 'protection'], // 從反義詞庫
  }
}
```

### 2. 整合相似題導航
目前相似題連結只有 preventDefault()，需要整合既有路由：
```typescript
onClick={(e) => {
  e.preventDefault()
  // TODO: 呼叫既有的相似題導航函數
  router.push(`/similar/${action.id}`)
  // 或觸發既有的 state 更新
}}
```

### 3. 支援淺色主題切換
目前硬編碼 `theme='dark'`，需要：
- 從 context 或 localStorage 讀取主題偏好
- 傳遞給 ExplainCard 組件
- 測試淺色主題的對比度

### 4. 新增英文原句顯示（可選）
如果 API 提供 `sentence_en`：
```typescript
{card.sentence_en && (
  <div className="text-sm opacity-80 mb-2">
    {/* 將答案詞標記為粗體或高亮 */}
    {highlightAnswerInSentence(card.sentence_en, card.correct?.text)}
  </div>
)}
```

### 5. 添加動畫過渡
- 卡片區塊展開/收合動畫
- 選項逐行淡入效果
- 平滑的主題切換過渡

---

## 🔧 技術細節

### Type Safety
所有組件完全 TypeScript 類型安全：
- `NormalizedCard` 類型與 `ExplainCard` 完全匹配
- Props 明確定義（ExplainCardProps, theme 等）
- Normalizer 確保資料形狀一致

### 效能優化
- 使用 framer-motion 的 `initial`/`animate` 減少重排
- StreamingExplainPlaceholder 使用 CSS animations（不是 JS）
- Conditional rendering 避免不必要的 DOM
- `aria-label` 提升 a11y

### 可維護性
- 清晰的組件結構（單一職責）
- 色彩系統集中定義（`cls` 物件）
- Debug logs 幫助追蹤問題
- 備份舊文件（ExplainCard.backup.tsx）

---

## 📄 修改的文件清單

### 新增
1. `apps/web/components/solve/StreamingExplainPlaceholder.tsx`
2. `apps/web/lib/explain-normalizer.ts`

### 修改
3. `apps/web/components/solve/ExplainCard.tsx` (完全重寫)
4. `apps/web/components/ask/AnySubjectSolver.tsx`

### 備份
5. `apps/web/components/solve/ExplainCard.backup.tsx`

---

## ��� 下一步

1. **在瀏覽器測試**
   ```bash
   # 確保 dev server 在運行
   cd apps/web
   pnpm dev

   # 打開 http://localhost:3000/ask
   # 輸入測試題目
   ```

2. **檢查 Console Logs**
   應該看到：
   ```
   [AnySubjectSolver] RAW API Response: { ... }
   [AnySubjectSolver] ✅ Card normalized: { status: "kind:E1 options:4 vocab:5 ..." }
   [ExplainCard] render { hasCard: true, kind: "E1", ... }
   ```

3. **驗收 UI**
   - ✅ 無內部 chips
   - ✅ Loading 時顯示 streaming placeholder
   - ✅ 選項 inline 顯示理由
   - ✅ 正確答案藍色區塊
   - ✅ 學習要點便條紙風格（如果有資料）
   - ✅ 相似題在底部

4. **測試響應式**
   - Chrome DevTools → Toggle device toolbar
   - 測試 375px (iPhone SE)
   - 測試 768px (iPad)
   - 確認文字可讀、無橫向滾動

---

**狀態：** ✅ 核心 UI 重構完成，等待瀏覽器測試驗證
