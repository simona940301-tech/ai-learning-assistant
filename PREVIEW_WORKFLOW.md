# 🚀 PLMS Preview Workflow - Batch 1.5

> Local continuous preview setup for instant UI/API/performance testing

---

## ⚡ Quick Start

### Start Preview Mode
```bash
npm run preview
# or
pnpm preview
```

This will:
- ✅ Load Batch 1.5 feature flags
- ✅ Start Next.js dev server with HMR
- ✅ Auto-open browser at `http://localhost:3000`
- ✅ Enable verbose logging

---

## 🎛️ Feature Flags (Batch 1.5)

All flags are **automatically enabled** in preview mode:

| Flag | Description | Default |
|------|-------------|---------|
| `NEXT_PUBLIC_HOTFIX_BATCH1_5` | Master switch for Batch 1.5 | ✅ true |
| `NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA` | Single CTA button (simplified UX) | ✅ true |
| `NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY` | Smart difficulty matching | ✅ true |
| `NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API` | Parallel API processing | ✅ true |
| `NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF` | Optimized question sampling | ✅ true |

---

## 🔄 Toggle Flags Without Restart

### Method 1: Floating Control Panel (Recommended)

1. Start preview mode: `npm run preview`
2. Look for the 🎛️ button in bottom-right corner
3. Click to open control panel
4. Toggle flags on/off
5. Refresh page to apply changes

**Keyboard Shortcut**: `Ctrl + Shift + F` to open/close panel

### Method 2: Browser Console

```javascript
// Import the flag manager
import { updatePreviewFlags } from '@/lib/preview-flags'

// Toggle individual flags
updatePreviewFlags({ 
  single_cta: false,
  batch_api: true 
})

// Check current flags
import { getPreviewFlags } from '@/lib/preview-flags'
console.log(getPreviewFlags())

// Reset to defaults
import { resetPreviewFlags } from '@/lib/preview-flags'
resetPreviewFlags()
```

### Method 3: Edit .env.preview

```bash
# Edit the file
nano .env.preview

# Change flags
NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA=false

# Restart preview
npm run preview
```

---

## 📊 Check Analytics & Sampler Logs

### In Browser Console

```javascript
// View all logs
previewLogger.getLogs()

// Filter by type
previewLogger.getLogs({ level: 'analytics' })
previewLogger.getLogs({ level: 'sampler' })

// Get summary
previewLogger.summary()

// Export logs
previewLogger.export() // Downloads JSON file

// Clear logs
previewLogger.clear()
```

### Color-Coded Console Output

Logs are automatically color-coded:
- 🔍 **Debug** - Gray
- ℹ️ **Info** - Blue
- ⚠️ **Warning** - Yellow
- ❌ **Error** - Red
- 📊 **Analytics** - Purple
- 🎲 **Sampler** - Green

### Example Log Output

```
📊 [Analytics] User clicked "Solve Question"
  { questionId: "q123", source: "batch", timestamp: 1234567890 }

🎲 [Sampler] Selected 5 questions near difficulty 0.75
  { selected: [...], avgDifficulty: 0.73, processingTime: 45ms }
```

---

## 🔍 Verify Batch 1.5 Features Are Active

### 1. Check Flag Status

Open browser console and run:
```javascript
logPreviewFlags()
```

Expected output:
```
🎛️  Preview Flags Status
  Batch 1.5: ✅
  Single CTA: ✅
  Near Difficulty: ✅
  Batch API: ✅
  Sampler Perf: ✅
```

### 2. Visual Indicators

**Single CTA**:
- Look for simplified action buttons on explanation cards
- Should see only one primary CTA instead of multiple

**Near Difficulty**:
- Check console for sampler logs
- Should show difficulty matching algorithm in action

**Batch API**:
- Open Network tab
- Should see parallel API requests instead of sequential

**Sampler Performance**:
- Check processing time in console logs
- Should be < 100ms for question selection

---

## 🛠️ Using Preview Flags in Code

### React Component

```tsx
import { usePreviewFlags } from '@/lib/preview-flags'

export function MyComponent() {
  const { flags } = usePreviewFlags()
  
  if (flags.single_cta) {
    return <SingleCTAButton />
  }
  
  return <MultipleActions />
}
```

### API Route

