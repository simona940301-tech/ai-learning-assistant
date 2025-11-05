# 📋 API → Presenter → UI 契約檢視 + 測試清單

> **目標**：確保 `kind: 'vocab'` 與所有題型都能穩定落地，不再出現「已 render 但畫面空白」的問題

---

## 📐 契約 A：API Response（統一格式）

### 頂層結構

```typescript
interface ExplainAPIResponse {
  id: string                    // 服務端生成
  kind: string                  // 原始 kind（任何別名）
  aliases?: string[]            // 可選，供診斷（如 ["E1_VOCAB", "vocabulary"]）
  confidence: number            // 0~1 分類信心
  mode: 'deep'                  // 現在固定 deep，保留欄位兼容
  meta: {
    model?: string              // "gpt-4o", "gpt-4-turbo" 等
    latency_ms: number          // API 延遲
    source: 'TARS+KCE' | 'conservative'
  }
  payload: KindPayload          // 依 kind 結構（見下）
}
```

### 各 kind 的 payload 最小要求

#### `vocab` (E1)

```typescript
interface VocabPayload {
  question: {
    text: string               // 題幹（必填）
    text_zh?: string           // 中文翻譯（可選）
  }
  choices: Array<{
    text: string               // 選項文字（必填）
    pos?: string               // 詞性（可選，預設 "-"）
    zh?: string                // 中文（可選，預設 "-"）
    reason?: string            // 理由（可選，預設 ""）
    is_correct?: boolean       // 是否正確（可選，預設 false）
  }>                          // 最少 2 個
  answer: 'A' | 'B' | 'C' | 'D'  // 答案（必填）
  reasoning?: string          // 一句邏輯（可選）
}
```

**最小顯示條件**：`question.text && choices.length >= 2 && answer`

---

#### `grammar` (E2)

```typescript
interface GrammarPayload {
  sentence: string            // 含空格的句子（必填）
  choices: string[]           // 選項陣列（最少 2 個）
  answer: 'A' | 'B' | 'C' | 'D'
  rule?: string               // 語法規則（可選）
  reasoning?: string          // 一句邏輯（可選）
}
```

**最小顯示條件**：`sentence && choices.length >= 2 && answer`

---

#### `cloze` (E3)

```typescript
interface ClozePayload {
  passage: string             // 含 (1)(2) 或 ____ 的段落（必填）
  blanks: Array<{
    index: number              // 空格序號（必填）
    choices: string[]         // 選項（最少 2 個）
    answer: 'A' | 'B' | 'C' | 'D'
    reason?: string           // 理由（可選）
  }>                          // 最少 1 個
}
```

**最小顯示條件**：`passage && blanks.length >= 1`

---

#### `reading` (E4)

```typescript
interface ReadingPayload {
  passage: {
    text: string              // 全文（必填）
    spans?: Array<{            // 可選，供高亮使用
      i: number
      start: number
      end: number
    }>
  }
  questions: Array<{
    no: number                 // 題號（必填）
    stem: string               // 題幹（必填）
    choices: string[]          // 選項（最少 2 個）
    answer: 'A' | 'B' | 'C' | 'D'
    evidence?: number[]        // 指向 spans 索引（可選）
    reason?: string           // 理由（可選）
  }>                          // 最少 1 個
  vocab?: Array<{             // 可選
    word: string
    pos?: string
    zh?: string
  }>
}
```

**最小顯示條件**：`passage.text && questions.length >= 1`

---

#### `discourse` (E6) / `translation` (E5) / `writing` (E8)

**最小三件套**：`stem` + `choices`（或任務描述）+ `answer`（或關鍵結論）

```typescript
interface DiscoursePayload {
  passage?: string
  blanks: Array<{
    index: number
    choices: string[]
    answer: 'A' | 'B' | 'C' | 'D'
    reason?: string
  }>
}

interface TranslationPayload {
  source: string              // 原文
  target?: string             // 譯文（可選）
  answer?: string             // 關鍵結論
  reasoning?: string
}

interface WritingPayload {
  prompt: string              // 寫作提示
  answer?: string             // 範文或關鍵點
  reasoning?: string
}
```

