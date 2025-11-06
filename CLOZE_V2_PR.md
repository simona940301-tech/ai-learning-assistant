# ClozeExplain v2 - PassageDock Integration (Phase 2.5/3)

## 📋 Summary

Integrated **ClozeExplain (E2/E3 文意選填/克漏字)** into the unified PassageDock system with evidence highlighting and progressive disclosure, following the validated ReadingExplain v2 pattern.

---

## 🎯 Objectives Achieved

✅ **Fixed Passage Dock**: Sticky top viewer (40vh desktop / 33vh mobile)
✅ **Evidence Jumping**: Click 🔍 → scroll → highlight → 3s fade
✅ **Progressive Disclosure**: Collapsed by default (answer + one-line reason)
✅ **State Persistence**: localStorage per blank card
✅ **XSS Protection**: Full DOMPurify sanitization
✅ **Telemetry Integration**: explain.view, question.view, evidence.view
✅ **Feature Flag**: ENABLE_PASSAGE_DOCK_CLOZE (default: true)

---

## 📦 Files Changed

### New Files

1. **cloze-adapter.ts** (225 lines)
   - Converts ClozeVM → LongFormExplainVM
   - Evidence inference from sentence span or blank position
   - One-line reason extraction with priority fallback
   - Paragraph containment search
   - Utilities: getParagraphId, findBlankMarker

2. **ClozeExplain.v2.tsx** (340 lines)
   - Complete refactor using PassageDock + useEvidenceSync
   - BlankCard component with progressive disclosure
   - Inline distractor reasons (collapsed state)
   - Discourse tag badges
   - localStorage: clozeCard:{qid}
   - ErrorBoundary wrapper

3. **Tests** (180 lines total)
   - `cloze.evidence.jump.test.ts`: VM adaptation, evidence inference
   - `cloze.sanitize.test.ts`: XSS protection for options/passages

### Modified Files

None - Backward compatible, feature-flagged implementation

---

## 🎨 UI Design (Minimalism)

### Collapsed State (Default)

```
┌─────────────────────────────────────────┐
│ ① / 3                        🔍 查看證據│
│ Second paragraph contains... ( 1 )      │
│                                         │
│ A. therefore      [因果關係不符]         │ ← Muted
│ B. however                              │ ← Emerald (correct)
│ C. moreover       [遞進關係不符]         │ ← Muted
│ D. nevertheless   [語氣過強]             │ ← Muted
│                                         │
│ [轉折]                                  │ ← Discourse tag
│                                         │
│ 此處表示前後文的轉折關係                 │
│ [展開詳解]                              │
└─────────────────────────────────────────┘
```

### Expanded State

```
┌─────────────────────────────────────────┐
│ ① / 3                        🔍 查看證據│
│ [Options same as above]                 │
│ ─────────────────────────────────────   │
│ 【完整解析】                            │
│ 前文提到 X，後文轉而討論 Y，            │
│ 因此需要轉折連接詞...                   │
│                                         │
│ 【誤選分析】                            │
│ A. therefore 表示因果關係，與文意不符   │
│ C. moreover 表示遞進，不適用於此處      │
│ D. nevertheless 語氣較強，過於絕對      │
│                                         │
│ [收合]                                  │
└─────────────────────────────────────────┘
```

---

## 🔧 Technical Highlights

### Evidence Inference Strategy

```typescript
// Priority 1: Sentence span → find containing paragraph
if (sentenceSpan.start >= 0) {
  // Character-level → paragraph mapping
  return [{ paraId: 'p2' }]
}

// Priority 2: Blank index → estimate paragraph
const estimatedParagraphIndex = Math.floor(
  (blankIndex / totalBlanks) * paragraphs.length
)

// Priority 3: Fallback to first paragraph
return [{ paraId: 'p1' }]
```

### One-Line Reason Extraction

```typescript
// Priority: reasonLine → answer.reason → discourseTag → fallback
function extractReasonOneLine(view: ClozeVM): string {
  if (view.meta.reasonLine?.length <= 100) {
    return view.meta.reasonLine
  }
  if (view.answer?.reason?.length <= 100) {
    return view.answer.reason
  }
  if (view.meta.discourseTag) {
    return `此處為${view.meta.discourseTag}關係`
  }
  return '請展開查看完整解析'
}
```

### Inline Distractor Reasons

