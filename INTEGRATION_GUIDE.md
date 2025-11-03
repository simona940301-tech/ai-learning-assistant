# 🔧 Integration Guide: Mobile UX Refinement

> **Quick Start**: Step-by-step guide to integrate the new mobile-optimized components

---

## 📋 Prerequisites

Ensure you have these files in place:

```
moonshot idea/
├── lib/
│   ├── theme.ts                          ✅ NEW
│   ├── contract-v2.ts                    ✅ EXISTS
│   └── heartbeat.ts                      ✅ EXISTS
├── components/
│   ├── ui/
│   │   └── Toast.tsx                     ✅ NEW
│   ├── ask/
│   │   ├── ExplanationCardV2.tsx         ✅ NEW
│   │   └── PastPaperMiniCard.tsx         ✅ NEW
│   └── providers/
│       └── ThemeProvider.tsx             ✅ NEW
└── app/
    ├── layout.tsx                        🔄 UPDATE
    └── (app)/ask/page.tsx                🔄 UPDATE
```

---

## Step 1: Update Root Layout

**File**: `app/layout.tsx`

```tsx
import { Inter } from 'next/font/google'
import ThemeProvider from '@/components/providers/ThemeProvider'
import ToastContainer from '@/components/ui/Toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          {/* Toast Container - renders all toasts */}
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Changes**:
- ✅ Wrap `{children}` with `<ThemeProvider>`
- ✅ Add `<ToastContainer />` at root level

---

## Step 2: Update Ask Page

**File**: `app/(app)/ask/page.tsx`

### 2.1 Import New Components

```tsx
// Replace old imports
- import ExplanationCard from '@/components/ask/ExplanationCard'
+ import ExplanationCardV2 from '@/components/ask/ExplanationCardV2'
+ import { useTheme } from '@/lib/theme'
+ import { withToastRetry, toast } from '@/components/ui/Toast'
+ import type { PastPaperDetail } from '@/components/ask/PastPaperMiniCard'
```

### 2.2 Add Theme Hook

```tsx
export default function AskPage() {
  const { theme } = useTheme()
  // ... existing state
```

### 2.3 Update Background Color

```tsx
// Replace hardcoded bg color with theme
return (
  <div
-   className="relative flex min-h-screen flex-col bg-[#0E1116] text-[#F1F5F9]"
+   className="relative flex min-h-screen flex-col"
+   style={{
+     backgroundColor: theme.bg,
+     color: theme.text,
+   }}
  >
```

### 2.4 Wrap API Calls with Toast

```tsx
// Example: Wrap detectAndWarmup
const handleSubmit = useCallback(async (value: string) => {
  if (!value.trim()) return

  try {
-   const warmupResponse = await detectAndWarmup(value)
+   const warmupResponse = await withToastRetry(
+     () => detectAndWarmup(value),
+     {
+       loadingMessage: '分析題目中...',
+       successMessage: '✅ 分析完成',
+       errorMessage: '分析失敗，請重試',
+     }
+   )

    // ... rest of logic
  } catch (error) {
-   alert('Error: ' + error.message)
+   // Error already handled by toast
  }
}, [detectAndWarmup])
```

### 2.5 Implement Past Paper Detail Loader

```tsx
// Add new function to load past paper details
const loadPastPaperDetail = useCallback(async (paperId: string): Promise<PastPaperDetail> => {
  // TODO: Replace with real API call
  // For now, return mock data
  return {
    id: paperId,
    stem: '下列何者為關係子句的正確用法？',
    summary: '本題考「關係子句—非限定用法」：逗號 + which 補充說明先行詞。',
    steps: [
      '先辨識句子主結構：The book is fascinating。',
      '找出關鍵逗號：逗號後接關係子句，代表非限定用法。',
      '檢查先行詞：先行詞是 the book（物），因此使用 which。',
    ],
    confidence: 0.92,
    difficulty: 'medium',
    tags: ['113學測', '文法', '關係子句'],
  }
}, [])

const handlePastPaperSave = useCallback((paperId: string) => {
  toast.success('已存入書包！')
  // TODO: Implement actual save logic
}, [])
```

### 2.6 Replace ExplanationCard with V2

```tsx
// Find all instances of <ExplanationCard and replace with:
<ExplanationCardV2
  question={state.currentQuestion.text}
  conceptLabel="關係子句"
  summary={state.explanation.summary}
  steps={state.explanation.steps}
  grammarRows={state.explanation.grammarTable}
  encouragement={state.explanation.encouragement}
  confidence={0.92}  // TODO: Get from Contract v2
  difficulty="medium" // TODO: Get from Contract v2
  pastPapers={[
    // TODO: Populate from real data
    {
      id: 'pp1',
      stem: '相關歷屆試題...',
      tags: ['113學測', '文法'],
    },
  ]}
  onPastPaperClick={loadPastPaperDetail}
  onPastPaperSave={handlePastPaperSave}
  onSave={handleSaveToBackpack}
  onRetry={handleRetry}
  onNext={handleBatchNext}
  isSaving={state.isLoading}
  isRetrying={false}
  isNextLoading={state.isLoading}
  savedStatus="idle"
  isLastStep={state.currentIndex === state.totalQuestions - 1}
/>
```

---

## Step 3: Update Global Styles

**File**: `app/globals.css`

Add theme transition support:

```css
/* Theme transitions */
* {
  transition-property: background-color, border-color, color;
  transition-duration: 250ms;
  transition-timing-function: ease-in-out;
}

/* Disable transitions on animations */
@keyframes {
  * {
    transition: none !important;
  }
}

/* Smooth scroll */
html {
  scroll-behavior: smooth;
}

/* Prevent layout shift */
body {
  overflow-x: hidden;
}

/* Custom scrollbar (dark mode) */
@media (prefers-color-scheme: dark) {
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #0E1116;
  }

  ::-webkit-scrollbar-thumb {
    background: #1F2937;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #374151;
  }
}

/* Custom scrollbar (light mode) */
@media (prefers-color-scheme: light) {
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #FFFFFF;
  }

  ::-webkit-scrollbar-thumb {
    background: #E2E8F0;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #CBD5E1;
  }
}
```

---

## Step 4: Test Checklist

### ✅ Desktop Testing

1. **Theme Switching**
   - [ ] Change OS theme (System Preferences > Appearance)
   - [ ] Verify app theme switches within 250ms
   - [ ] Check all colors update (bg, text, borders, shadows)

2. **Past Papers Section**
   - [ ] Click header to expand/collapse
   - [ ] Verify chevron rotation animation
   - [ ] Check empty state message
   - [ ] Click past paper card
   - [ ] Verify mini card opens smoothly
   - [ ] Click X to close

3. **Toast Messages**
   - [ ] Trigger API error (disconnect network)
   - [ ] Verify "網路稍慢，我再幫你試一次 🔄" appears
   - [ ] Reconnect network
   - [ ] Verify "✅ 已完成" appears
   - [ ] Check toast positioning (bottom-center)

### ✅ Mobile Testing (< 640px)

1. **Touch Interactions**
   - [ ] Tap Past Papers header (no hover state)
   - [ ] Tap past paper card
   - [ ] Verify mini card opens
   - [ ] See drag indicator at top
   - [ ] Swipe down 100px to close
   - [ ] Verify smooth close animation

2. **Mini Card Behavior**
   - [ ] Check max height ≤ 66vh
   - [ ] Verify body scroll locked
   - [ ] Tap backdrop to close
   - [ ] See "向下滑動關閉" hint
   - [ ] Verify scroll position maintained

3. **Responsive Layout**
   - [ ] Buttons stack vertically
   - [ ] Cards fit viewport width
   - [ ] Text remains readable
   - [ ] No horizontal scroll

---

## Step 5: Common Issues & Solutions

### Issue 1: Theme Not Switching

**Symptom**: Colors don't change when OS theme changes

**Solution**:
```tsx
// Ensure ThemeProvider is at root level
// Check browser console for errors
// Verify useTheme() is called inside ThemeProvider
```

### Issue 2: Toast Not Appearing

**Symptom**: No toast shown on API error

**Solution**:
```tsx
// Ensure ToastContainer is rendered
// Check z-index conflicts
// Verify withToastRetry() is wrapping API call
```

### Issue 3: Swipe Not Working

**Symptom**: Can't swipe down to close mini card

**Solution**:
```tsx
// Ensure Framer Motion is installed: npm install framer-motion
// Check drag props are set: drag="y" dragConstraints={{ top: 0, bottom: 0 }}
// Verify onDragEnd callback is firing
```

### Issue 4: Past Papers Always Empty

**Symptom**: "暫無相似歷屆" always shown

**Solution**:
```tsx
// Check pastPapers prop is populated
// Verify pastPapers.length > 0
// Check data structure matches PastPaper interface
```

---

## Step 6: Performance Optimization

### Lazy Load Mini Cards

```tsx
// Only load PastPaperMiniCard when needed
const PastPaperMiniCard = lazy(() => import('./PastPaperMiniCard'))

