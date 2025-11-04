# Subject Detection & Route Fix - Summary

## Overview
Fixed subject detection routing and syntax errors in the PLMS web app, ensuring English questions route to English options and Math questions route to Math options.

## Changes Made

### A. Code Fixes

#### A1. Fixed `/app/api/solve-simple/route.ts` Syntax Error (Line 141)
**Before:**
```typescript
const { createSolveResponse, type Subject } = await import('@/lib/contract-v2')
```

**After:**
```typescript
import type { Subject } from '@/lib/contract-v2'
// ...
const { createSolveResponse } = await import('@/lib/contract-v2')
```

**Issue:** Cannot use `type` inside dynamic import destructuring.
**Solution:** Move type import to top-level static import.

#### A2. Created Robust Subject Detection (`/lib/ai/detectSubject.ts`)
New module implementing heuristic-based subject classification:

```typescript
export type SubjectKind = 'english' | 'math' | 'chinese' | 'unknown';

export function detectSubject(text: string): SubjectKind {
  // Character frequency analysis
  // Keyword detection (cos, sin, grammar, imagery, etc.)
  // Ratio-based scoring
  // Returns subject with safe English fallback
}
```

**Key Features:**
- Character frequency analysis (English letters, math operators, Han characters)
- Hard keyword hints (trigonometry, grammar, imagery terms)
- Safe fallback to English (prevents Math overreach)
- Pure function, no LLM calls

#### A3. Updated Router to Use Subject Detection
Modified [route.ts:112-120](app/api/solve-simple/route.ts#L112-L120):

```typescript
// Detect subject from prompt if not explicitly provided
let subjectName = subjectInput || 'MathA'
if (promptInput && !subjectInput) {
  const detectedKind = detectSubject(promptInput)
  subjectName = mapSubjectToContract(detectedKind)
  console.log('[subject detected]', detectedKind, '→', subjectName)
}
```

**Behavior:**
- English text → English (Contract v2 format)
- Math formulas/symbols → MathA
- Chinese high-ratio → Chinese
- Unknown/ambiguous → English (safe fallback)
- Logs detection for debugging

#### A4. Template Mapping
Added helper functions:
- `mapSubjectToContract(kind)` - Maps to Contract v2 Subject format
- `getTemplateForSubject(kind)` - Returns MCQ template identifier

#### A5. Silenced Favicon 404
Created [public/favicon.svg](public/favicon.svg) with book emoji to prevent dev console noise.

---

### B. Tests

#### B1. Unit Tests - Subject Detection (`/tests/subject-detection.spec.ts`)
✅ **23 tests passing**

Test coverage:
- English MCQ with imagery passages
- English grammar and cloze tests
- Math cosine law questions
- Math with trigonometry, vectors, geometry
- Chinese text questions
- Edge cases (empty, null, unknown)
- Contract mapping functions
- Template selection

**Example fixtures:**
```typescript
const EN_Q = `Imagery is found throughout literature... Which best describes imagery?`
const MATH_Q = `下列哪一個描述最符合「餘弦定理」？ A) c^2=a^2+b^2-2ab cos C`
const ZH_Q = `下列何者為文意選填之常見誤解？請選出最合適的選項。`
```

#### B2. Router Unit Tests (`/tests/router-subject.spec.ts`)
✅ **9 tests passing**

Test coverage:
- English → english-mcq template
- Math → math-mcq template
- Chinese → chinese-mcq template
- Unknown → english-mcq fallback
- Mixed content prioritization
- Safety and fallback behavior

#### B3. Integration Tests (`/tests/solve-simple.integration.spec.ts`)
✅ **12 tests passing**

Test coverage:
- Full API route handler testing
- English question detection and processing
- Math question detection and processing
- Subject logging verification
- Error handling (400 for invalid requests)
- Contract v2 compliance validation
- Mode variations (step/fast)

**Key assertions:**
- Response status 200
- Correct subject detection
- Contract v2 structure compliance
- Console logging format
- No math symbols in English responses