---

## 🔄 契約 B：Presenter 轉換

### 1. Kind 正規化（已實作，對照表）

```typescript
// apps/web/lib/explain/kind-alias.ts

const ALIAS_MAP: Record<string, CanonicalKind> = {
  // E1 - Vocabulary
  'vocab': 'E1',
  'vocabulary': 'E1',
  'E1': 'E1',
  'E1_VOCAB': 'E1',
  'E1_VOCABULARY': 'E1',
  'vocabularyVM': 'E1',
  
  // E2 - Grammar
  'grammar': 'E2',
  'E2': 'E2',
  'E2_GRAMMAR': 'E2',
  'grammarVM': 'E2',
  
  // E3 - Cloze
  'cloze': 'E3',
  'E3': 'E3',
  'E3_CLOZE': 'E3',
  'clozeVM': 'E3',
  
  // E4 - Reading
  'reading': 'E4',
  'E4': 'E4',
  'E4_READING': 'E4',
  'readingVM': 'E4',
  
  // E5 - Translation
  'translation': 'E5',
  'E5': 'E5',
  'E5_TRANSLATION': 'E5',
  'translationVM': 'E5',
  
  // E6 - Paragraph Organization
  'discourse': 'E6',
  'paragraph': 'E6',
  'paragraphOrganization': 'E6',
  'PARAGRAPH_ORGANIZATION': 'E6',
  'E6': 'E6',
  'E6_DISCOURSE': 'E6',
  'paragraphOrganizationVM': 'E6',
  
  // E7 - Contextual Completion
  'contextual': 'E7',
  'contextualCompletion': 'E7',
  'CONTEXTUAL_COMPLETION': 'E7',
  'E7': 'E7',
  'E7_CONTEXTUAL': 'E7',
  'contextualCompletionVM': 'E7',
  
  // E8 - Writing
  'writing': 'E8',
  'E8': 'E8',
  'E8_WRITING': 'E8',
  'writingVM': 'E8',
  
  // Fallback
  'unknown': 'unknown',
  'fallback': 'unknown',
  'FALLBACK': 'unknown',
  'generic': 'unknown',
  'GENERIC': 'unknown',
}

export function toCanonicalKind(kind?: string | null): CanonicalKind {
  if (!kind) return 'unknown'
  const normalized = String(kind).trim()
  
  // Direct lookup
  if (normalized in ALIAS_MAP) {
    return ALIAS_MAP[normalized]
  }
  
  // Case-insensitive fallback
  const lowerCase = normalized.toLowerCase()
  if (lowerCase in ALIAS_MAP) {
    return ALIAS_MAP[lowerCase]
  }
  
  console.warn(`[kind-alias] Unknown kind: "${kind}" → fallback to "unknown"`)
  return 'unknown'
}
```

---

### 2. Presenter 轉換流程

```typescript
// apps/web/lib/mapper/explain-presenter.ts

export function presentExplainCard(card: ExplainCard | null): ExplainVM | null {
  if (!card) return null
  
  // 1. Kind 正規化（已在上層完成，但需確認）
  const canonicalKind = toCanonicalKind(card.kind)
  
  // 2. 建立 Base View
  const baseView = buildExplainView(card)
  
  // 3. 補預設值
  const options = toOptionVM(baseView.options).map(opt => ({
    label: opt.label || 'A',
    text: opt.text || '',
    pos: opt.pos || '-',
    zh: opt.zh || '-',
    reason: opt.reason || '',
    correct: opt.correct ?? false,
  }))
  
  // 4. 按 kind 轉換為專屬 VM
  switch (canonicalKind) {
    case 'E1': return prepareVocabularyVM(card, base, baseView)
    case 'E2': return prepareGrammarVM(card, base, baseView)
    case 'E3': return prepareClozeVM(card, base, baseView)
    case 'E4': return prepareReadingVM(card, base, baseView)
    case 'E5': return prepareTranslationVM(card, base, baseView)
    case 'E6': return prepareParagraphOrganizationVM(card, base, baseView)
    case 'E7': return prepareContextualCompletionVM(card, base, baseView)
    default: return prepareGenericVM(base, baseView, card)
  }
}
```