// Wrap in Suspense
<Suspense fallback={<div>載入中...</div>}>
  <PastPaperMiniCard ... />
</Suspense>
```

### Memoize Past Paper Click Handler

```tsx
const loadPastPaperDetail = useCallback(async (paperId: string) => {
  // ... implementation
}, [/* dependencies */])
```

### Debounce Theme Changes

```tsx
// Already handled in useTheme() hook
// No additional work needed
```

---

## Step 7: Accessibility Enhancements (Optional)

### Add ARIA Labels

```tsx
<button
  onClick={toggleExpand}
  aria-label={pastPapersExpanded ? "收合歷屆試題" : "展開歷屆試題"}
  aria-expanded={pastPapersExpanded}
>
  📘 歷屆試題
</button>
```

### Add Focus Styles

```css
/* Add to globals.css */
*:focus-visible {
  outline: 2px solid var(--theme-accent);
  outline-offset: 2px;
}
```

### Add Keyboard Navigation

```tsx
// Handle Escape key to close mini card
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectedPaper) {
      setSelectedPaper(null)
    }
  }

  window.addEventListener('keydown', handleEscape)
  return () => window.removeEventListener('keydown', handleEscape)
}, [selectedPaper])
```

---

## Step 8: Production Deployment

### Environment Variables

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.plms.ai
NEXT_PUBLIC_ENABLE_THEME_TOGGLE=true
NEXT_PUBLIC_ENABLE_HEARTBEAT=false  # Disable in prod
```

