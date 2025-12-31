# 🔒 Security Fix Implementation Guide - 24-48h Sprint

**Target**: Resolve API security vulnerabilities identified in 4D Pre-launch Audit
**Timeline**: 24-48 hours
**Priority**: HIGH - Required for production launch

---

## 📊 Current Security Status

### ✅ SECURE Routes (81/124 = 65%)
The following critical routes **already have proper authentication**:
- ✅ `/api/profile` - Uses `getApiUser()` with proper 401 handling
- ✅ `/api/backpack` - Uses `getCurrentUser()` with JWT error handling
- ✅ `/api/missions` - Uses `supabase.auth.getUser()` with auth checks
- ✅ `/api/error-book` - Protected with `getApiUser()`
- ✅ All `/api/chick/*` routes - Fully authenticated
- ✅ All `/api/play/progression/*` routes - Secure
- ✅ All `/api/onboarding/*` routes - Protected

### ⚠️ FALSE POSITIVE in Audit Report
The audit reported `/api/profile`, `/api/backpack`, and `/api/missions` as "accessible without authentication". This was a **FALSE POSITIVE** caused by:

1. **Mock Mode in Development**: The app uses mock authentication in dev/preview
   ```typescript
   // lib/supabase/server.ts
   const USE_MOCK_USER =
     process.env.NODE_ENV === 'development' ||
     process.env.PREVIEW_FORCE_MOCK === 'true'
   ```

2. **Testing in Development Environment**: The Playwright tests ran against a dev environment with mock mode enabled, which allowed authenticated access without real tokens.

### 🔴 REAL Security Issues (38 routes)

#### Critical Priority - Must Fix Before Launch

1. **AI/ML Endpoints (Unprotected)**
   - `/api/ai/solve`
   - `/api/ai/summarize`
   - `/api/ai/concept`
   - `/api/ai/feedback`
   - `/api/ai/judge`
   - `/api/ai/route-solver`
   - `/api/ai/route-solver-stream`
   - **Risk**: Unlimited AI API abuse, potential cost impact
   - **Fix**: Add authentication + rate limiting

2. **Core Explanation Endpoints**
   - `/api/explain`
   - `/api/solve`
   - `/api/tutor/answer`
   - **Risk**: Unrestricted access to AI tutoring
   - **Fix**: Require authentication

3. **Conditional Authentication Issue**
   - `/api/backpack/save`
   ```typescript
   // CURRENT (INSECURE):
   const authContext = await resolveUserContext(request)
   if (authContext.requiresAuth && !authContext.userId) {
     return 401
   }
   // Proceeds without auth if no auth header present

   // SHOULD BE:
   const { user } = await getApiUser(req)
   if (!user) return 401
   ```

4. **Service-to-Service Auth Issues**
   - `/api/play/battle/events` (POST)
   ```typescript
   // CURRENT (WEAK):
   const apiKey = req.headers.get('x-api-key')
   if (expectedApiKey && apiKey !== expectedApiKey) {
     return 401
   }
   // If no expectedApiKey env var, no auth required

   // SHOULD BE:
   const apiKey = req.headers.get('x-api-key')
   const expectedApiKey = process.env.BATTLE_EVENTS_API_KEY
   if (!expectedApiKey) {
     throw new Error('BATTLE_EVENTS_API_KEY not configured')
   }
   if (apiKey !== expectedApiKey) {
     return 401
   }
   ```

#### High Priority - Admin Routes

5. **Admin Endpoints (Missing Role Check)**
   - `/api/admin/questions/upload`
   - `/api/admin/ugc-questions/review`
   - `/api/admin/universities`
   - **Current**: Has user auth but no admin role verification
   - **Fix**: Check `profiles.role === 'admin'`

6. **Internal Endpoints (Missing Auth)**
   - `/api/internal/ocr`
   - `/api/internal/departments/import`
   - `/api/internal/seed-questions/ai-parse`
   - `/api/internal/questions/upload`
   - **Fix**: Add service-to-service API key auth

#### Medium Priority

7. **Analytics/Metrics (Optional Auth)**
   - `/api/metrics`
   - `/api/analytics/batch`
   - **Current**: Accepts requests without auth
   - **Decision Needed**: Should these require auth or support anonymous?

---

## 🛠️ Implementation Plan

### Phase 1: Middleware Authentication (4-6 hours)

**Goal**: Create Next.js middleware to protect API routes at the edge