#### B4. Test Scripts
Added to [package.json](package.json):
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:subject": "vitest run -t subject",
    "test:all": "vitest run"
  }
}
```

---

## Acceptance Criteria - ✅ All Met

### ✅ Tests Pass
```bash
pnpm test:all
# Test Files  3 passed (3)
# Tests      44 passed (44)
```

Breakdown:
- subject-detection.spec.ts: 23 tests ✅
- router-subject.spec.ts: 9 tests ✅
- solve-simple.integration.spec.ts: 12 tests ✅

### ✅ Behavior Verification
- English questions → English options (no formula tokens)
- Math cosine-law question → Math options
- Console logs: `[subject detected] english|math|chinese`
- No syntax error in route.ts
- Favicon 404 silenced in dev

### ✅ Type Safety
- All imports TypeScript-compliant
- No malformed dynamic imports
- Type guards for Subject validation

---

## Files Modified

### New Files
1. `/lib/ai/detectSubject.ts` - Subject detection module
2. `/tests/subject-detection.spec.ts` - Unit tests
3. `/tests/router-subject.spec.ts` - Router tests
4. `/tests/solve-simple.integration.spec.ts` - Integration tests
5. `/vitest.config.ts` - Vitest configuration
6. `/public/favicon.svg` - Favicon placeholder

### Modified Files
1. `/app/api/solve-simple/route.ts` - Fixed syntax, added detection
2. `/package.json` - Added vitest, test scripts

---

## How to Run

### Run All Tests
```bash
pnpm test:all
```

### Run Subject-Specific Tests
```bash
pnpm test:subject
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Test a Specific File
```bash
pnpm vitest run tests/subject-detection.spec.ts
```

---

## Test Examples

### Example 1: English Detection
```typescript
POST /api/solve-simple
{
  "prompt": "Imagery is found throughout literature...",
  "mode": "step"
}
// Console: [subject detected] english → English
// Response: { subject: "English", ... }
```

### Example 2: Math Detection
```typescript
POST /api/solve-simple
{
  "prompt": "已知三角形兩邊為 a=3, b=4，夾角 θ=60°，求第三邊 c",
  "mode": "step"
}
// Console: [subject detected] math → MathA
// Response: { subject: "MathA", ... }
```

### Example 3: Explicit Subject (No Detection)
```typescript
POST /api/solve-simple
{
  "prompt": "Any text",
  "subject": "MathA",
  "mode": "step"
}
// Console: [subject provided] MathA
// Response: { subject: "MathA", ... }
```

---

## Technical Notes

### Detection Algorithm
1. **Character Analysis**
   - Count English letters, math operators, Han characters
   - Calculate ratios relative to text length

2. **Hard Keyword Matching**
   - Math: `cos`, `sin`, `θ`, `△`, `餘弦`, `向量`
   - English: `grammar`, `imagery`, `vocabulary`, `passage`
   - Chinese: High Han character ratio (>40%)

3. **Scoring & Fallback**
   - If English score > 0.3 and > math score → English
   - If math score > 0.18 and >= English score → Math
   - Unknown → English (prevents math overreach)

### Template Routing
- `english-mcq` → English options (text-based)
- `math-mcq` → Math options (formulas, numeric)
- `chinese-mcq` → Chinese options

### Safe Fallback Strategy
When detection is uncertain, the system defaults to English instead of Math to avoid showing formula options for English questions (which was the original bug).

---

## Next Steps (Optional)

1. **Enhance Detection**
   - Add more keywords for edge cases
   - Tune ratio thresholds based on production data
   - Add confidence scoring

2. **Template Creation**
   - Create actual template files if needed:
     - `/prompts/templates/subject/english-mcq.txt`
     - `/prompts/templates/subject/math-mcq.txt`
     - `/prompts/templates/subject/chinese-mcq.txt`

3. **Monitoring**
   - Track detection accuracy in production
   - Log misclassifications for training data
   - Add telemetry for subject distribution

---

## Conclusion

All issues resolved:
- ✅ Syntax error fixed
- ✅ Subject detection robust and tested
- ✅ Router uses detection with safe fallback
- ✅ 44 tests passing
- ✅ Favicon 404 silenced
- ✅ Console logging for debugging

The system now correctly routes English questions to English options and Math questions to Math options, with comprehensive test coverage to prevent regressions.
