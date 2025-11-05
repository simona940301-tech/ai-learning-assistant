# PassageDock Migration Guide

**Status**: Phase 2/3 Complete - ReadingExplain Prototype Validated
**Next**: Roll out to Cloze/Discourse/SentenceInsertion

---

## 📋 Overview

This document guides the migration of long-form question types to the new unified PassageDock system with evidence highlighting and progressive disclosure.

### Completed

✅ **Phase 1**: Core Infrastructure (Commit: d799f05)
- PassageDock component
- useEvidenceSync hook
- Unified types (PassageVM, LongFormQuestionVM, EvidenceSpan)
- DOMPurify sanitization
- Telemetry utilities
- Regex constants
- ErrorBoundary

✅ **Phase 2**: ReadingExplain v2 (Commit: 7104ce4)
- VM adapter pattern
- Progressive disclosure UI
- Evidence jump + highlight
- localStorage state persistence
- Comprehensive tests

### Pending

🔲 **Phase 3**: Rollout to Other Types
- ClozeExplain (E2/E3)
- ParagraphOrganizationExplain (E5_DISCOURSE)
- SentenceInsertExplain (E5_INSERT - new)

---

## 🎯 Design Principles (Enforce Across All Types)

### 1. Minimalism
- **No redundant labels**: "答案" repeated 3 times → show once
- **Clean typography**: 15px paragraphs, 1.6 line-height, relaxed spacing
- **Subtle colors**: Emerald for correct (bg-emerald-500/10), muted for wrong

### 2. Progressive Disclosure
```
Collapsed (Default):
- Question stem
- Options (with correct answer highlighted)
- One-line reason (≤100 chars)
- [展開詳解] button

Expanded (On Click):
- Full explanation (Markdown-rendered)
- Distractor analysis (wrong options only)
- Grammar highlights (for cloze)
- [收合] button
```

### 3. Evidence-First Interaction
```
User clicks [查看證據]
↓
PassageDock scrolls to paragraph
↓
Paragraph highlighted (bg-primary/10 + ring-1)
↓
Auto-fade after 3 seconds (or until next click)
```

### 4. Accessibility
- ARIA labels: `查看原文第 N 段`
- Keyboard focus: Highlighted paragraph receives focus
- Safe area support: `top-[env(safe-area-inset-top,0)]`

---

## 🔧 Migration Steps (Per Question Type)

### Step 1: Create VM Adapter

**Pattern**: `{type}-adapter.ts`

```typescript
// Example: cloze-adapter.ts
import type { ClozeVM } from '@/lib/mapper/explain-presenter'
import type { LongFormExplainVM } from '@/lib/reading/types'

export function adaptClozeVM(view: ClozeVM): LongFormExplainVM {
  return {
    kind: 'E3', // or 'E2'
    passage: {
      raw: view.passage.text,
      paragraphs: segmentPassage(view.passage.text),
    },
    questions: view.blanks.map(adaptBlank),
    meta: {
      conservative: false,
    },
  }
}

function adaptBlank(blank: ClozeVM['blanks'][0]): LongFormQuestionVM {
  return {
    id: `blank-${blank.number}`,
    prompt: `( ${blank.number} )`,
    answer: blank.answer,
    reasonOneLine: extractReasonOneLine(blank),
    evidence: extractEvidence(blank),

    // Type-specific
    blank: {
      number: blank.number,
      context: blank.context,
    },
    options: blank.options?.map((opt, idx) => ({
      key: String.fromCharCode(65 + idx),
      text: opt.text,
      verdict: opt.isCorrect ? 'fit' : 'unfit',
      reason: opt.reason || '',
    })),
    grammarHighlights: blank.grammarPoints,
  }
}
```

**Key Considerations**:
- **Preserve existing VM**: No breaking changes to Presenter
- **Evidence extraction**: If VM doesn't have evidence, infer from context
- **One-line reason**: Priority: reasoningText → reason → evidence → fallback

### Step 2: Refactor Component

**Pattern**: `{Type}Explain.v2.tsx`

