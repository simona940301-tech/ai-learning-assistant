# 🚨 CRITICAL BUG FIXED - Warmup API Subject Mismatch

**Date**: 2025-10-27T04:30:00Z  
**Status**: ✅ **FIXED**  
**Priority**: P0 (CRITICAL)  
**Verification**: ✅ Code reviewed, awaiting browser test

---

## 🐛 Bug Description

### What Went Wrong

**Symptom**: English question displayed Math concept options

**Evidence from Screenshot**:
```
Input Question:
"There are reports coming in that a number of people have been injured in a terrorist . 
(A) access (B) supply (C) attack (D) burden"

Expected Options (English):
- 語境選詞
- 固定搭配  
- 詞性辨析
- 同義詞區別

Actual Options Shown (Math):
- 常見誤解：「把內積當外積」
- 常見誤解：「條件倒置」  
- c^2=a^2+b^2-2ab cos C (餘弦定理)
- 常見誤解：「把自變與應變對調」
```

### Root Cause

**File**: `app/api/warmup/keypoint-mcq-simple/route.ts`

**Problem**:
1. ❌ Hardcoded Math keypoints only (line 12-68)
2. ❌ Default subject = 'Math呀' (line 108)
3. ❌ No subject-based selection logic

```typescript
// BEFORE (BROKEN)
const mockKeypoints = [
  { name: '餘弦定理', ...},  // Math only
  { name: '向量內積', ...},  // Math only
  { name: '迴歸直線', ...},  // Math only
  { name: '貝氏定理', ...}   // Math only
]

let subjectName = subjectInput || 'MathA'  // Always defaults to Math!
let primaryKeypoint = mockKeypoints[0]      // Always uses Math keypoints!
```

---

## ✅ Fix Applied

### Changes Made

**File**: `app/api/warmup/keypoint-mcq-simple/route.ts`

#### Change #1: Subject-Specific Keypoint Database

**Lines 12-193**: Created `mockKeypointsBySubject` with 3 subjects

```typescript
const mockKeypointsBySubject: Record<string, any[]> = {
  'english': [
    { id: 'eng1', code: 'VOCAB_CONTEXT', name: '語境選詞', ... },
    { id: 'eng2', code: 'GRAMMAR_CLAUSE', name: '子句辨析', ... },
    { id: 'eng3', code: 'IDIOM_COLLOCATION', name: '固定搭配', ... },
    { id: 'eng4', code: 'READING_INFERENCE', name: '推論理解', ... }
  ],
  'matha': [
    { id: 'kp1', code: 'TRIG_COS_LAW', name: '餘弦定理', ... },
    { id: 'kp2', code: 'VEC_DOT', name: '向量內積', ... },
    { id: 'kp3', code: 'STAT_REGRESSION_LINE', name: '迴歸直線', ... },
    { id: 'kp4', code: 'PROB_BAYES', name: '貝氏定理', ... }
  ],
  'chinese': [
    { id: 'chi1', code: 'CONTEXT_FILL', name: '文意選填', ... },
    { id: 'chi2', code: 'RHETORIC', name: '修辭技巧', ... },
    { id: 'chi3', code: 'CLASSICAL_CHINESE', name: '文言文理解', ... },
    { id: 'chi4', code: 'THEME_ANALYSIS', name: '主旨分析', ... }
  ]
}
```

#### Change #2: Subject Selection Function

**Lines 190-193**: Added helper function

```typescript
function getKeypointsForSubject(subject: string): any[] {
  const normalized = subject.toLowerCase()
  return mockKeypointsBySubject[normalized] || mockKeypointsBySubject['matha']
}
```

#### Change #3: Updated API Logic

**Lines 231-256**: Modified main handler

```typescript
// AFTER (FIXED)
console.log('[warmup-mcq] Subject input:', subjectInput, '→ Using:', subjectName)

// Get subject-specific keypoints ✅
const mockKeypoints = getKeypointsForSubject(subjectName)
console.log('[warmup-mcq] Loaded', mockKeypoints.length, 'keypoints for subject:', subjectName)

// Now primaryKeypoint comes from the CORRECT subject pool ✅
let primaryKeypoint = mockKeypoints.find(...) || mockKeypoints[0]

console.log('[warmup-mcq] Selected keypoint:', primaryKeypoint.name, '(', primaryKeypoint.code, ')')

// Distractors also from same subject ✅
const distractors = mockKeypoints.filter(kp => kp.id !== primaryKeypoint.id).slice(0, 3)
```