**File**: `apps/web/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that MUST be authenticated
const PROTECTED_API_ROUTES = [
  '/api/ai/',
  '/api/explain',
  '/api/solve',
  '/api/tutor/',
  '/api/backpack/',
  '/api/profile/',
  '/api/missions/',
  '/api/chick/',
  '/api/shop/',
  '/api/avatar/',
  '/api/play/practice/',
  '/api/play/progression/',
  '/api/play/ugc-questions/',
  '/api/error-book/',
  '/api/admin/',
]

// Routes that are intentionally public
const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/docs',
  '/api/heartbeat',
  '/api/qr/',
  '/api/packs', // Public pack browsing (optional auth for install status)
]

// Service-to-service routes (require API key)
const SERVICE_API_ROUTES = [
  '/api/internal/',
  '/api/play/battle/events', // POST only
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware in development mock mode
  if (process.env.NODE_ENV === 'development' || process.env.PREVIEW_FORCE_MOCK === 'true') {
    console.log('[Middleware] Mock mode enabled - skipping auth checks')
    return NextResponse.next()
  }

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Check if route is intentionally public
  const isPublicRoute = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check if route requires service-to-service auth
  const isServiceRoute = SERVICE_API_ROUTES.some(route => pathname.startsWith(route))
  if (isServiceRoute) {
    return handleServiceAuth(request)
  }

  // Check if route requires user authentication
  const requiresAuth = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))
  if (requiresAuth) {
    return handleUserAuth(request)
  }

  // Default: allow (for backwards compatibility during migration)
  return NextResponse.next()
}

async function handleUserAuth(request: NextRequest): Promise<NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {}, // Read-only in middleware
        remove() {},
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        code: 'middleware_auth_failed',
      },
      { status: 401 }
    )
  }

  // Check admin routes
  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      )
    }
  }

  return NextResponse.next()
}

async function handleServiceAuth(request: NextRequest): Promise<NextResponse> {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('x-internal-api-key')

  const expectedKey =
    process.env.INTERNAL_API_KEY ||
    process.env.BATTLE_EVENTS_API_KEY

  if (!expectedKey) {
    console.error('[Middleware] Service API key not configured')
    return NextResponse.json(
      {
        success: false,
        error: 'MISCONFIGURED',
        message: 'Service authentication not configured',
      },
      { status: 500 }
    )
  }

  if (apiKey !== expectedKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid API key',
      },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
```

**Environment Variables Needed**:
```bash
# .env.local
INTERNAL_API_KEY=your-internal-api-key-here
BATTLE_EVENTS_API_KEY=your-battle-events-key-here
```

### Phase 2: Fix Individual Route Issues (6-8 hours)

#### 2.1 Fix `/api/backpack/save`

**File**: `apps/web/app/api/backpack/save/route.ts`

```typescript
// BEFORE:
const authContext = await resolveUserContext(request)
if (authContext.requiresAuth && !authContext.userId) {
  return 401
}

// AFTER:
import { getApiUser } from '@/lib/api/auth'

const { supabase, user, errorType } = await getApiUser(req)
if (!user) {
  const message = errorType === 'invalid-jwt'
    ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
    : 'Authentication required'

  return NextResponse.json({
    success: false,
    error: 'UNAUTHORIZED',
    message,
    errorType,
  }, { status: 401 })
}
```

#### 2.2 Secure AI Endpoints

**Files**:
- `apps/web/app/api/ai/solve/route.ts`
- `apps/web/app/api/ai/summarize/route.ts`
- `apps/web/app/api/ai/concept/route.ts`
- `apps/web/app/api/ai/feedback/route.ts`
- `apps/web/app/api/ai/judge/route.ts`
- `apps/web/app/api/ai/route-solver/route.ts`
- `apps/web/app/api/ai/route-solver-stream/route.ts`

**Pattern to add**:
```typescript
import { getApiUser } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
  // Add authentication
  const { supabase, user, errorType } = await getApiUser(req)

  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'UNAUTHORIZED',
      message: errorType === 'invalid-jwt'
        ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
        : 'Authentication required',
      errorType,
    }, { status: 401 })
  }

  // Add rate limiting (optional but recommended)
  // TODO: Implement Redis-based rate limiting

  // Existing AI logic...
}
```

#### 2.3 Fix `/api/explain` and `/api/solve`

Same pattern as AI endpoints above.

#### 2.4 Fix Admin Route Role Checks

**Files**:
- `apps/web/app/api/admin/questions/upload/route.ts`
- `apps/web/app/api/admin/ugc-questions/review/route.ts`

**Pattern**:
```typescript
import { getApiUser } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)

  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    }, { status: 401 })
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Admin access required',
    }, { status: 403 })
  }

  // Admin logic...
}
```

#### 2.5 Fix Service-to-Service Auth