```typescript
'use client'

import { useMemo, useCallback } from 'react'
import { PassageDock } from '@/components/reading/PassageDock'
import { useEvidenceSync } from '@/components/reading/useEvidenceSync'
import { sanitizeInline, sanitizePassage } from '@/lib/sanitize'
import { trackExplainView, trackQuestionView } from '@/lib/telemetry'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { adapt{Type}VM } from './{type}-adapter'

const ENABLE_PASSAGE_DOCK = process.env.NEXT_PUBLIC_ENABLE_PASSAGE_DOCK !== 'false'

export default function {Type}Explain({ view, ... }: {Type}ExplainProps) {
  // 1. Adapt VM
  const unified = useMemo(() => adapt{Type}VM(view), [view])

  // 2. Evidence sync
  const { highlights, jumpToEvidence } = useEvidenceSync({
    kind: unified.kind,
    highlightDuration: 3000,
  })

  // 3. Telemetry
  useEffect(() => {
    trackExplainView({
      kind: unified.kind,
      questionCount: unified.questions.length,
      source: 'api',
    })
  }, [unified.questions.length])

  // 4. Render
  return (
    <ErrorBoundary>
      <div className="space-y-4 pb-8">
        {ENABLE_PASSAGE_DOCK && (
          <PassageDock
            passage={unified.passage}
            highlights={highlights}
            kind={unified.kind}
            storageKey="{type}Dock"
          />
        )}

        <div className="space-y-4">
          {unified.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              onViewEvidence={(spans) => jumpToEvidence(spans, question.id)}
            />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  )
}
```

### Step 3: QuestionCard Component

**Type-specific customizations**:

| Type | Customization |
|------|---------------|
| Cloze | Show blank number `( 1 )`, grammar highlights chip |
| Discourse | Show discourse role badge (因果/轉折/舉例) |
| Insertion | Show insertion position marker |

**Shared structure**:
```typescript
function QuestionCard({ question, onViewEvidence }) {
  const [isExpanded, setIsExpanded] = useState(() => {
    return localStorage.getItem(`{type}Card:${question.id}`) === 'true'
  })

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Stem */}
        <div className="flex justify-between">
          <h3>{question.prompt}</h3>
          <Button onClick={() => onViewEvidence(question.evidence)}>
            查看證據
          </Button>
        </div>

        {/* Options (always visible) */}
        {question.options?.map(opt => (
          <div className={opt.verdict === 'fit' ? 'bg-emerald-500/10' : 'bg-muted/50'}>
            {opt.key}. {opt.text}
          </div>
        ))}

        {/* Collapsed: One-line reason */}
        {!isExpanded && (
          <>
            <p>{question.reasonOneLine}</p>
            <Button onClick={() => setIsExpanded(true)}>展開詳解</Button>
          </>
        )}

        {/* Expanded: Full explanation */}
        {isExpanded && (
          <>
            <div dangerouslySetInnerHTML={{ __html: sanitizePassage(question.fullExplanation) }} />
            <Button onClick={() => setIsExpanded(false)}>收合</Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

### Step 4: Tests

**Pattern**: `{type}-explain.test.ts`

```typescript
describe('{Type}Explain', () => {
  it('should render passage dock when enabled', () => {
    const { getByRole } = render(<{Type}Explain view={mockView} />)
    expect(getByRole('region', { name: /閱讀文章原文/ })).toBeInTheDocument()
  })

  it('should highlight evidence when clicked', async () => {
    const { getByText } = render(<{Type}Explain view={mockView} />)

    fireEvent.click(getByText('查看證據'))

    await waitFor(() => {
      const para = document.getElementById('para-p1')
      expect(para).toHaveClass('bg-primary/10')
    })
  })

  it('should persist expanded state', () => {
    const { getByText } = render(<{Type}Explain view={mockView} />)

    fireEvent.click(getByText('展開詳解'))

    expect(localStorage.getItem('{type}Card:q1')).toBe('true')
  })
})
```

---

## 📦 Shared Code (Copy Directly)

### 1. PassageDock Integration (5 lines)

```typescript
import { PassageDock } from '@/components/reading/PassageDock'

<PassageDock
  passage={unified.passage}
  highlights={highlights}
  kind={unified.kind}
  storageKey="{type}Dock"
  maxHeight="40vh"
  showParagraphNumbers
