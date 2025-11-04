# E6/E7 Detection Fix Summary

## Problem Identified

E6 (篇章結構) questions were being misclassified as E4 or FALLBACK due to flawed sentence detection logic in the router.

### User's Sample Question
```
Antoine de Saint-Exupèry's tale... (1) ... (2) ... (3) ... (4) ... (5)

Options:
(A) there are probably a few things you may not know about this story
(B) Saint-Exupèry was stuck in a hospital while he recovered from various injuries
(C) During an attempt to break the record for the fastest trip between Paris and Saigon
(D) Another anecdote(軼事) about The Little Prince is a common theory
(E) Saint-Exupery was celebrated as a brave pilot
```

**Expected:** E6 (Paragraph Organization)
**Actual before fix:** FALLBACK
**Root cause:** Sentence detection failed because options didn't end with punctuation AND some started with lowercase letters.

---

## Root Cause Analysis

### 1. Sentence Detection Flaw ([router.ts:54-71](apps/web/lib/english/router.ts#L54-L71))

**Before Fix:**
```typescript
const choicesAreFullSentences = optionTexts.some((text) => {
  const wordCount = text.split(/\s+/).length
  const hasPunctuation = /[.!?。！？]$/.test(text.trim())
  const startsWithCapital = /^[A-Z]/.test(text.trim())
  return (wordCount >= 8 || hasPunctuation) && startsWithCapital  // ❌ Too strict
})
```

**Issues:**
- Required BOTH `(wordCount >= 8 OR punctuation)` AND `startsWithCapital`
- Option A starts with lowercase "there" → failed detection
- Options don't end with punctuation → failed for some checks
- Result: `choicesShape = 'unknown'` instead of `'sentences'`

### 2. E6 Detection Guard ([router.ts:129-150](apps/web/lib/english/router.ts#L129-L150))

The E6 detector requires:
- `choicesShape === 'sentences'` ✅
- `sentenceRatio >= 0.5` ❌ (was 0 because sentence detection failed)

Result: E6 detection failed → fell through to FALLBACK

---

## Solution Implemented

### 1. Enhanced Sentence Detection

**After Fix:**
```typescript
const choicesAreFullSentences = optionTexts.some((text) => {
  const wordCount = text.split(/\s+/).length
  const hasPunctuation = /[.!?。！？]$/.test(text.trim())
  const hasClauseStructure = /\b(who|which|that|when|where|while|because|although|if)\b/i.test(text)

  // E6 sentences: typically 8+ words, may not end with punctuation
  // E7 phrases: typically ≤5 words, simple words/phrases
  return wordCount >= 8 || hasPunctuation || hasClauseStructure
})
```

**Improvements:**
- ✅ Removed `startsWithCapital` requirement (too strict for E6)
- ✅ Added `hasClauseStructure` detection (who/which/that/when/where/while/because/although/if)
- ✅ Lowered threshold: 8+ words OR punctuation OR clause structure
- ✅ Now correctly identifies E6 sentence options

### 2. Updated E6 Internal Sentence Count

```typescript
const sentenceCount = optionTexts.filter((text) => {
  const wordCount = text.split(/\s+/).length
  const hasPunctuation = /[.!?。！？]$/.test(text.trim())
  const hasClauseStructure = /\b(who|which|that|when|where|while|because|although|if)\b/i.test(text)

  return wordCount >= 8 || hasPunctuation || hasClauseStructure
}).length
```

Now correctly counts 4 out of 5 options as sentences (80% ratio) → E6 detection passes!

### 3. Enhanced E6 Template Prompt ([templates.ts:273-315](apps/web/lib/english/templates.ts#L273-L315))

**Improvements:**
- ✅ Dynamic blank count in prompt: `共${blankCount}個空格`
- ✅ Dynamic option range: `answer 欄位必須是單一字母（${optionKeys}）`
- ✅ Explicit requirement: `必須為全部${blankCount}個空格提供答案（blankIndex: 1 到 ${blankCount}）`
- ✅ Better examples showing 2 items in array
- ✅ Fallback handling if LLM returns incomplete data