**File**: `apps/web/app/api/play/battle/events/route.ts`

```typescript
// BEFORE:
const apiKey = req.headers.get('x-api-key')
if (expectedApiKey && apiKey !== expectedApiKey) {
  return 401
}

// AFTER:
const apiKey = req.headers.get('x-api-key')
const expectedApiKey = process.env.BATTLE_EVENTS_API_KEY

if (!expectedApiKey) {
  console.error('[Battle Events] BATTLE_EVENTS_API_KEY not configured')
  return NextResponse.json({
    success: false,
    error: 'SERVER_MISCONFIGURED',
    message: 'Service authentication not configured',
  }, { status: 500 })
}

if (apiKey !== expectedApiKey) {
  return NextResponse.json({
    success: false,
    error: 'UNAUTHORIZED',
    message: 'Invalid API key',
  }, { status: 401 })
}
```

### Phase 3: SEO Metadata (2-3 hours)

The root layout is currently a client component, which prevents using `export const metadata`. We have two options:

#### Option A: Convert Root Layout to Server Component (Recommended)

**File**: `apps/web/app/layout.tsx`

```typescript
// Remove 'use client' directive
import './globals.css'
import '@/styles/mario-design-system.css'
import type { Metadata } from 'next'
import { ClientProviders } from '@/components/ClientProviders'

export const metadata: Metadata = {
  title: {
    default: 'PLMS - AI 智慧學習輔助系統',
    template: '%s | PLMS',
  },
  description: '運用 AI 技術打造的個人化學習管理系統，提供智能題目解析、錯題本管理、戰鬥模式練習等功能',
  keywords: ['AI學習', '題目解析', '錯題本', '學習輔助', '智能家教', 'PLMS'],
  authors: [{ name: 'PLMS Team' }],
  creator: 'PLMS Team',
  publisher: 'PLMS',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: 'https://your-domain.com',
    title: 'PLMS - AI 智慧學習輔助系統',
    description: '運用 AI 技術打造的個人化學習管理系統',
    siteName: 'PLMS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PLMS - AI 智慧學習輔助系統',
    description: '運用 AI 技術打造的個人化學習管理系統',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
  themeColor: '#FAF6E9',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PLMS',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
```

**New File**: `apps/web/components/ClientProviders.tsx`

```typescript
'use client'

import { useEffect } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { installGlobalFetchGuard } from '@/lib/api-client'
import { Toaster } from 'sonner'
import EnvChecker from '@/components/EnvChecker'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installGlobalFetchGuard()
  }, [])

  return (
    <AuthProvider>
      <EnvChecker />
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={3000}
      />
    </AuthProvider>
  )
}
```

#### Option B: Add Metadata via Next.js Head Component

If converting to server component causes issues, use dynamic metadata:

**File**: `apps/web/app/layout.tsx` (keep as 'use client')

```typescript
'use client'

import { useEffect } from 'react'
import Head from 'next/head'
// ... rest of imports

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    installGlobalFetchGuard()
  }, [])

  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <Head>
        <title>PLMS - AI 智慧學習輔助系統</title>
        <meta name="description" content="運用 AI 技術打造的個人化學習管理系統，提供智能題目解析、錯題本管理、戰鬥模式練習等功能" />
        <meta name="keywords" content="AI學習,題目解析,錯題本,學習輔助,智能家教,PLMS" />
        <meta property="og:title" content="PLMS - AI 智慧學習輔助系統" />
        <meta property="og:description" content="運用 AI 技術打造的個人化學習管理系統" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      {/* rest of component */}
    </html>
  )
}
```

### Phase 4: Empty State Components (3-4 hours)

#### 4.1 Profile Page Empty State

**File**: `apps/web/components/profile/EmptyState.tsx`

```typescript
'use client'

import { motion } from 'framer-motion'
import { User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function ProfileEmptyState() {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
          <User className="w-12 h-12 text-blue-600" />
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-2 -right-2"
        >
          <Sparkles className="w-8 h-8 text-yellow-500" />
        </motion.div>
      </div>

      <h3 className="text-xl font-bold mb-2">歡迎來到你的個人主頁</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        開始學習旅程，累積經驗值，解鎖成就，打造專屬的學習檔案
      </p>

      <div className="flex gap-3">
        <Button onClick={() => router.push('/play')} variant="default">
          開始練習
        </Button>
        <Button onClick={() => router.push('/ask')} variant="outline">
          提問題目
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-md">
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold">0</div>
          <div className="text-xs text-muted-foreground">經驗值</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold">0</div>
          <div className="text-xs text-muted-foreground">連續天數</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold">0</div>
          <div className="text-xs text-muted-foreground">完成題目</div>
        </div>
      </div>
    </motion.div>
  )
}
```