---

### 3. 渲染門檻（不要整卡 return null）

**各題型的最小顯示條件檢查**：

```typescript
function canRenderVocabulary(vm: VocabularyVM): boolean {
  return !!(
    vm.stem?.en &&
    vm.options && vm.options.length >= 2 &&
    vm.answer
  )
}

function canRenderGrammar(vm: GrammarVM): boolean {
  return !!(
    vm.stem?.en &&
    vm.options && vm.options.length >= 2 &&
    vm.answer
  )
}

function canRenderCloze(vm: ClozeVM): boolean {
  return !!(
    vm.article?.en &&
    vm.meta?.blankIndex != null
  )
}

function canRenderReading(vm: ReadingVM): boolean {
  return !!(
    vm.article?.en &&
    vm.questions && vm.questions.length >= 1
  )
}

// 不足條件 → 顯示最小卡 + 缺欄位提示（dev）/ 佔位符（prod）
function renderWithFallback(vm: ExplainVM) {
  if (!canRender(vm)) {
    return <DevFallbackUI 
      data={vm} 
      missingFields={getMissingFields(vm)}
      kind={vm.kind}
    />
  }
  return renderByKind(vm)
}
```

---

## 🎨 契約 C：ExplainCardV2（極簡統一架構）

### 責任邊界

```typescript
// apps/web/components/solve/ExplainCardV2.tsx

export default function ExplainCardV2({ inputText, conservative = false }) {
  // ✅ 只負責：
  // 1. 發請求
  // 2. Kind 正規化（fetch 後第一步）
  // 3. 交給 presenter
  // 4. renderByKind(vm)
  
  // ❌ 移除：
  // - mode 切換
  // - FastModePresenter / DeepModePresenter
  // - ModeToggle
  
  // ✅ 競態處理：
  // - AbortController（未來加載延伸時避免覆蓋）
  // - Key 建議：`${vm.kind}-${hash(raw)}`
}
```

### 轉換流程

```typescript
// 1. API Response → ExplainViewModel（舊格式）
const vm: ExplainViewModel = await fetch('/api/explain', ...)

// 2. Kind 正規化（立即執行）
const canonicalKind = toCanonicalKind(vm.kind)
console.log(`[ExplainCardV2] Normalized: ${vm.kind} → ${canonicalKind}`)

// 3. 轉換為 ExplainCard format
const card = convertExplainViewModelToCard(vm, inputText)

// 4. Presenter 轉換
const view = presentExplainCard(card)

// 5. 渲染
if (!view) {
  return <DevFallbackUI data={vm} kind={canonicalKind} />
}

return renderByKind(view)
```

---

## ✅ 驗收與自動化測試

### 1. 單元測試（Presenter）

#### 測試別名正規化

```typescript
describe('toCanonicalKind', () => {
  test('vocab aliases → E1', () => {
    expect(toCanonicalKind('vocab')).toBe('E1')
    expect(toCanonicalKind('vocabulary')).toBe('E1')
    expect(toCanonicalKind('E1')).toBe('E1')
    expect(toCanonicalKind('E1_VOCAB')).toBe('E1')
    expect(toCanonicalKind('vocabularyVM')).toBe('E1')
  })
  
  test('case insensitive', () => {
    expect(toCanonicalKind('VOCAB')).toBe('E1')
    expect(toCanonicalKind('Grammar')).toBe('E2')
  })
  
  test('unknown → unknown', () => {
    expect(toCanonicalKind('unknown')).toBe('unknown')
    expect(toCanonicalKind('foo')).toBe('unknown')
    expect(toCanonicalKind(null)).toBe('unknown')
  })
})
```