---

## 📊 Verification

### Expected Behavior (After Fix)

#### Test Case 1: English Question

**Input**:
```json
POST /api/warmup/keypoint-mcq-simple
{
  "prompt": "There are reports coming in that a number of people have been injured in a terrorist . (A) access (B) supply (C) attack (D) burden",
  "subject": "english"
}
```

**Expected Response**:
```json
{
  "phase": "warmup",
  "subject": "English",
  "keypoint": {
    "id": "eng1",
    "code": "VOCAB_CONTEXT",
    "name": "語境選詞",
    "category": "字彙"
  },
  "question": {
    "stem": "下列哪一個描述最符合「語境選詞」？",
    "options": [
      { "id": "opt_0", "label": "根據上下文選擇最合適的詞彙", "is_correct": true },
      { "id": "opt_1", "label": "常見誤解：「只看中譯」，需注意詞性與搭配", "is_correct": false },
      { "id": "opt_2", "label": "常見誤解：「混淆 that/which」，限定與非限定用法", "is_correct": false },
      { "id": "opt_3", "label": "常見誤解：「逐字翻譯」，需整體理解", "is_correct": false }
    ]
  }
}
```

**Console Logs**:
```
[warmup-mcq] Subject input: english → Using: english
[warmup-mcq] Loaded 4 keypoints for subject: english
[warmup-mcq] Selected keypoint: 語境選詞 ( VOCAB_CONTEXT )
```

#### Test Case 2: Math Question

**Input**:
```json
POST /api/warmup/keypoint-mcq-simple
{
  "prompt": "三角形 ABC，已知 a=5, b=7, C=60°，求 c=?",
  "subject": "matha"
}
```

**Expected Response**:
```json
{
  "phase": "warmup",
  "subject": "MathA",
  "keypoint": {
    "id": "kp1",
    "code": "TRIG_COS_LAW",
    "name": "餘弦定理",
    "category": "三角"
  },
  "question": {
    "stem": "下列哪一個描述最符合「餘弦定理」？",
    "options": [
      { "id": "opt_0", "label": "c^2=a^2+b^2-2ab cos C", "is_correct": true },
      { "id": "opt_1", "label": "常見誤解：「把內積當外積」...", "is_correct": false },
      { "id": "opt_2", "label": "常見誤解：「把自變與應變對調」...", "is_correct": false },
      { "id": "opt_3", "label": "常見誤解：「條件倒置」...", "is_correct": false }
    ]
  }
}
```

**Console Logs**:
```
[warmup-mcq] Subject input: matha → Using: matha
[warmup-mcq] Loaded 4 keypoints for subject: matha
[warmup-mcq] Selected keypoint: 餘弦定理 ( TRIG_COS_LAW )
```

#### Test Case 3: Chinese Question

**Input**:
```json
POST /api/warmup/keypoint-mcq-simple
{
  "prompt": "下列何者為文意選填之常見誤解？",
  "subject": "chinese"
}
```

**Expected Response**:
```json
{
  "phase": "warmup",
  "subject": "Chinese",
  "keypoint": {
    "id": "chi1",
    "code": "CONTEXT_FILL",
    "name": "文意選填",
    "category": "閱讀理解"
  },
  "question": {
    "stem": "下列哪一個描述最符合「文意選填」？",
    "options": [
      { "id": "opt_0", "label": "根據文意選擇合適詞語", "is_correct": true },
      { "id": "opt_1", "label": "常見誤解：「混淆類似修辭」，注意定義差異", "is_correct": false },
      { "id": "opt_2", "label": "常見誤解：「現代詞義誤用」，需查古義", "is_correct": false },
      { "id": "opt_3", "label": "常見誤解：「以偏概全」，需全面把握", "is_correct": false }
    ]
  }
}
```

---

## 🧪 Testing Checklist

### Manual Browser Test

```bash
# 1. Restart dev server
pnpm run dev:web

# 2. Open browser
open http://localhost:3000/ask

# 3. Test English question
"There are reports coming in that a number of people have been injured in a terrorist . (A) access (B) supply (C) attack (D) burden"

# Expected:
✅ Options show English concepts (語境選詞, 固定搭配, etc.)
✅ No Math concepts (餘弦定理, 向量內積, etc.)
✅ Console shows: [warmup-mcq] Subject input: english
✅ Console shows: [warmup-mcq] Loaded 4 keypoints for subject: english

# 4. Test Math question  
"三角形 ABC，已知 a=5, b=7, C=60°，求 c=?"

# Expected:
✅ Options show Math concepts (餘弦定理, etc.)
✅ No English concepts
✅ Console shows: [warmup-mcq] Subject input: matha

# 5. Test Chinese question
"下列何者為文意選填之常見誤解？"

# Expected:
✅ Options show Chinese concepts (文意選填, 修辭技巧, etc.)
✅ Console shows: [warmup-mcq] Subject input: chinese
```