#### 4.2 Community Page Empty State

**File**: `apps/web/components/community/EmptyState.tsx`

```typescript
'use client'

import { motion } from 'framer-motion'
import { Users, MessageCircle, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function CommunityEmptyState() {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
          <Users className="w-12 h-12 text-green-600" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -bottom-1 -right-1"
        >
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        </motion.div>
      </div>

      <h3 className="text-xl font-bold mb-2">社群功能即將推出</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        與其他學習者分享心得、交流經驗，一起進步
      </p>

      <div className="grid grid-cols-1 gap-3 w-full max-w-sm mb-6">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <div className="text-left text-sm">
            <div className="font-medium">討論區</div>
            <div className="text-xs text-muted-foreground">分享學習心得</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Users className="w-5 h-5 text-green-600" />
          <div className="text-left text-sm">
            <div className="font-medium">學習小組</div>
            <div className="text-xs text-muted-foreground">組隊一起進步</div>
          </div>
        </div>
      </div>

      <Button onClick={() => router.push('/home')} variant="default">
        返回首頁
      </Button>
    </motion.div>
  )
}
```

#### 4.3 Integration

Update the respective page components to show empty states when no data:

**Profile Page**:
```typescript
// In apps/web/app/(app)/profile/page.tsx or store/page.tsx
import { ProfileEmptyState } from '@/components/profile/EmptyState'

// Inside component:
{!profile && <ProfileEmptyState />}
```

**Community Page**:
```typescript
// In apps/web/app/(app)/community/page.tsx
import { CommunityEmptyState } from '@/components/community/EmptyState'

// Inside component:
{posts.length === 0 && <CommunityEmptyState />}
```

### Phase 5: Testing & Verification (4-6 hours)

#### 5.1 Create Security Verification Script

**File**: `scripts/verify-api-security.ts`

```typescript
/**
 * Security Verification Script
 * Tests that all protected API routes properly reject unauthenticated requests
 */

const PROTECTED_ROUTES = [
  '/api/profile',
  '/api/backpack',
  '/api/missions',
  '/api/error-book',
  '/api/ai/solve',
  '/api/ai/summarize',
  '/api/explain',
  '/api/solve',
  '/api/admin/questions/upload',
]

async function testRoute(route: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const response = await fetch(`${baseUrl}${route}`, {
      method: route.includes('upload') ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 401) {
      console.log(`✅ ${route} - Properly protected (401)`)
      return true
    } else {
      console.error(`❌ ${route} - SECURITY ISSUE! Status: ${response.status}`)
      return false
    }
  } catch (error) {
    console.error(`❌ ${route} - Test failed:`, error)
    return false
  }
}

async function main() {
  console.log('🔒 Security Verification Starting...\n')

  const results = await Promise.all(
    PROTECTED_ROUTES.map(route => testRoute(route))
  )

  const passed = results.filter(r => r).length
  const total = results.length

  console.log(`\n📊 Results: ${passed}/${total} routes properly protected`)

  if (passed === total) {
    console.log('✅ All routes are secure!')
    process.exit(0)
  } else {
    console.error('❌ Security vulnerabilities detected!')
    process.exit(1)
  }
}

main()
```

**Run with**:
```bash
# Against production (without mock mode)
NEXT_PUBLIC_APP_URL=https://your-production-url.vercel.app npx tsx scripts/verify-api-security.ts

# Against staging
NEXT_PUBLIC_APP_URL=https://your-preview-url.vercel.app npx tsx scripts/verify-api-security.ts
```

#### 5.2 Update Playwright Tests

Update the existing security tests to run against production mode:

```typescript
// tests/e2e/security.spec.ts
test.describe('API Security', () => {
  test.beforeAll(() => {
    // Ensure we're not in mock mode
    expect(process.env.PREVIEW_FORCE_MOCK).not.toBe('true')
  })

  test('should reject unauthenticated requests to /api/profile', async ({ request }) => {
    const response = await request.get('/api/profile')
    expect(response.status()).toBe(401)
  })

  test('should reject unauthenticated requests to /api/backpack', async ({ request }) => {
    const response = await request.get('/api/backpack')
    expect(response.status()).toBe(401)
  })

  test('should reject unauthenticated requests to /api/missions', async ({ request }) => {
    const response = await request.get('/api/missions')
    expect(response.status()).toBe(401)
  })

  test('should reject unauthenticated requests to AI endpoints', async ({ request }) => {
    const aiRoutes = ['/api/ai/solve', '/api/explain', '/api/solve']

    for (const route of aiRoutes) {
      const response = await request.post(route, {
        data: { question: 'test' }
      })
      expect(response.status()).toBe(401)
    }
  })
})
```

