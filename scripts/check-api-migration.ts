#!/usr/bin/env tsx
/**
 * API 遷移進度檢查工具
 *
 * 功能：
 * - 掃描所有 API routes
 * - 檢查是否使用新的統一格式
 * - 產生遷移進度報告
 * - 列出未遷移的 API
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

// ============================================================================
// Types
// ============================================================================

interface ApiRoute {
  path: string
  relativePath: string
  route: string
  migrated: boolean
  usesApiResponseBuilder: boolean
  usesNewTypes: boolean
  hasLegacyFormat: boolean
}

interface MigrationStats {
  total: number
  migrated: number
  notMigrated: number
  percentage: number
  byDomain: Record<string, { total: number; migrated: number }>
}

// ============================================================================
// Configuration
// ============================================================================

const API_DIR = resolve(process.cwd(), 'apps/web/app/api')
const IGNORED_PATHS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/middleware.ts'
]

// Domain 分類（根據路徑）
const DOMAINS = {
  auth: /^\/api\/(auth|user|profile)/,
  explain: /^\/api\/(explain|ai\/explain|solve)/,
  ai: /^\/api\/ai/,
  missions: /^\/api\/missions/,
  battle: /^\/api\/play\/(battle|pve)/,
  backpack: /^\/api\/(backpack|rag|notebook)/,
  packs: /^\/api\/(packs|store)/,
  community: /^\/api\/(posts|comments)/,
  onboarding: /^\/api\/onboarding/,
  admin: /^\/api\/(admin|internal)/,
  other: /.*/  // 默認分類
}

// ============================================================================
// Main Functions
// ============================================================================

function findRouteFiles(dir: string): string[] {
  const results: string[] = []

  try {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        // 遞歸搜尋子目錄
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          results.push(...findRouteFiles(fullPath))
        }
      } else if (entry.name === 'route.ts') {
        results.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }

  return results
}

