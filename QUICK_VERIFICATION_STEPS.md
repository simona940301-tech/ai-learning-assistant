# Quick Verification Steps - Warmup Elimination

## 5-Minute Verification Guide

### Step 1: Start the Server (if not running)
```bash
cd "/Users/simonac/Desktop/moonshot idea"
pnpm run dev:web
```

Wait for: `✓ Ready in XXXXms`

---

### Step 2: Test Backend (CLI)
```bash
# Test warmup endpoint (should return 410)
curl -X POST http://localhost:3000/api/warmup/keypoint-mcq-simple \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

**Expected Output**:
```json
{"error":"Warmup flow has been deprecated. Use /api/solve instead."}
```
**Expected HTTP Status**: `410` ✅

---

### Step 3: Test Frontend (Browser)

1. **Open Browser**:
   - Navigate to: `http://localhost:3000/ask`

2. **Open DevTools** (F12 or Cmd+Option+I):

3. **Clear Cache First** (IMPORTANT):
   - Go to **Application** tab
   - Click **Clear site data** button
   - Unregister any Service Workers
   - Hard Reload: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)

4. **Check Console Tab**:

   **Must See** ✅:
   ```
   ✅ [API Guard] Global fetch guard installed
   ✅ [ForceSolver] Solver-only mode active
   ✅ Guard: hard=english chosen=english
   ✅ Any-Subject Solver ready in solve mode
   ```

   **Must NOT See** ❌:
   ```
   [warmup-mcq] Subject input:...
   [warmup-mcq] Loaded X keypoints...
   下列哪一個描述最符合...
   ```

5. **Check Network Tab**:
   - Click **Network** tab
   - Type a test question and submit
   - Look for requests:
     - ✅ Should see: `/api/ai/route-solver` or `/api/exec/*`
     - ❌ Should NOT see: `/api/warmup/keypoint-mcq-simple`
     - ✅ `/favicon.ico` should return `200 OK` (not 404)

6. **Check UI**:

   **Must See** ✅:
   - Explanation card at the top (詳解卡片)
   - Three action chips below:
     - 📚 觀念框架 (Concept Framework)
     - 🎯 類似題 (Similar Questions)
     - 📌 關鍵提示 (Key Hints)
   - Input dock at the bottom

   **Must NOT See** ❌:
   - MCQ question stem: "下列哪一個描述最符合「...」"
   - Radio buttons with options A/B/C/D
   - "Warmup" mode indicator

---

### Step 4: Automated Verification (Optional)

Run the automated test script:

```bash
./scripts/verify-solver-only.sh
```

**Expected Output**:
```
🔍 Verifying Solver-Only Mode
==============================

1️⃣  Checking warmup endpoints are blocked...
Testing: Warmup POST should return 410... ✅ PASS (HTTP 410)
Testing: Warmup GET should return 410... ✅ PASS (HTTP 410)

2️⃣  Checking solver endpoints are accessible...
Testing: Health endpoint should work... ✅ PASS (HTTP 200)
Testing: Heartbeat endpoint should work... ✅ PASS (HTTP 200)

3️⃣  Summary
Passed: 4
Failed: 0

✅ All checks passed! Solver-only mode is active.
```

---

## Troubleshooting

### Problem: Still seeing MCQ UI with warmup questions

**Solution**:
1. Verify you're running from the correct directory:
   ```bash
   pwd  # Should show: /Users/simonac/Desktop/moonshot idea
   ```

2. Kill all dev servers and restart:
   ```bash
   pkill -f "next dev"
   pkill -f "turbo"
   rm -rf apps/web/.next
   pnpm run dev:web
   ```

3. Clear browser cache completely:
   - DevTools → Application → Clear site data
   - Unregister all Service Workers
   - Hard reload (Cmd+Shift+R)

### Problem: Warmup endpoint returns 200 instead of 410

**Solution**:
1. Check you edited the correct file:
   ```bash
   head -5 apps/web/app/api/warmup/keypoint-mcq-simple/route.ts
   ```

   Should show:
   ```typescript
   // HARD-KILL: Legacy warmup API has been deprecated
   // All flows must use /api/solve instead
   import { NextResponse } from 'next/server';
   ```

2. Restart the dev server (see above)

### Problem: Console shows "Cannot find module '@/lib/api-client'"

**Solution**:
```bash
# Verify file exists
ls -la apps/web/lib/api-client.ts

# If missing, copy from root:
cp lib/api-client.ts apps/web/lib/api-client.ts

# Restart dev server
```

### Problem: Console shows "Cannot find module 'AnySubjectSolver'"

**Solution**:
```bash
# Verify file exists
ls -la apps/web/components/ask/AnySubjectSolver.tsx

# If missing, copy from root:
cp components/ask/AnySubjectSolver.tsx apps/web/components/ask/AnySubjectSolver.tsx

# Restart dev server
```

---

## Quick Reference: Key Files

All changes are in `apps/web/` (NOT the root directories):

| File | Purpose |
|------|---------|
| `apps/web/app/api/warmup/keypoint-mcq-simple/route.ts` | Returns 410 for all warmup requests |
| `apps/web/app/(app)/ask/page.tsx` | Uses AnySubjectSolver + API guards |
| `apps/web/components/ask/AnySubjectSolver.tsx` | New solver-only UI component |
| `apps/web/lib/api-client.ts` | API guard system (blocks warmup) |
| `apps/web/app/layout.tsx` | Favicon metadata |
| `apps/web/public/favicon.ico` | Favicon file |

---

## Success Checklist

- [ ] Dev server starts without errors
- [ ] `curl` test returns 410 for warmup endpoint
- [ ] Browser console shows `[ForceSolver] Solver-only mode active`
- [ ] Browser console shows `[API Guard] Global fetch guard installed`
- [ ] Browser console does NOT show `[warmup-mcq]` logs
- [ ] Network tab does NOT show `/api/warmup/*` requests
- [ ] Network tab shows `/api/ai/route-solver` requests
- [ ] UI shows explanation card (not MCQ options)
- [ ] UI shows three action chips below
- [ ] No favicon 404 errors
- [ ] Automated script passes (optional)

---

**All checks passed?** ✅ You're good to go!

**Any checks failed?** See Troubleshooting section above.

---

For detailed information, see:
- [WARMUP_KILLED_VERIFIED.md](WARMUP_KILLED_VERIFIED.md) - Complete verification report
- [WARMUP_ELIMINATION_COMPLETE.md](WARMUP_ELIMINATION_COMPLETE.md) - Technical details