```typescript
import { getPreviewFlags } from '@/lib/preview-flags'

export async function POST(request: Request) {
  const flags = getPreviewFlags()
  
  if (flags.batch_api) {
    // Use parallel processing
    return await processBatch(questions)
  }
  
  // Use sequential processing
  return await processSequential(questions)
}
```

### Logging Example

```typescript
import { logAnalytics, logSampler } from '@/lib/preview-logger'

// Track user action
logAnalytics('Question Solved', {
  questionId: 'q123',
  timeTaken: 45,
  correct: true
})

// Log sampler operation
logSampler('Difficulty matching complete', {
  targetDifficulty: 0.75,
  selectedCount: 5,
  processingTime: 32
})
```

---

## 📱 Hot Module Replacement (HMR)

HMR is **automatically enabled** in preview mode:

### What Updates Instantly?
- ✅ React components
- ✅ CSS/Tailwind classes
- ✅ TypeScript/JavaScript files
- ✅ API routes (after save)

### What Requires Refresh?
- ⚠️ Environment variables (need server restart)
- ⚠️ Next.js config (need server restart)
- ⚠️ Package.json changes (need npm install)

### Force Refresh
- **Soft**: Refresh browser (Cmd+R / Ctrl+R)
- **Hard**: Clear cache (Cmd+Shift+R / Ctrl+Shift+F5)
- **Full**: Restart preview mode (Ctrl+C, then `npm run preview`)

---

## 🎯 Testing Workflow

### 1. UI Hotfix Testing

```bash
# 1. Start preview
npm run preview

# 2. Open Ask page
# http://localhost:3000/ask

# 3. Make UI changes in code
# → Save file
# → See changes instantly

# 4. Toggle Single CTA flag
# → Open control panel (🎛️)
# → Toggle "Single CTA"
# → Refresh page
```

### 2. API Performance Testing

```bash
# 1. Start preview with Batch API enabled
npm run preview

# 2. Open browser console
# 3. Submit batch questions
# 4. Check logs:
logSampler.getLogs({ level: 'sampler' })

# 5. Verify parallel processing in Network tab
```

### 3. Difficulty Matching Testing

```bash
# 1. Enable Near Difficulty flag
# 2. Submit a question
# 3. Check console for sampler logs:
🎲 [Sampler] Selected 5 questions near difficulty 0.75
  { selected: [...], avgDifficulty: 0.73 }
```

---

## 🐛 Troubleshooting

### Port 3000 Already in Use

```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Restart preview
npm run preview
```

### Flags Not Applied

1. Check if `.env.preview` exists
2. Restart preview mode
3. Clear browser cache
4. Check console for flag status: `logPreviewFlags()`

### HMR Not Working

1. Check if file is in `node_modules/` (HMR doesn't work there)
2. Try hard refresh (Cmd+Shift+R)
3. Restart dev server

### Logs Not Showing

1. Check if `NEXT_PUBLIC_LOG_LEVEL=debug` in `.env.preview`
2. Open browser console (F12)
3. Make sure you're not filtering console output

---

## 📦 Files Created

```
.env.preview              # Feature flags configuration
scripts/preview.sh        # Bash startup script (Mac/Linux)
scripts/preview.js        # Node.js startup script (Windows)
lib/preview-flags.ts      # Flag management system
lib/preview-logger.ts     # Logging system
components/PreviewFlagsPanel.tsx  # Control panel UI
PREVIEW_WORKFLOW.md       # This file
```

---

## 🎓 Pro Tips

### 1. Persist Flags Across Sessions
Flags are stored in `sessionStorage`. Close tab to reset.

### 2. Export Logs for Analysis
```javascript
previewLogger.export() // Downloads JSON file
```

### 3. Quick Flag Check
```javascript
// One-liner to check all flags
logPreviewFlags()
```

### 4. Watch for Flag Changes
```javascript
window.addEventListener('preview-flags-changed', (e) => {
  console.log('Flags updated:', e.detail)
})
```

### 5. Performance Monitoring
```javascript
// Track processing time
const start = performance.now()
await processQuestions()
logSampler(`Processed in ${performance.now() - start}ms`)
```

---

## 🚀 Ready to Preview!

```bash
npm run preview
```

Then:
1. 🎛️ Click the floating panel to toggle flags
2. 📊 Check console for analytics/sampler logs
3. 🔄 Make changes and see them instantly
4. 🧪 Test all Batch 1.5 features

---

**Happy previewing! 🎉**

