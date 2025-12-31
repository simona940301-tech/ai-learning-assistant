# 🧪 Phase 2 UX Polish - Quick Test Guide

**Last Updated**: 2025-11-27
**Estimated Test Time**: 30 minutes
**Difficulty**: Easy

---

## 🎯 Quick Test Checklist

Copy this checklist and mark items as you test:

```
## Skeleton Loading States
- [ ] Backpack skeleton (5 cards, warm colors)
- [ ] Community skeleton (4 cards, smooth transition)
- [ ] Profile skeleton (complete layout)

## Toast Notifications
- [ ] Import to Ask toast
- [ ] Practice room creation toast
- [ ] File upload toasts (existing)
- [ ] Store download toasts (existing)

## Empty States
- [ ] Backpack empty (3 types)
- [ ] Community empty
- [ ] Error book empty

## Image Optimization
- [ ] Production build passes
- [ ] WebP/AVIF format loads
- [ ] No <img> warnings
```

---

## 🚀 Quick Start

### 1. Start Dev Server
```bash
cd /Users/simonac/Desktop/moonshot-idea
pnpm --filter web dev
```

Wait for: `✓ Ready on http://localhost:3000`

---

## 📋 Detailed Test Steps

### Test 1: Skeleton Loading States (5 mins)

#### A. Backpack Skeleton
```
1. Open: http://localhost:3000/backpack?type=note&subject=chinese
2. Watch for skeleton:
   - Should see 5 skeleton cards
   - Warm beige color (bg-stone-100)
   - Smooth pulse animation
   - No layout shift when content loads
3. Try other tabs: Wrong (錯題本), Book (題本)
```

**Expected**: ✅ Warm-colored skeleton cards, smooth transition

**Troubleshoot**: If you see "載入中..." text instead:
- Check if `SkeletonList` is imported
- Verify the condition: `{loading ? <SkeletonList count={5} /> : ...}`

---

#### B. Community Skeleton
```
1. Open: http://localhost:3000/community
2. Watch for skeleton:
   - Should see 4 skeleton post cards
   - Each with avatar + text lines
   - Warm colors
3. Switch to "追蹤" tab and back to "最新"
```

**Expected**: ✅ 4 skeleton post cards with avatars

**Troubleshoot**: If skeleton doesn't appear:
- Check `isLoading` state
- Verify the API is responding slowly (or add artificial delay)

---

#### C. Profile Skeleton
```
1. Open: http://localhost:3000/profile
2. Watch for skeleton:
   - Should see profile skeleton layout
   - Avatar circle + text lines
   - Card placeholders
3. Verify smooth transition to real profile
```

**Expected**: ✅ Complete profile skeleton matching final layout

**Troubleshoot**: If profile loads too fast to see skeleton:
- Add delay in useEffect: `await new Promise(r => setTimeout(r, 1000))`
- Check `isLoading` state is properly set

---

### Test 2: Toast Notifications (5 mins)

#### A. Import to Ask Toast
```
1. Open: http://localhost:3000/backpack?type=note&subject=math
2. Find a file (upload one if needed)
3. Click the "匯入到 Ask" button
4. Watch for toast:
   - Should appear top-right
   - Green background (success)
   - Message: "已匯入「{filename}」到 Ask"
   - Auto-dismiss after 3s
```

**Expected**: ✅ Green success toast with filename

**Screenshot Needed**: Toast notification appearance

---

#### B. Practice Room Toast
```
1. Open: http://localhost:3000/backpack?type=book
2. If no question sets, download one from store
3. Click "開始練習" button
4. Watch for toast:
   - Success: "練習室建立成功！"
   - Then navigate to practice room
5. Try with invalid data to see error toast
```

**Expected**: ✅ Success toast → Navigation to practice room

**Troubleshoot**: If no question sets:
- Open Store Modal (from Backpack → Book tab)
- Download a test question set
- Try again

---

#### C. File Upload Toasts (Existing Feature)
```
1. Open: http://localhost:3000/ask
2. Click upload button
3. Try uploading:
   - Valid PDF (< 10MB): ✅ Success toast
   - Invalid file (.exe): ❌ Error toast
   - Oversized file (> 10MB): ❌ Error toast
```

**Expected**: ✅ Different toast colors for success/error

---

#### D. Store Download Toasts (Existing Feature)
```
1. Open: http://localhost:3000/backpack?type=book
2. Click "題本商店" button
3. Download a question set:
   - First download: ✅ "下載成功：「{title}」已加入您的背包"
   - Second download: ⚠️ "已存在：「{title}」已在您的背包中"
```

**Expected**: ✅ Different messages for new/duplicate downloads

---

### Test 3: Empty States (5 mins)

#### A. Backpack Empty States
```
Test with NEW account or clear data:

1. Empty Notes:
   - Go to: /backpack?type=note&subject=math
   - Should see: FileUp icon + "還沒有筆記" + "上傳筆記" CTA
   - Click CTA → Upload modal opens

2. Empty Wrong Book:
   - Go to: /backpack?type=wrong&subject=math
   - Should see: AlertCircle icon + "太棒了！沒有錯題" + "開始練習" CTA
   - Click CTA → Navigate to /play

3. Empty Question Sets:
   - Go to: /backpack?type=book&subject=math
   - Should see: ShoppingBag icon + "還沒有題本" + "前往商店" CTA
   - Click CTA → Store modal opens
```

**Expected**: ✅ Different icons, messages, CTAs for each type

**Troubleshoot**: If empty states don't appear:
- Check `filteredItems.length === 0` condition
- Verify data is actually empty (not loading)

---

#### B. Community Empty State
```
1. Open: http://localhost:3000/community
2. If no posts, should see:
   - Users icon
   - "還沒有貼文"
   - "成為第一個發文的人..." description
   - "發佈貼文" CTA
3. Click CTA → Composer dialog opens
```