/>
```

### 2. useEvidenceSync Hook (3 lines)

```typescript
import { useEvidenceSync } from '@/components/reading/useEvidenceSync'

const { highlights, jumpToEvidence } = useEvidenceSync({
  kind: unified.kind,
  highlightDuration: 3000,
  scrollBehavior: 'smooth',
  scrollOffset: 120,
})
```

### 3. Telemetry Events (4 lines)

```typescript
import { trackExplainView, trackQuestionView, trackQuestionExpand } from '@/lib/telemetry'

trackExplainView({ kind, questionCount, source: 'api' })
trackQuestionView({ kind, qid, index })
trackQuestionExpand({ kind, qid, expanded })
```

### 4. ErrorBoundary Wrapper (1 line)

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

<ErrorBoundary>
  {/* Component content */}
</ErrorBoundary>
```

### 5. Feature Flag (2 lines)

```typescript
const ENABLE_PASSAGE_DOCK = process.env.NEXT_PUBLIC_ENABLE_PASSAGE_DOCK !== 'false'

{ENABLE_PASSAGE_DOCK && <PassageDock ... />}
```

---

## 🎯 Type-Specific Adaptations

### ClozeExplain (E2/E3 - 文意選填)

**Unique Requirements**:
- Show blank numbers prominently: `( 1 )`, `( 2 )`, etc.
- Grammar highlights as chips (if available)
- Context preview: "...前文... ( 1 ) ...後文..."

**VM Differences**:
```typescript
interface ClozeVM {
  blanks: Array<{
    number: number
    options: Array<{ text: string; isCorrect: boolean }>
    context: string
    grammarPoints?: string[]
  }>
}
```

**Evidence Extraction**:
- If VM has `blank.paragraphIndex`, use directly
- Otherwise, search passage for `( ${number} )` and map to paragraph

**Estimated Effort**: 2-3 hours

---

### ParagraphOrganizationExplain (E5_DISCOURSE - 篇章結構)

**Unique Requirements**:
- Discourse role badges: 因果/轉折/舉例/遞進/對比
- Full sentences as options (not short phrases)
- Usually only 1-2 questions

**VM Differences**:
```typescript
interface ParagraphOrganizationVM {
  questions: Array<{
    discourseRole?: string
    options: string[] // Full sentences
  }>
}
```

**Evidence Extraction**:
- Paragraph organization questions often reference specific paragraphs
- Use `meta.paragraphIndex` if available

**Estimated Effort**: 1-2 hours (simpler than Reading/Cloze)

---

### SentenceInsertExplain (E5_INSERT - 選句插入) **[NEW]**

**Unique Requirements**:
- Show insertion position markers in passage: `[▼ 1]`, `[▼ 2]`
- Highlight sentence to be inserted (from options)
- Show "best fit" reasoning (coherence/transition/topic)

**VM Differences**:
```typescript
// TODO: Define SentenceInsertVM in explain-presenter.ts
interface SentenceInsertVM {
  passage: {
    paragraphs: string[]
    insertionMarkers: Array<{ position: number; paragraphIndex: number }>
  }
  questions: Array<{
    insertionNumber: number
    sentence: string // The sentence to insert
    options: Array<{ position: string; reason: string }>
  }>
}
```

**Evidence Extraction**:
- Map insertion markers to paragraph IDs
- Highlight paragraph before/after insertion point

**Estimated Effort**: 2-3 hours (new type, need to create from scratch)

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Evidence Not Showing

**Symptom**: "查看證據" button click does nothing

**Debug**:
```typescript
console.log('Evidence:', question.evidence)
console.log('Highlights:', highlights)
```

**Solution**: Check adapter's `adaptEvidence` function returns correct `paraId` format (`p1`, `p2`, etc.)

### Pitfall 2: localStorage Not Persisting

**Symptom**: Expanded state resets on page reload

**Debug**:
```typescript
console.log('Saved:', localStorage.getItem(`{type}Card:${question.id}`))
```

**Solution**: Ensure storage key is stable (use `question.id`, not index)

### Pitfall 3: XSS Vulnerability

**Symptom**: User-generated content renders unsanitized HTML