### 4. Answer Validation & Fallback ([templates.ts:338-352](apps/web/lib/english/templates.ts#L338-L352))

```typescript
// Ensure we have answers for all blanks
if (answers.length < blankCount) {
  console.warn(`[E6 Template] Expected ${blankCount} answers, got ${answers.length}. Filling missing blanks with fallbacks.`)
  for (let i = answers.length; i < blankCount; i++) {
    answers.push({
      blankIndex: i + 1,
      answer: '',
      answerZh: '',
      connection: '此題以語意場域＋主題句承接為主。',
      reason: '選項符合上下文邏輯。',
      evidence: '',
    })
  }
}
```

### 5. Option Key Support A-J

```typescript
// Support A-J for options (E6 typically has 4-6, but E7 can have up to 10)
const answer = String(a.answer || '').trim().match(/^([A-J])/i)?.[1]?.toUpperCase() || ''
```

---

## Test Results

### Detection Tests: ✅ 6/6 Passed

```
✅ E6: User Sample - Little Prince → E6 (0.9 confidence)
✅ E6: Typical paragraph organization → E6 (0.9 confidence)
✅ E7: Vocabulary cloze with numbered blanks → E7 (0.9 confidence)
✅ E7: Short phrase options → E7 (0.9 confidence)
✅ E4: Reading comprehension with Q1/Q2 → E4 (0.86 confidence)
✅ E1: Single vocabulary question → E1 (0.8 confidence)
```

### User's Question Now Correctly Detected

**Before:**
```
Type: FALLBACK
Confidence: 0.5
Reason: 有編號空格但不符合 E6/E7 條件
```

**After:**
```
Type: E6
Confidence: 0.9
Reason: 篇章結構（編號空格＋完整句子選項）
```

---

## Files Modified

1. **[apps/web/lib/english/router.ts](apps/web/lib/english/router.ts)**
   - Lines 51-78: Enhanced sentence detection logic
   - Lines 129-150: Updated E6 internal sentence count

2. **[apps/web/lib/english/templates.ts](apps/web/lib/english/templates.ts)**
   - Lines 269-315: Enhanced E6 prompt with dynamic blank count
   - Lines 325-352: Added answer validation and fallback handling
   - Line 358: Updated regex to support A-J options

3. **Test Scripts Created:**
   - `scripts/test-e6-detection.ts` - Basic E6 detection test
   - `scripts/test-e6-e7-comprehensive.ts` - Comprehensive test suite (6 cases)
   - `scripts/test-e6-full-pipeline.ts` - End-to-end pipeline test

---

## Key Improvements

### Detection Accuracy
- ✅ E6 questions with 8+ word options now correctly classified
- ✅ E6 questions without ending punctuation now correctly classified
- ✅ E6 questions with lowercase starting options now correctly classified

### Template Quality
- ✅ Prompts now explicitly state number of blanks required
- ✅ Dynamic option key ranges (A-E, A-F, etc.)
- ✅ Fallback handling for incomplete LLM responses
- ✅ Better validation and error messages

### Robustness
- ✅ No false positives: E7 still correctly detected (words/phrases)
- ✅ No false positives: E4 still correctly detected (Q1/Q2 format)
- ✅ No false positives: E1 still correctly detected (single vocab)

---

## Next Steps

The router now correctly handles:
- ✅ E1: Vocabulary (single blank + word options)
- ✅ E6: Paragraph organization (numbered blanks + sentence options)
- ✅ E7: Contextual completion (numbered blanks + word/phrase options)
- ✅ E4: Reading comprehension (passage + Q1/Q2)

The fix is **backward compatible** and does not break existing question types.

---

## Testing Your Question

To test with your specific question:

```bash
npx tsx scripts/test-e6-detection.ts
```

Expected output:
```
✅ SUCCESS: Correctly detected as E6
Type: E6
Confidence: 0.9
Reason: 篇章結構（編號空格＋完整句子選項）
```

---

**Status:** ✅ Issue resolved
**Verified:** User's sample question now correctly classified as E6
**Test coverage:** 6/6 comprehensive tests passing
