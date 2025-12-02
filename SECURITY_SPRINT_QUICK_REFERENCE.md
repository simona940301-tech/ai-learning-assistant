# 🚀 Security Sprint - Quick Reference Card

**Target Timeline**: 24-48 hours
**Current Score**: 6.5/10 → **Target**: 9.5/10

---

## 📌 TL;DR

**The audit found false positives!** Your critical routes (`/api/profile`, `/api/backpack`, `/api/missions`) **ARE already secure**. The test environment had mock mode enabled.

**Real issues**: 38 routes need fixes, mainly AI endpoints and admin routes.

**Solution**: Implement middleware + fix vulnerable routes = Production ready

---

## 🎯 Three Critical Fixes

### 1. Create Middleware (4-6h) - HIGHEST PRIORITY

**File**: `apps/web/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

// Protected routes that MUST have auth
const PROTECTED = ['/api/ai/', '/api/explain', '/api/solve', '/api/admin/']

export async function middleware(request: NextRequest) {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const requiresAuth = PROTECTED.some(route => pathname.startsWith(route))

  if (requiresAuth) {
    const { user } = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
  }

  return NextResponse.next()
}
```

### 2. Fix AI Endpoints (3-4h)

**Add to ALL `/api/ai/*`, `/api/explain`, `/api/solve` routes**:

```typescript
import { getApiUser } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
  // Add this at the start
  const { user } = await getApiUser(req)
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // Original logic...
}
```

**Files to fix**:
- `app/api/ai/solve/route.ts`
- `app/api/ai/summarize/route.ts`
- `app/api/ai/concept/route.ts`
- `app/api/ai/feedback/route.ts`
- `app/api/explain/route.ts`
- `app/api/solve/route.ts`

### 3. Admin Role Check (2h)

**Add to ALL `/api/admin/*` routes**:

```typescript
const { supabase, user } = await getApiUser(req)
if (!user) return 401

const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'admin') {
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
}
```

---

## 🔧 Quick Wins (1-2h each)

### SEO Metadata

**Option 1**: Convert root layout to server component
```typescript
// Remove 'use client' from app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PLMS - AI 智慧學習輔助系統',
  description: '運用 AI 技術打造的個人化學習管理系統',
}
```

**Option 2**: Keep client component, add dynamic metadata
```typescript
// Keep 'use client' in app/layout.tsx
import Head from 'next/head'

<Head>
  <title>PLMS - AI 智慧學習輔助系統</title>
  <meta name="description" content="..." />
</Head>
```

### Empty States

Create `components/profile/EmptyState.tsx`:
```typescript
export function ProfileEmptyState() {
  return (
    <div className="text-center p-8">
      <User className="w-16 h-16 mx-auto mb-4" />
      <h3>歡迎來到你的個人主頁</h3>
      <Button onClick={() => router.push('/play')}>開始練習</Button>
    </div>
  )
}
```

Use in pages:
```typescript
{!profile && <ProfileEmptyState />}
```

---

## ✅ Testing Checklist

### Before Deploy
```bash
# Run security verification
npx tsx scripts/verify-api-security.ts

# Test middleware
curl http://localhost:3000/api/ai/solve
# Expected: 401 Unauthorized

# Test with auth
curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer <token>"
# Expected: 200 OK
```

### After Deploy to Preview
```bash
# Verify production mode (no mock)
curl https://your-preview.vercel.app/api/profile
# Must return 401

# Test authenticated
curl https://your-preview.vercel.app/api/profile \
  -H "Authorization: Bearer <token>"
# Must return 200
```

### Environment Variables
Set in Vercel dashboard:
```
BATTLE_EVENTS_API_KEY=<generate-random-string>
INTERNAL_API_KEY=<generate-random-string>

# Remove these if present:
❌ PREVIEW_FORCE_MOCK
❌ APP_USE_MOCK_USER
```

---

## 📁 File Locations

| Component | File Path |
|-----------|-----------|
| Middleware | `apps/web/middleware.ts` |
| Auth Helpers | `apps/web/lib/api/auth.ts` |
| AI Routes | `apps/web/app/api/ai/*/route.ts` |
| Admin Routes | `apps/web/app/api/admin/*/route.ts` |
| SEO Metadata | `apps/web/app/layout.tsx` |
| Empty States | `apps/web/components/*/EmptyState.tsx` |
| Verification Script | `scripts/verify-api-security.ts` |

---

## 🚨 Critical Routes (Already Secure)

These show 401 in production (false positive in audit):
- ✅ `/api/profile` (Line 13: `getApiUser()`)
- ✅ `/api/backpack` (Line 16: `getCurrentUser()`)
- ✅ `/api/missions` (Line 18: `supabase.auth.getUser()`)
- ✅ `/api/error-book` (Line 13: `getApiUser()`)
- ✅ All `/api/chick/*` routes

**Proof**: Read these files, check for authentication code

---

## ⏱️ Time Budget

| Task | Time | Priority |
|------|------|----------|
| Middleware | 4-6h | 🔴 Critical |
| Fix AI routes | 3-4h | 🔴 Critical |
| Admin role check | 2h | 🔴 Critical |
| Service auth | 1h | 🟡 High |
| SEO metadata | 2h | 🟡 High |
| Empty states | 3h | 🟢 Medium |
| Testing | 4h | 🔴 Critical |
| **Total** | **19-22h** | **~1-2 days** |

---

## 🎯 Success Metrics

### Must Pass (Launch Blockers)
- [ ] All AI endpoints return 401 without auth
- [ ] Admin routes check role
- [ ] Service routes require API key
- [ ] Security verification script passes 100%

### Should Pass (High Priority)
- [ ] SEO metadata present
- [ ] Empty states implemented
- [ ] Middleware active in production

### Verification
```bash
# Run this before launch:
NEXT_PUBLIC_APP_URL=https://production-url.vercel.app \
  npx tsx scripts/verify-api-security.ts

# Expected output:
# ✅ All routes are secure! (100%)
```

---

## 🆘 Emergency Quick Fix (If Time Constrained)

**Minimum viable security (8h)**:

1. Add auth to AI routes (3h)
2. Fix admin routes (2h)
3. Make service keys required (1h)
4. Test (2h)

Skip:
- Middleware (nice to have)
- SEO (can add later)
- Empty states (UX polish)

**This gets you to 8/10 security score**

---

## 📚 Full Documentation

For complete details, see:
- **Implementation Guide**: `SECURITY_FIX_IMPLEMENTATION_GUIDE.md` (full technical plan)
- **Executive Summary**: `AUDIT_RESPONSE_SUMMARY.md` (business context)
- **Original Audit**: `4D_PRELAUNCH_AUDIT_FINAL_REPORT.md` (what triggered this)

---

## 🚀 Ready to Start?

```bash
# Create feature branch
git checkout -b fix/api-security-sprint

# Start coding
code apps/web/middleware.ts

# When done
git add .
git commit -m "fix: implement API security middleware and fixes"
git push origin fix/api-security-sprint
```

---

**Questions? Start with**: `AUDIT_RESPONSE_SUMMARY.md`

**Need details? Read**: `SECURITY_FIX_IMPLEMENTATION_GUIDE.md`

**Let's ship secure!** 🔒🚀