#### 5.3 Manual Testing Checklist

```markdown
## Production Deployment Checklist

### Environment Variables
- [ ] `BATTLE_EVENTS_API_KEY` set in Vercel
- [ ] `INTERNAL_API_KEY` set in Vercel
- [ ] `PREVIEW_FORCE_MOCK` is NOT set in production
- [ ] `NODE_ENV` is 'production'

### API Security Tests
- [ ] `/api/profile` returns 401 without auth
- [ ] `/api/backpack` returns 401 without auth
- [ ] `/api/missions` returns 401 without auth
- [ ] `/api/ai/solve` returns 401 without auth
- [ ] `/api/explain` returns 401 without auth
- [ ] `/api/admin/*` returns 403 for non-admin users
- [ ] `/api/internal/*` requires API key

### Authenticated Access
- [ ] `/api/profile` works with valid auth
- [ ] `/api/backpack` works with valid auth
- [ ] `/api/missions` works with valid auth
- [ ] Admin routes work for admin users

### SEO & Meta
- [ ] Homepage has proper title and description
- [ ] OG tags are present
- [ ] Twitter cards work
- [ ] App manifest exists

### UX
- [ ] Profile page shows empty state for new users
- [ ] Community page shows empty state
- [ ] Empty states have proper CTAs
```

---

## 📋 Deployment Steps

### Step 1: Create Feature Branch
```bash
git checkout -b fix/api-security-middleware
```

### Step 2: Implement Fixes
1. Create `apps/web/middleware.ts`
2. Fix vulnerable API routes
3. Add SEO metadata
4. Create empty state components
5. Create verification script

### Step 3: Test Locally
```bash
# Run in production mode locally
NODE_ENV=production pnpm --filter web dev

# Run security verification
npx tsx scripts/verify-api-security.ts
```

### Step 4: Deploy to Preview
```bash
git add .
git commit -m "fix: implement API security middleware and SEO improvements"
git push origin fix/api-security-middleware

# Create Vercel preview deployment
# Make sure PREVIEW_FORCE_MOCK is NOT set in preview env
```

### Step 5: Verify Preview Deployment
```bash
NEXT_PUBLIC_APP_URL=https://your-preview.vercel.app npx tsx scripts/verify-api-security.ts
```

### Step 6: Merge to Main
```bash
# After tests pass
git checkout main
git merge fix/api-security-middleware
git push origin main
```

### Step 7: Production Deployment
1. Deploy to Vercel production
2. Set environment variables in Vercel dashboard:
   - `BATTLE_EVENTS_API_KEY`
   - `INTERNAL_API_KEY`
   - Remove `PREVIEW_FORCE_MOCK` if set
3. Run production verification

### Step 8: Monitor
- Check error logs in Vercel
- Monitor authentication failures
- Watch for 401/403 patterns

---

## ⏱️ Timeline Estimate

| Phase | Task | Hours | Status |
|-------|------|-------|--------|
| 1 | Middleware Implementation | 4-6h | Pending |
| 2 | Fix Individual Routes | 6-8h | Pending |
| 3 | SEO Metadata | 2-3h | Pending |
| 4 | Empty State Components | 3-4h | Pending |
| 5 | Testing & Verification | 4-6h | Pending |
| **Total** | | **19-27h** | **~24-48h sprint** |

---

## 🎯 Success Criteria

### Must Have (Launch Blockers)
- ✅ All AI endpoints require authentication
- ✅ `/api/explain` and `/api/solve` are protected
- ✅ Admin routes check for admin role
- ✅ Service-to-service routes require API keys
- ✅ Security verification script passes 100%

### Should Have (High Priority)
- ✅ Middleware protects routes at edge
- ✅ SEO metadata present on all key pages
- ✅ Empty states implemented

### Nice to Have (Post-Launch)
- Rate limiting on AI endpoints
- Comprehensive error logging
- Security monitoring dashboard

---

## 📚 References

- **Authentication Helpers**: `apps/web/lib/api/auth.ts`
- **Supabase Server Client**: `apps/web/lib/supabase/server.ts`
- **API Routes**: `apps/web/app/api/`
- **Audit Report**: `4D_PRELAUNCH_AUDIT_FINAL_REPORT.md`

---

**Last Updated**: 2025-11-27
**Author**: Claude Code Assistant
**Status**: Ready for Implementation