**Expected**: ✅ Engaging empty state with clear CTA

---

### Test 4: Image Optimization (5 mins)

#### A. Build Test
```bash
# In terminal
cd /Users/simonac/Desktop/moonshot-idea
pnpm --filter web build
```

**Check for**:
- ✅ No errors
- ✅ No `<img>` tag warnings (should be 0)
- ✅ "Image Optimization" in build output

**Expected Output**:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                              Size
...
○ (Static)  automatically rendered as static HTML
λ (Server)  server-side renders at runtime
```

---

#### B. Production Test
```bash
# Start production server
pnpm --filter web start
```

**In Chrome DevTools**:
```
1. Open http://localhost:3000
2. Open DevTools → Network tab
3. Filter by "Img"
4. Reload page
5. Check image requests:
   - Type should be "webp" or "avif"
   - Size should be smaller than original
   - Look for "next/image" loader URLs
```

**Expected**: ✅ Images load as WebP/AVIF format

---

## 🎨 Visual Checks

### Skeleton Colors
```css
Expected colors:
- Background: #f5f5f4 (stone-100) - Warm light beige
- Borders: #e7e5e4 (stone-200) - Warm gray
- Cards: #ffffff (white) - Clean white

NOT:
- Gray (bg-gray-200)
- Blue tint (bg-slate-100)
- Default muted
```

---

### Toast Appearance
```
Expected:
- Position: Top-right corner
- Animation: Slide in from right
- Auto-dismiss: 3 seconds
- Colors:
  - Success: Green (#10b981)
  - Error: Red (#ef4444)
  - Info: Blue (#3b82f6)
  - Warning: Orange (#f59e0b)
```

---

### Empty State Layout
```
Expected structure:
┌─────────────────┐
│   [Large Icon]  │ ← 64px icon
│                 │
│   Title Text    │ ← 18px bold
│   Description   │ ← 14px regular
│                 │
│  [CTA Button]   │ ← Primary button
└─────────────────┘
```

---

## ⚠️ Common Issues

### Issue 1: Skeleton Not Showing
**Symptoms**: Still seeing "載入中..." text
**Fix**:
```typescript
// Check imports
import { SkeletonList } from '@/components/ui/skeleton'

// Check usage
{loading ? <SkeletonList count={5} /> : ...}
```

---

### Issue 2: Toast Not Appearing
**Symptoms**: No toast after action
**Fix**:
```typescript
// Check import
import { toast } from '@/components/ui/Toast'

// Check usage
toast.success('Message here')
```

---

### Issue 3: Empty State CTA Not Working
**Symptoms**: Button click does nothing
**Fix**:
```typescript
// Check action prop
action={{
  label: '上傳筆記',
  onClick: () => setShowUpload(true)  // ← Make sure this is defined
}}
```

---

### Issue 4: Images Not Optimizing
**Symptoms**: Still seeing .jpg/.png in Network tab
**Fix**:
```javascript
// Check next.config.js
images: {
  domains: ['api.dicebear.com'],
  formats: ['image/webp', 'image/avif'],  // ← Must be present
}
```

---

## 📊 Test Results Template

Copy and fill this out after testing:

```markdown
## Phase 2 UX Polish - Test Results

**Tester**: [Your Name]
**Date**: [Date]
**Environment**: Development / Production
**Browser**: Chrome / Safari / Firefox

### Skeleton Loading States
- Backpack: ✅ / ❌ (notes: ___)
- Community: ✅ / ❌ (notes: ___)
- Profile: ✅ / ❌ (notes: ___)

### Toast Notifications
- Import to Ask: ✅ / ❌ (notes: ___)
- Practice Room: ✅ / ❌ (notes: ___)
- File Upload: ✅ / ❌ (notes: ___)
- Store Download: ✅ / ❌ (notes: ___)

### Empty States
- Backpack Empty: ✅ / ❌ (notes: ___)
- Community Empty: ✅ / ❌ (notes: ___)

### Image Optimization
- Build Success: ✅ / ❌ (notes: ___)
- WebP/AVIF Format: ✅ / ❌ (notes: ___)

### Overall Assessment
- **Pass**: Yes / No
- **Issues Found**: [List any issues]
- **Ready for Production**: Yes / No
```

---

## ✅ Success Criteria

**Phase 2 passes if**:
- ✅ All 3 skeleton loading states work
- ✅ All 4 toast notification scenarios work
- ✅ All empty states show correctly
- ✅ Build completes with no <img> warnings
- ✅ Images load as WebP/AVIF in production
- ✅ No console errors
- ✅ No visual bugs

**Total Test Time**: ~30 minutes
**Minimum Pass Rate**: 90% (28/30 scenarios)

---

## 🚀 After Testing

### If All Tests Pass:
```bash
# 1. Commit changes
git add .
git commit -m "feat: Phase 2 UX Polish - Skeleton, Toast, Image optimization ✨"

# 2. Push to production
git push origin main

# 3. Monitor deployment
# Watch Vercel dashboard for deployment status
```

### If Tests Fail:
1. Document failures in test results template
2. Create GitHub issues for each bug
3. Fix issues one by one
4. Re-test after fixes
5. Repeat until all pass

---

## 📚 Resources

- [Audit Report](PHASE2_UX_AUDIT_REPORT.md)
- [Complete Implementation](PHASE2_UX_POLISH_COMPLETE.md)
- [Toast Component](apps/web/components/ui/Toast.tsx)
- [Skeleton Component](apps/web/components/ui/skeleton.tsx)
- [Empty State Component](apps/web/components/ui/empty-state.tsx)

---

**Happy Testing! 🧪✨**

_Any questions? Check the implementation docs or ask in Slack._