function scanApiRoutes(): ApiRoute[] {
  const files = findRouteFiles(API_DIR)

  return files.map(file => {
    const content = readFileSync(file, 'utf-8')
    const relativePath = file.replace(API_DIR, '')
    const route = relativePath
      .replace(/\/route\.ts$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1') // [id] -> :id

    // 檢查遷移狀態
    const usesApiResponseBuilder =
      content.includes('ApiResponseBuilder') ||
      content.includes('from \'@/lib/api/response\'') ||
      content.includes('from "@/lib/api/response"') ||
      content.includes('Api.success') ||
      content.includes('Api.error')

    const usesNewTypes =
      content.includes('ApiResponse') ||
      content.includes('from \'@/lib/types/api\'') ||
      content.includes('from "@/lib/types/api"')

    const hasLegacyFormat =
      content.includes('NextResponse.json({') &&
      !usesApiResponseBuilder

    const migrated = usesApiResponseBuilder

    return {
      path: file,
      relativePath,
      route: route || '/',
      migrated,
      usesApiResponseBuilder,
      usesNewTypes,
      hasLegacyFormat
    }
  })
}

function classifyByDomain(routes: ApiRoute[]): Record<string, ApiRoute[]> {
  const classified: Record<string, ApiRoute[]> = {}

  for (const [domain, pattern] of Object.entries(DOMAINS)) {
    classified[domain] = routes.filter(r => pattern.test(r.route))
  }

  // 移除 'other' 中已經被其他 domain 分類的
  const otherDomainRoutes = new Set(
    Object.entries(classified)
      .filter(([domain]) => domain !== 'other')
      .flatMap(([_, routes]) => routes.map(r => r.path))
  )

  classified.other = classified.other.filter(r => !otherDomainRoutes.has(r.path))

  return classified
}

function calculateStats(routes: ApiRoute[]): MigrationStats {
  const total = routes.length
  const migrated = routes.filter(r => r.migrated).length
  const notMigrated = total - migrated
  const percentage = total > 0 ? Math.round((migrated / total) * 100) : 0

  const byDomain: Record<string, { total: number; migrated: number }> = {}
  const classified = classifyByDomain(routes)

  for (const [domain, domainRoutes] of Object.entries(classified)) {
    if (domainRoutes.length === 0) continue
    byDomain[domain] = {
      total: domainRoutes.length,
      migrated: domainRoutes.filter(r => r.migrated).length
    }
  }

  return {
    total,
    migrated,
    notMigrated,
    percentage,
    byDomain
  }
}

function printReport(routes: ApiRoute[], stats: MigrationStats): void {
  console.log('\n📊 API 遷移進度報告\n')
  console.log('━'.repeat(80))

  // 總覽
  console.log('\n📈 總覽')
  console.log(`   總數: ${stats.total} 個 API`)
  console.log(`   已遷移: ${stats.migrated} 個 (${stats.percentage}%)`)
  console.log(`   未遷移: ${stats.notMigrated} 個`)

  // 進度條
  const barLength = 40
  const filledLength = Math.round((stats.percentage / 100) * barLength)
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
  console.log(`\n   [${bar}] ${stats.percentage}%\n`)

  // 按 Domain 統計
  console.log('📂 按 Domain 統計\n')
  const sortedDomains = Object.entries(stats.byDomain)
    .sort(([, a], [, b]) => b.total - a.total)
    .filter(([domain]) => domain !== 'other')

  for (const [domain, { total, migrated }] of sortedDomains) {
    const percentage = Math.round((migrated / total) * 100)
    const emoji = percentage === 100 ? '✅' : percentage >= 50 ? '🟡' : '🔴'
    console.log(`   ${emoji} ${domain.padEnd(15)} ${migrated}/${total} (${percentage}%)`)
  }

  // Other domain
  if (stats.byDomain.other && stats.byDomain.other.total > 0) {
    const { total, migrated } = stats.byDomain.other
    const percentage = Math.round((migrated / total) * 100)
    const emoji = percentage === 100 ? '✅' : percentage >= 50 ? '🟡' : '🔴'
    console.log(`   ${emoji} ${'other'.padEnd(15)} ${migrated}/${total} (${percentage}%)`)
  }

  // 未遷移的 API
  if (stats.notMigrated > 0) {
    console.log('\n❌ 未遷移的 API\n')
    const notMigrated = routes.filter(r => !r.migrated)
    const classified = classifyByDomain(notMigrated)

    for (const [domain, domainRoutes] of Object.entries(classified)) {
      if (domainRoutes.length === 0) continue
      console.log(`   📁 ${domain.toUpperCase()}`)
      for (const route of domainRoutes) {
        console.log(`      - ${route.route}`)
      }
      console.log()
    }
  }

  console.log('━'.repeat(80))
  console.log()
}

function printDetailedReport(routes: ApiRoute[]): void {
  console.log('🔍 詳細遷移狀態\n')

  const issues = routes.filter(r => r.hasLegacyFormat && !r.migrated)

  if (issues.length === 0) {
    console.log('   ✅ 沒有發現使用舊格式的 API')
    return
  }

  console.log(`   發現 ${issues.length} 個使用舊格式的 API：\n`)

  for (const route of issues.slice(0, 10)) {  // 只顯示前 10 個
    console.log(`   📄 ${route.route}`)
    console.log(`      路徑: ${route.relativePath}`)
    console.log(`      狀態: 使用 NextResponse.json，需要遷移\n`)
  }

  if (issues.length > 10) {
    console.log(`   ... 還有 ${issues.length - 10} 個 API 需要遷移\n`)
  }
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  console.log('🔍 掃描 API routes...\n')

  const routes = scanApiRoutes()
  const stats = calculateStats(routes)

  printReport(routes, stats)

  // 詳細報告（可選）
  if (process.argv.includes('--detailed')) {
    printDetailedReport(routes)
  }

  // 輸出 JSON（可選）
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ routes, stats }, null, 2))
  }

  // 如果有未遷移的 API，以非零狀態碼退出（用於 CI）
  if (process.argv.includes('--ci') && stats.notMigrated > 0) {
    process.exit(1)
  }
}

try {
  main()
} catch (error) {
  console.error('❌ 錯誤:', error)
  process.exit(1)
}
