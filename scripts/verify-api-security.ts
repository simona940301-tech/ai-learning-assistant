/**
 * API Security Verification Script
 *
 * Tests that all protected API routes properly reject unauthenticated requests
 * Run this before production deployment to verify security fixes
 *
 * Usage:
 *   # Test local development
 *   npx tsx scripts/verify-api-security.ts
 *
 *   # Test preview deployment
 *   NEXT_PUBLIC_APP_URL=https://your-preview.vercel.app npx tsx scripts/verify-api-security.ts
 *
 *   # Test production
 *   NEXT_PUBLIC_APP_URL=https://your-production.vercel.app npx tsx scripts/verify-api-security.ts
 */

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Skip auth check in development mock mode
const IS_MOCK_MODE = process.env.PREVIEW_FORCE_MOCK === 'true' || process.env.NODE_ENV === 'development'

if (IS_MOCK_MODE) {
  console.log('⚠️  WARNING: Running in mock mode - auth checks will be skipped by middleware')
  console.log('⚠️  Set PREVIEW_FORCE_MOCK=false and NODE_ENV=production to test real auth\n')
}

// ============================================================================
// Test Suites
// ============================================================================

/** Routes that MUST return 401 without authentication */
const PROTECTED_ROUTES = [
  // User data routes
  { path: '/api/profile', method: 'GET', category: 'User Data' },
  { path: '/api/backpack', method: 'GET', category: 'User Data' },
  { path: '/api/missions', method: 'GET', category: 'User Data' },
  { path: '/api/error-book', method: 'GET', category: 'User Data' },

  // AI endpoints
  { path: '/api/explain', method: 'POST', category: 'AI Endpoints', body: { input: { text: 'test' } } },
  { path: '/api/solve', method: 'POST', category: 'AI Endpoints', body: { prompt: 'test' } },
  { path: '/api/ai/solve', method: 'POST', category: 'AI Endpoints', body: { question: 'test' } },
  { path: '/api/ai/summarize', method: 'POST', category: 'AI Endpoints', body: { text: 'test' } },
  { path: '/api/ai/concept', method: 'POST', category: 'AI Endpoints', body: { text: 'test' } },
  { path: '/api/ai/feedback', method: 'POST', category: 'AI Endpoints', body: { answer: 'test' } },
  { path: '/api/tutor/answer', method: 'POST', category: 'AI Endpoints', body: { question: 'test' } },

  // Admin routes
  { path: '/api/admin/questions/upload', method: 'POST', category: 'Admin Routes', expectedStatus: [401, 403] },

  // Practice & progression
  { path: '/api/play/practice/join', method: 'POST', category: 'Play Features', body: { mode: 'standard' } },
  { path: '/api/play/progression/status', method: 'GET', category: 'Play Features' },

  // Backpack operations
  { path: '/api/backpack/save', method: 'POST', category: 'Backpack', body: { user_id: 'test', question: 'test', canonical_skill: 'test', note_md: 'test' } },
  { path: '/api/backpack/upload', method: 'POST', category: 'Backpack', body: {} },
]

/** Routes that should be publicly accessible (200 or appropriate response) */
const PUBLIC_ROUTES = [
  { path: '/api/health', method: 'GET', category: 'Public' },
  { path: '/api/docs', method: 'GET', category: 'Public' },
  { path: '/api/heartbeat', method: 'GET', category: 'Public' },
]

/** Routes requiring API keys (should return 401 without key) */
const SERVICE_ROUTES = [
  { path: '/api/play/battle/events', method: 'POST', category: 'Service Auth', body: { events: [] } },
  { path: '/api/internal/ocr', method: 'POST', category: 'Service Auth', body: { image: 'test' } },
]

// ============================================================================
// Test Functions
// ============================================================================

interface TestRoute {
  path: string
  method: string
  category: string
  body?: any
  expectedStatus?: number | number[]
}

interface TestResult {
  route: string
  method: string
  category: string
  passed: boolean
  status: number
  expected: string
  message: string
}