```tsx
// Collapsed state: Show wrong option reasons inline (max 40 chars)
{!isExpanded && !isCorrect && hasReason && (
  <span className="text-xs text-muted-foreground">
    {option.reason.length > 40
      ? option.reason.substring(0, 37) + '...'
      : option.reason}
  </span>
)}
```

---

## 🔒 Security

### All HTML Sanitized

```tsx
// Option text
<span dangerouslySetInnerHTML={{
  __html: sanitizeInline(option.text)
}} />

// Full explanation
<div dangerouslySetInnerHTML={{
  __html: sanitizePassage(question.fullExplanation)
}} />
```

### XSS Test Coverage

- ✅ Script tag removal
- ✅ Event handler removal (onclick, onerror, etc.)
- ✅ javascript: URL blocking
- ✅ iframe/object/embed blocking
- ✅ Real-world attack vector tests

---

## ⚡ Performance

- **useMemo**: VM adaptation cached
- **useCallback**: Event handlers memoized
- **localStorage**: Throttled writes (only on toggle)
- **Regex**: Pre-compiled in lib/english/regex.ts
- **No layout shift**: Fixed dock height, smooth transitions

---

## 📊 Telemetry Events

```typescript
// On mount
trackExplainView({
  kind: 'E3',
  questionCount: 1,
  source: 'api',
  timeToFirstPaint: 245
})

// On evidence click
trackEvidenceView({
  kind: 'E3',
  qid: 'blank-1',
  paraId: 'p2',
  spans: 1
})

// On expand/collapse
trackQuestionExpand({
  kind: 'E3',
  qid: 'blank-1',
  expanded: true
})
```

---

## 🧪 Testing

### Test Suite

1. **cloze.evidence.jump.test.ts** (14 tests)
   - VM conversion
   - Evidence inference from sentence span
   - Paragraph ID mapping
   - Blank marker detection
   - Edge cases (missing article, options)

2. **cloze.sanitize.test.ts** (12 tests)
   - Inline sanitization (options)
   - Passage sanitization (explanations)
   - XSS attack detection
   - Real-world attack vectors

### Run Tests

```bash
# Run Cloze tests
pnpm test cloze

# Run all PassageDock tests
pnpm test reading
```

---

## 🚀 Deployment

### Feature Flag

```bash
# Enable (default)
NEXT_PUBLIC_ENABLE_PASSAGE_DOCK_CLOZE=true

# Disable (rollback)
NEXT_PUBLIC_ENABLE_PASSAGE_DOCK_CLOZE=false
```

### Integration

```typescript
// Option 1: Replace existing (recommended after validation)
mv ClozeExplain.tsx ClozeExplain.legacy.tsx
mv ClozeExplain.v2.tsx ClozeExplain.tsx

// Option 2: Use feature flag in entry point
import ClozeExplainV2 from './ClozeExplain.v2'
import ClozeExplainLegacy from './ClozeExplain'

export default process.env.NEXT_PUBLIC_ENABLE_PASSAGE_DOCK_CLOZE === 'false'
  ? ClozeExplainLegacy
  : ClozeExplainV2
```

---

## 📋 Next Steps (Rollout Plan)

### Week 1: ClozeExplain Beta Testing
- [ ] Enable for 10% of users
- [ ] Monitor telemetry events
- [ ] Collect user feedback
- [ ] Test on various screen sizes

### Week 2: ClozeExplain GA
- [ ] Enable for 100% of users
- [ ] Document any issues
- [ ] Update migration guide

### Week 3: ParagraphOrganizationExplain (E5_DISCOURSE)
- [ ] Create adapter (estimated 1-2 hours)
- [ ] Implement v2 component
- [ ] Write tests
- [ ] Deploy with feature flag

### Week 4: SentenceInsertExplain (E5_INSERT) **[NEW]**
- [ ] Define SentenceInsertVM type
- [ ] Create adapter (estimated 2-3 hours)
- [ ] Implement v2 component with insertion markers
- [ ] Write tests
- [ ] Deploy with feature flag

---

## 📸 Screenshots

### Desktop View

