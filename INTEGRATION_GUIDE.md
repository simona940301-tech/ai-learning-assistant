# 🔌 Preview System Integration Guide

> How to integrate the Preview Flags Panel into your app

---

## Step 1: Add Panel to Root Layout

### Location: `app/layout.tsx`

```typescript
import { PreviewFlagsPanel } from '@/components/PreviewFlagsPanel'

export default function RootLayout({ children }: { children: React.Node }) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
        
        {/* Preview Flags Panel - Only shows in development */}
        <PreviewFlagsPanel />
      </body>
    </html>
  )
}
```

✅ **Done!** The panel will automatically:
- Only show in `NODE_ENV=development`
- Appear as floating 🎛️ button
- Load flags from sessionStorage
- Listen for keyboard shortcuts

---

## Step 2: Use Flags in Components

### Example: Conditional UI Based on Flags

```typescript
'use client'

import { usePreviewFlags } from '@/lib/preview-flags'

export function ExplanationCard() {
  const { flags } = usePreviewFlags()
  
  return (
    <div className="card">
      <h3>Explanation</h3>
      <p>Content here...</p>
      
      {/* Show single CTA if flag enabled */}
      {flags.single_cta ? (
        <button>Save to Backpack</button>
      ) : (
        <>
          <button>Save</button>
          <button>Practice More</button>
          <button>Share</button>
        </>
      )}
    </div>
  )
}
```

---

## Step 3: Use Logging in API Routes

### Example: Track API Performance

```typescript
import { logAnalytics, logSampler } from '@/lib/preview-logger'

export async function POST(request: Request) {
  const start = performance.now()
  
  // Your logic here
  const result = await processQuestion(data)
  
  const duration = performance.now() - start
  
  // Log to preview console
  logSampler('Question processed', {
    duration: `${duration.toFixed(2)}ms`,
    questionId: data.id,
    difficulty: result.difficulty
  })
  
  return NextResponse.json(result)
}
```

---

## Step 4: Add Analytics Events

### Example: Track User Actions

```typescript
import { logAnalytics } from '@/lib/preview-logger'

export function QuestionSubmit() {
  const handleSubmit = async () => {
    // Track the event
    logAnalytics('Question Submitted', {
      questionId: 'q123',
      source: 'ask_page',
      timestamp: Date.now()
    })
    
    // Continue with submission
    await submitQuestion()
  }
  
  return <button onClick={handleSubmit}>Submit</button>
}
```

---

## Step 5: Initialize Flags on App Load

### Location: `app/layout.tsx` or `_app.tsx`

```typescript
'use client'

import { useEffect } from 'react'
import { loadPreviewFlags, logPreviewFlags } from '@/lib/preview-flags'

export function RootLayout({ children }) {
  useEffect(() => {
    // Load flags from sessionStorage
    loadPreviewFlags()
    
    // Log flag status (development only)
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => logPreviewFlags(), 1000)
    }
  }, [])
  
  return <>{children}</>
}
```

---

## Complete Example: Ask Page

```typescript
'use client'

import { useState } from 'react'
import { usePreviewFlags } from '@/lib/preview-flags'
import { logAnalytics, logSampler } from '@/lib/preview-logger'

export default function AskPage() {
  const { flags } = usePreviewFlags()
  const [question, setQuestion] = useState('')
  
  const handleSubmit = async () => {
    // Track user action
    logAnalytics('Question Asked', {
      source: 'ask_page',
      length: question.length
    })
    
    // Use batch API if flag enabled
    if (flags.batch_api) {
      logSampler('Using batch API processing')
      await processBatch([question])
    } else {
      logSampler('Using sequential processing')
      await processSequential(question)
    }
  }
  
  return (
    <div>
      <h1>Ask a Question</h1>
      
      <textarea 
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      
      <button onClick={handleSubmit}>
        Submit
      </button>
      
      {/* Show preview indicator in dev */}
      {flags.batch1_5 && (
        <div className="dev-indicator">
          🎛️ Preview Mode: Batch 1.5
        </div>
      )}
    </div>
  )
}
```

---

## Testing Checklist

After integration:

- [ ] 🎛️ Panel shows in bottom-right (dev only)
- [ ] Panel opens on click
- [ ] Panel opens with `Ctrl+Shift+F`
- [ ] Flags can be toggled
- [ ] Page refresh applies flag changes
- [ ] Console shows color-coded logs
- [ ] Analytics events appear in console
- [ ] Sampler events appear in console
- [ ] Flags persist across page reloads
- [ ] Reset button works
- [ ] Export button downloads JSON

---

## Production Build

The preview system **automatically disabled** in production:

```typescript
// Panel only shows in development
if (process.env.NODE_ENV !== 'development') return null

// Logs only in development
if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') return
```

No need to remove code for production deployment!

---

## Summary

1. ✅ Add `<PreviewFlagsPanel />` to root layout
2. ✅ Use `usePreviewFlags()` hook in components
3. ✅ Use `logAnalytics()` and `logSampler()` for logging
4. ✅ Test with `npm run preview` or `bash scripts/preview.sh`
5. ✅ Deploy without changes (auto-disabled in production)

**You're ready to go! 🚀**