**Debug**: Check browser console for `<script>` tags or `onerror` attributes

**Solution**: Always use `sanitizePassage` or `sanitizeInline` before `dangerouslySetInnerHTML`

### Pitfall 4: PassageDock Not Sticky

**Symptom**: Dock scrolls away with content

**Debug**: Check CSS classes in browser DevTools

**Solution**: Ensure `sticky top-[env(safe-area-inset-top,0)]` is applied to PassageDock container

---

## 📊 Success Metrics

Track these metrics in telemetry to validate UX improvements:

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Evidence clicks | N/A | >40% of users | `evidence.view` events |
| Expand rate | 100% (always expanded) | 30-50% | `question.expand` events |
| Time to answer | Baseline | -20% | `question.view` → next `question.view` |
| Scroll depth | Baseline | +15% | `passage.scroll` events |

---

## 🧪 Testing Checklist

Before marking migration complete:

### Functional Tests
- [ ] PassageDock renders and is sticky
- [ ] Evidence jump scrolls to correct paragraph
- [ ] Paragraph highlights with correct styling
- [ ] Highlight fades after 3 seconds
- [ ] Expanded state persists across reloads
- [ ] Feature flag works (can disable dock)
- [ ] ErrorBoundary catches render errors

### Security Tests
- [ ] All HTML is sanitized (passage, inline, options)
- [ ] XSS attacks blocked (`<script>`, `onerror`, etc.)
- [ ] No console errors from DOMPurify

### Accessibility Tests
- [ ] PassageDock has `aria-label`
- [ ] Evidence buttons have descriptive labels
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Focus visible on highlighted paragraphs

### Performance Tests
- [ ] No unnecessary re-renders (check React DevTools)
- [ ] Telemetry events throttled (max 1/sec for scroll)
- [ ] localStorage ops don't block UI

### Mobile Tests
- [ ] Safe area respected (notch/home indicator)
- [ ] PassageDock max-height appropriate (33vh)
- [ ] Touch targets ≥44px
- [ ] No horizontal scroll

---

## 📸 Visual Regression Testing

Take screenshots at key states:

1. **Initial Load**: PassageDock + collapsed questions
2. **Evidence Active**: Highlighted paragraph in dock
3. **Expanded Question**: Full explanation visible
4. **Mobile Portrait**: All elements fit, no overflow
5. **Mobile Landscape**: Dock height adjusts
6. **Dark Mode**: Colors remain readable

Compare before/after to ensure no regressions.

---

## 🚀 Rollout Strategy

### Week 1: ReadingExplain Beta
- Enable for 10% of users via feature flag
- Monitor telemetry and error rates
- Collect user feedback

### Week 2: ReadingExplain GA
- Enable for 100% of users
- Document any issues
- Prepare templates for other types

### Week 3: ClozeExplain Beta
- Apply lessons learned from ReadingExplain
- Enable for 10% of users
- A/B test against old UI

### Week 4: ClozeExplain GA + Discourse Beta
- Roll out Cloze fully
- Start Discourse migration
- SentenceInsert planned for Week 5

---

## 📝 Post-Migration Cleanup

After all types migrated:

1. **Remove old files**:
   - `ReadingExplain.tsx` → `ReadingExplain.legacy.tsx` (keep 1 sprint)
   - `ClozeExplain.tsx` → `ClozeExplain.legacy.tsx`
   - etc.

2. **Consolidate adapters**:
   - Move to `lib/reading/adapters/` directory
   - Export from single index file

3. **Update documentation**:
   - Add "How to Add a New Question Type" guide
   - Document VM → unified VM contract

4. **Remove feature flags**:
   - `ENABLE_PASSAGE_DOCK` → always on
   - Remove conditional rendering

---

## 🆘 Support & Questions

For questions or issues during migration:

1. Check this guide first
2. Review ReadingExplain.v2.tsx as reference implementation
3. Check Phase 1 infrastructure (commit d799f05)
4. Open GitHub issue with `[PassageDock Migration]` prefix

---

**Last Updated**: 2025-11-05
**Author**: Claude Code
**Status**: Phase 2/3 Complete - Ready for Rollout