#### 測試預設值補全

```typescript
describe('presentExplainCard - default values', () => {
  test('vocab payload missing pos/zh/reason → fills defaults', () => {
    const card = {
      id: 'test',
      kind: 'E1',
      question: 'Test question',
      options: [
        { key: 'A', text: 'choice A' },  // 缺 pos, zh, reason
        { key: 'B', text: 'choice B', correct: true }
      ],
      correct: { key: 'B', text: 'choice B' }
    }
    
    const vm = presentExplainCard(card) as VocabularyVM
    expect(vm.options[0].pos).toBe('-')
    expect(vm.options[0].zh).toBe('-')
    expect(vm.options[0].reason).toBe('')
  })
})
```

#### 測試快照

```typescript
describe('presentExplainCard - snapshots', () => {
  test('最小合法 vocab', () => {
    const card = createMinimalVocabCard()
    const vm = presentExplainCard(card)
    expect(vm).toMatchSnapshot('minimal-vocab')
  })
  
  test('完整合法 vocab', () => {
    const card = createFullVocabCard()
    const vm = presentExplainCard(card)
    expect(vm).toMatchSnapshot('full-vocab')
  })
  
  test('缺欄位 vocab（應能 parse）', () => {
    const card = createPartialVocabCard() // 缺 pos, zh
    const vm = presentExplainCard(card)
    expect(vm).toBeTruthy()
    expect(vm.options[0].pos).toBe('-')
  })
})
```

---

### 2. 元件測試（Renderer）

```typescript
describe('VocabularyExplain', () => {
  test('最小資料能成功渲染', () => {
    const vm = createMinimalVocabVM()
    render(<VocabularyExplain view={vm} />)
    
    expect(screen.getByText(vm.stem.en)).toBeInTheDocument()
    expect(screen.getByText(vm.answer.text)).toBeInTheDocument()
  })
  
  test('使用 text-foreground / bg-background', () => {
    const vm = createMinimalVocabVM()
    const { container } = render(<VocabularyExplain view={vm} />)
    
    const cards = container.querySelectorAll('[class*="bg-"]')
    expect(cards.length).toBeGreaterThan(0)
  })
  
  test('行動版不被底部 Dock 蓋住', () => {
    // 測試 min-h-[40vh] max-h-[70vh] overflow-y-auto
    const vm = createMinimalVocabVM()
    const { container } = render(<VocabularyExplain view={vm} />)
    
    const wrapper = container.firstChild
    expect(wrapper).toHaveStyle({
      minHeight: '40vh',
      maxHeight: '70vh',
      overflowY: 'auto'
    })
  })
})
```

---

### 3. 端對端測試（E2E）