### Build & Test

```bash
# Build production bundle
npm run build

# Test production build locally
npm run start

# Check bundle size
npm run analyze  # If configured
```

### Performance Checklist

- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No console errors
- [ ] No memory leaks

---

## 📚 Additional Resources

### Documentation
- [MOBILE_UX_REFINEMENT.md](./MOBILE_UX_REFINEMENT.md) - Complete feature documentation
- [PLMS_SOLVE_TAB_REFINEMENT.md](./PLMS_SOLVE_TAB_REFINEMENT.md) - Contract v2 & Heartbeat
- [Framer Motion Docs](https://www.framer.com/motion/) - Animation library

### Component APIs
- `useTheme()` - Theme management hook
- `withToastRetry()` - API error handling wrapper
- `toast.*` - Manual toast triggering
- `ExplanationCardV2` - Main explanation component
- `PastPaperMiniCard` - Past paper detail overlay

### Debugging Tools
```bash
# Check Heartbeat status
curl http://localhost:3000/api/heartbeat | jq

# Test theme switching in DevTools
localStorage.setItem('theme', 'dark')
localStorage.setItem('theme', 'light')

# Monitor API calls
# Open DevTools > Network > Filter: Fetch/XHR
```

---

## ✅ Integration Complete!

You should now have:

✅ Mobile-optimized touch interactions
✅ Dynamic dark/light theme support
✅ Polished Past Papers section
✅ Unified toast error handling
✅ Smooth animations throughout

**Next Steps**:
1. Populate real past paper data
2. Connect to Contract v2 APIs
3. Test on actual mobile devices
4. Gather user feedback

---

**Questions or Issues?**
- Check [MOBILE_UX_REFINEMENT.md](./MOBILE_UX_REFINEMENT.md) for detailed specs
- Review component source code for inline documentation
- Test with Heartbeat API for system health

**Happy coding! 🚀**