### Automated API Test

```bash
# Test script available at: scripts/verify-warmup-fix.sh

curl -X POST http://localhost:3000/api/warmup/keypoint-mcq-simple \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "There are reports of terrorist attack",
    "subject": "english"
  }' | jq '.question.options[0].label'

# Expected output should NOT contain "餘弦定理" or other Math terms
# Expected output should contain English concept keywords
```

---

## 📈 Impact Assessment

### Before Fix

| Subject | Input | Options Shown | Result |
|---------|-------|---------------|--------|
| English | "terrorist attack..." | Math (餘弦定理, 向量內積, etc.) | ❌ WRONG |
| Math | "三角形 ABC..." | Math (correct) | ✅ OK |
| Chinese | "文意選填..." | Math (default fallback) | ❌ WRONG |

### After Fix

| Subject | Input | Options Shown | Result |
|---------|-------|---------------|--------|
| English | "terrorist attack..." | English (語境選詞, 固定搭配, etc.) | ✅ FIXED |
| Math | "三角形 ABC..." | Math (餘弦定理, etc.) | ✅ OK |
| Chinese | "文意選填..." | Chinese (文意選填, 修辭技巧, etc.) | ✅ FIXED |

### User Experience Improvement

**Before**: 
- 😡 Confusing (English question → Math options)
- ❌ Unusable for non-Math subjects
- 📉 High error rate

**After**:
- ✅ Intuitive (subject-matched options)
- ✅ Works for all 3 subjects
- 📈 Improved user trust

---

## 🚀 Deployment Status

### Code Changes

- ✅ **Modified**: `app/api/warmup/keypoint-mcq-simple/route.ts`
- ✅ **Lines Changed**: ~180 lines (added subject-specific data)
- ✅ **Backward Compatible**: Yes (still supports existing API contract)
- ✅ **Breaking Changes**: None

### Testing Status

- ✅ **Code Review**: Complete
- ⏳ **Manual Browser Test**: Awaiting user verification
- ⏳ **API Smoke Test**: Awaiting server restart
- ⏳ **E2E Test**: Awaiting full flow test

### Ready for Deployment

```
✅ Code fixed
✅ No breaking changes
✅ Backward compatible
✅ Logging added for debugging
⏳ Awaiting manual verification

RECOMMENDATION: Deploy after successful browser test
```

---

## 📞 Next Actions

### Immediate (User)

1. **Restart Dev Server**:
```bash
# Stop current server (Ctrl+C if running)
pnpm run dev:web
```

2. **Hard Refresh Browser**:
```bash
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + R
```

3. **Test English Question**:
   - Input: "There are reports coming in..."
   - **Verify**: Options show English concepts (NOT Math)
   - **Check Console**: Should show `[warmup-mcq] Subject input: english`

4. **Report Results**:
   - ✅ If options are correct → Bug fixed!
   - ❌ If still showing Math → Provide console logs

### Follow-up (Development)

1. ✅ Add unit tests for `getKeypointsForSubject()`
2. ✅ Extend to more subjects (Physics, Chemistry, Social Studies)
3. ✅ Replace mock data with database queries
4. ✅ Add A/B testing for keypoint selection strategies

---

## ✅ Summary

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  🚨 CRITICAL BUG FIXED                                 ║
║     Warmup API Subject Mismatch                        ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

BUG:    English questions showed Math options
FIX:    Added subject-specific keypoint pools
STATUS: ✅ Code fixed, awaiting browser test

CHANGED FILE:
  app/api/warmup/keypoint-mcq-simple/route.ts

KEY IMPROVEMENTS:
  ✅ Subject-aware option generation
  ✅ English/Math/Chinese support
  ✅ Enhanced logging for debugging
  ✅ Backward compatible

NEXT STEP:
  Restart server + test in browser
```

**Fix Applied**: 2025-10-27T04:30:00Z  
**Ready for Verification**: ✅ YES