```
┌─────────────────────────────────────────────────────┐
│ 原文                                         3 段   │ ← Sticky Dock
│ ───────────────────────────────────────────────────│
│ [Scrollable 40vh]                                   │
│                                                     │
│ First paragraph with important information.        │ ← p1
│                                                     │
│ Second paragraph contains the blank ( 1 ) here.    │ ← p2 (highlighted)
│                                                     │
│ Third paragraph concludes.                         │ ← p3
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 第一段有重要資訊。第二段包含空格。第三段總結。      │ ← Translation
└─────────────────────────────────────────────────────┘

[Blank cards as shown in UI Design section above]
```

### Mobile View (33vh Dock)

```
┌──────────────────────────────┐
│ 原文                  3 段   │ ← 33vh
│ ────────────────────────────│
│ [Scrollable content]         │
│ ...paragraph text...         │
└──────────────────────────────┘

[Blank cards with same structure]
```

---

## 🔄 Backward Compatibility

### No Breaking Changes

- ✅ ClozeExplain.tsx unchanged
- ✅ ClozeVM type unchanged
- ✅ Router/Parser logic unchanged
- ✅ Existing props preserved
- ✅ Feature-flagged rollout

### Rollback Plan

1. **Immediate**: Set `ENABLE_PASSAGE_DOCK_CLOZE=false`
2. **Code**: Revert entry point to import ClozeExplain.tsx
3. **Complete**: Remove v2 files (keep for 1 sprint as backup)

---

## 📊 Shared Code Reuse

### From ReadingExplain v2

- ✅ PassageDock integration (100% reused)
- ✅ useEvidenceSync hook (100% reused)
- ✅ Telemetry events (100% reused)
- ✅ Sanitization (100% reused)
- ✅ ErrorBoundary (100% reused)
- ✅ localStorage pattern (100% reused)

### Type-Specific Adaptations

- ⚙️ VM adapter (~30% custom logic)
- ⚙️ BlankCard component (~40% custom UI)
- ⚙️ Evidence inference (~50% custom strategy)

### Total Code Reuse: ~75%

---

## 🎯 Success Metrics (Targets)

| Metric | Baseline | Target | Measure |
|--------|----------|--------|---------|
| Evidence clicks | N/A | >30% users | `evidence.view` events |
| Expand rate | 100% | 30-40% | `question.expand` |
| Time to answer | TBD | -20% | Event timestamps |
| Scroll engagement | TBD | +10% | `passage.scroll` |

---

## ⚠️ Known Limitations

1. **Character-level highlighting**: Not yet implemented (only paragraph-level)
   - Future: Use `sentenceSpan.start/end` for precise highlighting

2. **Multi-blank support**: Current VM shows one blank at a time
   - Adapter handles single blank → can extend for batch view

3. **Evidence search**: Best-effort synchronous mapping
   - Could be improved with async fuzzy search

4. **Translation placement**: Fixed below dock
   - Could be integrated into dock as toggle

---

## 🤝 Migration to Other Types

### ParagraphOrganizationExplain (Next)

**Similarities to Cloze**:
- ✅ Article-based
- ✅ Discourse tags
- ✅ Evidence from paragraphs

**Differences**:
- Options are full sentences (not words)
- Usually fewer blanks (1-2)
- Focus on coherence/transition

**Effort**: 1-2 hours (simpler than Cloze)

### SentenceInsertExplain (New)

**Unique Requirements**:
- Insertion position markers `[▼ 1]`
- Highlight sentence to be inserted
- Coherence reasoning

**Effort**: 2-3 hours (need to create from scratch)

---

## 📝 Checklist (Definition of Done)

- [x] ClozeExplain.v2.tsx implements PassageDock
- [x] Evidence jumping works (scroll + highlight + fade)
- [x] Progressive disclosure (collapsed → expanded)
- [x] localStorage state persistence
- [x] XSS protection (sanitize all HTML)
- [x] Telemetry integration
- [x] Feature flag implemented
- [x] Tests written and passing
- [x] Documentation complete
- [ ] Manual testing (desktop + mobile)
- [ ] Screenshots attached
- [ ] Rollout plan confirmed

---

## 🚢 Ready for Review

This PR is ready for review and testing. Once validated:

1. Enable feature flag for beta users
2. Monitor telemetry and error rates
3. Collect feedback
4. Roll out to 100%
5. Apply pattern to remaining types

---

**Author**: Claude Code
**Date**: 2025-11-06
**Status**: Ready for Review
**Next**: ParagraphOrganizationExplain v2