async function testProtectedRoute(route: TestRoute): Promise<TestResult> {
  const url = `${BASE_URL}${route.path}`
  const expectedStatuses = Array.isArray(route.expectedStatus)
    ? route.expectedStatus
    : [route.expectedStatus || 401]

  try {
    const response = await fetch(url, {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: route.body ? JSON.stringify(route.body) : undefined,
    })

    const passed = expectedStatuses.includes(response.status)
    const expected = expectedStatuses.length === 1
      ? expectedStatuses[0].toString()
      : expectedStatuses.join(' or ')

    return {
      route: route.path,
      method: route.method,
      category: route.category,
      passed,
      status: response.status,
      expected,
      message: passed
        ? `Properly protected (${response.status})`
        : `SECURITY ISSUE! Got ${response.status}, expected ${expected}`,
    }
  } catch (error) {
    return {
      route: route.path,
      method: route.method,
      category: route.category,
      passed: false,
      status: 0,
      expected: expectedStatuses.join(' or '),
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

async function testPublicRoute(route: TestRoute): Promise<TestResult> {
  const url = `${BASE_URL}${route.path}`

  try {
    const response = await fetch(url, {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Public routes should not return 401
    const passed = response.status !== 401

    return {
      route: route.path,
      method: route.method,
      category: route.category,
      passed,
      status: response.status,
      expected: 'not 401',
      message: passed
        ? `Publicly accessible (${response.status})`
        : `Should be public but got 401`,
    }
  } catch (error) {
    return {
      route: route.path,
      method: route.method,
      category: route.category,
      passed: false,
      status: 0,
      expected: 'not 401',
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

async function testServiceRoute(route: TestRoute): Promise<TestResult> {
  const url = `${BASE_URL}${route.path}`

  try {
    // Test without API key - should fail
    const response = await fetch(url, {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: route.body ? JSON.stringify(route.body) : undefined,
    })

    // Service routes should require API key (401 or 500 if misconfigured)
    const passed = response.status === 401 || response.status === 500

    return {
      route: route.path,
      method: route.method,
      category: route.category,
      passed,
      status: response.status,
      expected: '401 or 500',
      message: passed
        ? response.status === 401
          ? 'Requires API key (401)'
          : 'API key not configured (500) - set BATTLE_EVENTS_API_KEY or INTERNAL_API_KEY'
        : `SECURITY ISSUE! Got ${response.status}, expected 401 or 500`,
    }
  } catch (error) {
    return {
      route: route.path,
      method: route.method,
      category: route.category,
      passed: false,
      status: 0,
      expected: '401 or 500',
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// ============================================================================
// Reporting Functions
// ============================================================================

function printResults(results: TestResult[], title: string) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`${title}`)
  console.log('='.repeat(80))

  // Group by category
  const byCategory = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = []
    }
    acc[result.category].push(result)
    return acc
  }, {} as Record<string, TestResult[]>)

  for (const [category, categoryResults] of Object.entries(byCategory)) {
    console.log(`\n📁 ${category}:`)

    for (const result of categoryResults) {
      const icon = result.passed ? '✅' : '❌'
      const method = result.method.padEnd(6)
      const status = result.status.toString().padStart(3)

      console.log(`  ${icon} ${method} ${status} ${result.route}`)
      if (!result.passed) {
        console.log(`     └─ ${result.message}`)
      }
    }
  }
}

function printSummary(allResults: TestResult[]) {
  const total = allResults.length
  const passed = allResults.filter(r => r.passed).length
  const failed = total - passed
  const passRate = ((passed / total) * 100).toFixed(1)

  console.log(`\n${'='.repeat(80)}`)
  console.log('📊 SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total Tests:  ${total}`)
  console.log(`Passed:       ${passed} ✅`)
  console.log(`Failed:       ${failed} ${failed > 0 ? '❌' : ''}`)
  console.log(`Pass Rate:    ${passRate}%`)

  if (failed > 0) {
    console.log(`\n⚠️  SECURITY VULNERABILITIES DETECTED!`)
    console.log(`\nFailed Routes:`)
    allResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  ❌ ${r.method} ${r.route}`)
        console.log(`     └─ ${r.message}`)
      })
  } else {
    console.log(`\n🎉 All security tests passed!`)
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🔒 API Security Verification Starting...')
  console.log(`Testing against: ${BASE_URL}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

  const allResults: TestResult[] = []

  // Test protected routes
  console.log('\n🔐 Testing Protected Routes...')
  const protectedResults = await Promise.all(
    PROTECTED_ROUTES.map(route => testProtectedRoute(route))
  )
  allResults.push(...protectedResults)
  printResults(protectedResults, '🔐 PROTECTED ROUTES (Should Return 401)')

  // Test public routes
  console.log('\n\n🌍 Testing Public Routes...')
  const publicResults = await Promise.all(
    PUBLIC_ROUTES.map(route => testPublicRoute(route))
  )
  allResults.push(...publicResults)
  printResults(publicResults, '🌍 PUBLIC ROUTES (Should Be Accessible)')

  // Test service routes
  console.log('\n\n🔑 Testing Service Routes...')
  const serviceResults = await Promise.all(
    SERVICE_ROUTES.map(route => testServiceRoute(route))
  )
  allResults.push(...serviceResults)
  printResults(serviceResults, '🔑 SERVICE ROUTES (Should Require API Key)')

  // Print summary
  printSummary(allResults)

  // Exit with appropriate code
  const failed = allResults.filter(r => !r.passed).length
  process.exit(failed > 0 ? 1 : 0)
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { main as verifyApiSecurity }
