# TARS+KCE English Explanation Engine

## ✅ Implementation Complete

The new TARS+KCE (Type-Agnostic Recognition System + Knowledge-Context Explanation) engine has been successfully implemented, replacing the legacy English question type detection and explanation pipeline.

## 🎯 Core Architecture

### 1. **Shared Types** (`apps/web/lib/types.ts`)
- `ExplainMode`: `'fast' | 'deep'`
- `ExplainKind`: `'vocab' | 'fill-in-cloze' | 'sentence-completion' | 'discourse' | 'reading' | 'translation' | 'essay' | 'hybrid'`
- `ExplainViewModel`: Unified view model with mode-specific fields

### 2. **TARS Detector** (`apps/web/lib/ai/tars.ts`)
- Detects question type from input text
- Returns `kind`, `confidence`, and `signals`
- Uses GPT-4o-mini for classification

### 3. **KCE Explainer** (`apps/web/lib/ai/kce.ts`)
- Generates explanations based on detected kind and mode
- **Fast mode**: Returns only `answer` + `briefReason` (≤25 chars)
- **Deep mode**: Returns full structured explanation with all kind-specific fields

### 4. **Explain Orchestrator** (`apps/web/lib/ai/explain.ts`)
- Coordinates TARS detection and KCE explanation
- Ensures required fields are present

### 5. **API Route** (`apps/web/app/api/explain/route.ts`)
- Accepts `{ input: { text?, imageUrl? }, mode: 'fast' | 'deep' }`
- Returns `ExplainViewModel`

## 🎨 UI Components

### **ExplainCardV2** (`apps/web/components/solve/ExplainCardV2.tsx`)
- Two-stage loading messages: "正在分析題型…" → "正在生成詳解…"
- Typewriter animation for smooth text rendering
- Mode toggle (Fast/Deep)
- Fast mode: Minimal output (answer + brief reason)
- Deep mode: Full structured explanation

### **Typewriter Component** (`apps/web/components/solve/Typewriter.tsx`)
- Smooth character-by-character animation
- Configurable speed (default: 30ms per character)

### **Kind Presenters** (`apps/web/components/solve/explain/`)
- `VocabPresenter.tsx`: Translation + full explanation + distractor notes
- `ReadingPresenter.tsx`: Full explanation + evidence blocks (≤3) with scroll/highlight hooks

## 📊 Telemetry

Events tracked:
- `explain.request`: `{ mode, input_len }`
- `explain.render`: `{ mode, kind, latency_ms }`
- `explain.mode_change`: `{ from, to, kind }`

## 🔄 Migration Path

1. **Legacy router** (`apps/web/lib/english/router.ts`) marked as deprecated
2. **New router** (`apps/web/lib/english/router-v2.ts`) provides `explainViaAPI()` helper
3. **ExplainCardV2** can be used alongside legacy `ExplainCard` for gradual migration

## 🚀 Usage

```tsx
import ExplainCardV2 from '@/components/solve/ExplainCardV2'

<ExplainCardV2
  inputText="He raised an interesting ( ) ... (A) notion (B) candidate"
  mode="fast"
  onModeChange={(mode) => console.log('Mode changed:', mode)}
/>
```

## 📝 Next Steps (Optional)

1. **Supabase Preference** (already designed):
   - Create `user_explain_pref` table
   - Implement `getUserExplainMode()` and `setUserExplainMode()`

2. **Additional Kind Presenters**:
   - `FillInClozePresenter.tsx`
   - `SentenceCompletionPresenter.tsx`
   - `DiscoursePresenter.tsx`
   - `TranslationPresenter.tsx`
   - `EssayPresenter.tsx`
   - `HybridPresenter.tsx`

3. **Integration**:
   - Update `AnySubjectSolver` to use `/api/explain` for English questions
   - Gradually migrate from legacy `ExplainCard` to `ExplainCardV2`

## ✨ Features

- ✅ Minimalist UI with airy spacing
- ✅ Markdown-ready output
- ✅ Two-mode intelligent explanations
- ✅ Smooth typing animation
- ✅ Preserved scroll/highlight behavior for reading questions
- ✅ No register-level hints, progressive disclosure, 3D tags, or reason-picker
- ✅ Fast mode: Instant answer (≤25 chars reason)
- ✅ Deep mode: Comprehensive structured explanation

## 🎯 Result

The new engine provides a unified, minimal, high-speed pipeline with two-mode intelligent explanations and a smooth, chat-like generation experience.

