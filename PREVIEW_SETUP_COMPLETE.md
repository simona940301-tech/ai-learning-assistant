# ✅ Preview Workflow Setup Complete!

> Local continuous preview for Batch 1.5 hotfix testing

---

## 🎉 What's Been Created

### 1. ✅ Environment Configuration
- **`.env.preview`** - Batch 1.5 flags (auto-created from your existing .env.local)
- **`.env.preview.example`** - Template for team members

### 2. ✅ Startup Scripts
- **`scripts/preview.sh`** - Mac/Linux startup script
- **`scripts/preview.js`** - Cross-platform Node.js script

### 3. ✅ Runtime Flag Toggle System
- **`lib/preview-flags.ts`** - Flag management (read/write/persist)
- **`components/PreviewFlagsPanel.tsx`** - Floating UI control panel

### 4. ✅ Logging System
- **`lib/preview-logger.ts`** - Color-coded console logs
- Analytics & Sampler log tracking
- Export/filter/summary capabilities

### 5. ✅ Documentation
- **`PREVIEW_WORKFLOW.md`** - Complete usage guide

---

## 🚀 How to Start Preview Mode

### Method 1: Using the Script (Recommended)
```bash
# Mac/Linux
bash scripts/preview.sh

# Or cross-platform
node scripts/preview.js
```

This will:
1. ✅ Load all Batch 1.5 flags from `.env.preview`
2. ✅ Start Next.js dev server
3. ✅ Auto-open browser at `http://localhost:3000`
4. ✅ Enable HMR (hot reload)

### Method 2: Manual Start
```bash
# Load environment
export $(cat .env.preview | grep -v '^#' | xargs)

# Start dev
npm run dev
```

---

## 🎛️ Toggle Flags WITHOUT Restart

### Option 1: Floating Control Panel

**After starting preview mode:**
1. Look for 🎛️ button in bottom-right corner
2. Click to open panel
3. Toggle any flag on/off
4. Refresh page to see changes

**Keyboard shortcut**: `Ctrl + Shift + F`

### Option 2: Browser Console
```javascript
// Toggle flags
updatePreviewFlags({ 
  single_cta: false,
  batch_api: true 
})

// Check current flags
logPreviewFlags()

// Reset to defaults
resetPreviewFlags()
```

---

## 📊 Check Analytics & Sampler Logs

### In Browser Console (F12)

```javascript
// View all logs
previewLogger.getLogs()

// Filter analytics logs
previewLogger.getLogs({ level: 'analytics' })

// Filter sampler logs
previewLogger.getLogs({ level: 'sampler' })

// Get summary
previewLogger.summary()

// Export as JSON
previewLogger.export()
```

### Watch Live Logs

Console automatically shows:
- 📊 **Analytics events** (purple)
- 🎲 **Sampler operations** (green)
- ⚠️ **Warnings** (yellow)
- ❌ **Errors** (red)

---

## 🧪 Verify Batch 1.5 Features

### 1. Check Flag Status
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

### 2. Test Each Feature

**Single CTA:**
- Go to `/ask` page
- Submit a question
- Look for simplified action buttons

**Near Difficulty:**
- Check console for: `🎲 [Sampler] Selected questions near difficulty X`

**Batch API:**
- Open Network tab
- Submit batch questions
- Verify parallel requests

**Sampler Performance:**
- Check logs for processing time
- Should be < 100ms

---

## 🔄 Hot Module Replacement (HMR)

**Updates instantly** (no refresh needed):
- ✅ React components (.tsx, .jsx)
- ✅ CSS/Tailwind styles
- ✅ TypeScript/JavaScript files

**Requires refresh**:
- ⚠️ Environment variables
- ⚠️ Flag changes (refresh page)
- ⚠️ API routes (auto-reload after save)

---

## 💡 Pro Tips

### 1. Keep Console Open
Press `F12` to open DevTools and see real-time logs

### 2. Use the Floating Panel
Click 🎛️ in bottom-right to quickly toggle flags

### 3. Monitor Performance
```javascript
// Track processing time
performance.mark('start')
await yourFunction()
performance.mark('end')
performance.measure('duration', 'start', 'end')
```

### 4. Export Logs for Analysis
```javascript
previewLogger.export() // Downloads JSON file
```

---

## 📁 File Structure

```
.env.preview                        # Your flags (gitignored)
.env.preview.example                # Team template

scripts/
├── preview.sh                      # Mac/Linux startup
└── preview.js                      # Cross-platform startup

lib/
├── preview-flags.ts                # Flag management
└── preview-logger.ts               # Logging system

components/
└── PreviewFlagsPanel.tsx           # UI control panel

PREVIEW_WORKFLOW.md                 # Complete guide
PREVIEW_SETUP_COMPLETE.md           # This file
```

---

## 🐛 Troubleshooting

### Port 3000 in use
```bash
# Kill process
lsof -ti:3000 | xargs kill -9

# Restart
bash scripts/preview.sh
```

### Flags not applying
1. Check `.env.preview` exists
2. Restart preview mode
3. Hard refresh browser (Cmd+Shift+R)

### Panel not showing
1. Check you're in development mode
2. Look for 🎛️ button in bottom-right
3. Try keyboard shortcut: Ctrl+Shift+F

---

## 🎓 Next Steps

### 1. Start Preview
```bash
bash scripts/preview.sh
```

### 2. Open Browser
Auto-opens to `http://localhost:3000`

### 3. Enable Control Panel
Click 🎛️ button or press `Ctrl+Shift+F`

### 4. Make Changes
Edit any file → Save → See changes instantly

### 5. Monitor Logs
Open console (F12) → See color-coded logs

---

## 📖 Full Documentation

See **`PREVIEW_WORKFLOW.md`** for:
- Detailed flag descriptions
- Code examples
- Advanced logging
- Testing workflows
- Best practices

---

## ✨ You're All Set!

**Start previewing:**
```bash
bash scripts/preview.sh
```

Then:
- 🎛️ Toggle flags with floating panel
- 📊 Monitor logs in console
- 🔄 Make changes and see them instantly
- 🧪 Test all Batch 1.5 features

---

**Questions?** Check `PREVIEW_WORKFLOW.md` for complete guide!