```typescript
describe('ExplainCardV2 E2E', () => {
  const fixtures = [
    { kind: 'vocab', payload: vocabFixture },
    { kind: 'grammar', payload: grammarFixture },
    { kind: 'cloze', payload: clozeFixture },
    { kind: 'reading', payload: readingFixture },
    { kind: 'discourse', payload: discourseFixture },
    { kind: 'translation', payload: translationFixture },
    { kind: 'writing', payload: writingFixture },
  ]
  
  fixtures.forEach(({ kind, payload }) => {
    test(`kind: ${kind} 能成功渲染`, async () => {
      // Mock API
      mockFetch('/api/explain', {
        kind,
        payload,
        meta: { latency_ms: 100 }
      })
      
      render(<ExplainCardV2 inputText="test" />)
      
      await waitFor(() => {
        expect(screen.queryByText(/正在生成詳解/)).not.toBeInTheDocument()
      })
      
      // 確認有內容渲染（不是空白）
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByRole('article').textContent).not.toBe('')
    })
  })
  
  test('行動裝置視窗（390×844）→ 可正常捲動/不遮擋', async () => {
    // 設置視窗大小
    window.innerWidth = 390
    window.innerHeight = 844
    
    render(<ExplainCardV2 inputText={longTextFixture} />)
    
    await waitFor(() => {
      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
      
      // 確認可以捲動
      expect(card.scrollHeight).toBeGreaterThan(window.innerHeight)
    })
  })
  
  test('事件遙測：explain.render 需附正確資料', async () => {
    const trackSpy = jest.spyOn(analytics, 'track')
    
    render(<ExplainCardV2 inputText="test" />)
    
    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith('explain.render', {
        mode: 'unified',
        kind: 'E1',
        originalKind: 'vocab',
        latency_ms: expect.any(Number),
        vm_valid: true,
        missing_fields: []
      })
    })
  })
  
  test('fallback 時：vm_valid:false 並列出 missing_fields', async () => {
    mockFetch('/api/explain', {
      kind: 'vocab',
      payload: { /* 缺必要欄位 */ }
    })
    
    const trackSpy = jest.spyOn(analytics, 'track')
    
    render(<ExplainCardV2 inputText="test" />)
    
    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith('explain.render', {
        mode: 'unified',
        kind: 'E1',
        vm_valid: false,
        missing_fields: ['question.text', 'choices']
      })
    })
  })
})
```

---

## 🔍 快速自檢清單（運維視角）

### ✅ API 層

- [ ] API 回傳一定含：`kind`, `payload`, `meta.latency_ms`
- [ ] 各 kind 的 payload 符合最小要求（見契約 A）
- [ ] 可選欄位有明確標記（`?` 或 `optional()`）

### ✅ Presenter 層

- [ ] `toCanonicalKind` 在 fetch 後第一步執行
- [ ] Presenter `parse()` 沒 throw（dev 可 toast，prod 靜默 fallback）
- [ ] 缺欄位一律補預設（`pos: '-'`, `zh: '-'`, `reason: ''`）
- [ ] 渲染門檻檢查（不要整卡 return null）

### ✅ Renderer 層

- [ ] Renderer 無會整卡 return null 的 guard
- [ ] 各題型以最小資料能成功渲染
- [ ] 使用 `text-foreground` / `bg-background`（主題適配）
- [ ] 行動版容器：`min-h-[40vh] max-h-[70vh] overflow-y-auto`

### ✅ ExplainCardV2 層

- [ ] `ExplainCardV2` 有 AbortController（未來加載延伸時避免覆蓋）
- [ ] Key 建議：`${vm.kind}-${hash(raw)}`，避免「相同 kind 但不同內容」不重掛
- [ ] `DevFallback` 可展開 raw（只在 dev）
- [ ] 競態處理：後到覆蓋（fast 已移除，仍建議保留 AbortController）

---

## 📊 測試覆蓋率目標

- **單元測試（Presenter）**：≥ 90%
- **元件測試（Renderer）**：≥ 80%
- **E2E 測試**：所有 7 種題型 + 邊界情況

---

## 🚀 下一步實施

1. **創建測試 fixtures**（`tests/fixtures/explain-payloads.ts`）
2. **實施 AbortController**（ExplainCardV2）
3. **添加渲染門檻檢查**（各題型）
4. **完善遙測事件**（`vm_valid`, `missing_fields`）
5. **行動版容器樣式**（`min-h-[40vh] max-h-[70vh]`）

---

## 📝 契約變更記錄

| 日期 | 變更 | 影響範圍 |
|------|------|---------|
| 2024-01-XX | 統一 API Response 格式 | API, Presenter |
| 2024-01-XX | 移除 mode 切換 | ExplainCardV2 |
| 2024-01-XX | 添加渲染門檻檢查 | Presenter, Renderer |

---

**最後更新**：根據專案實際狀況與用戶需求制定

