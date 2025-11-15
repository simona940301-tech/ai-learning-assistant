#!/usr/bin/env tsx
/**
 * 架構守衛腳本
 * 
 * 檢查代碼是否符合架構規範：
 * 1. Route 文件不超過 100 行
 * 2. Route 不直接導入 supabase
 * 3. Route 使用 ApiResponseBuilder
 * 
 * 使用方法：
 * ```bash
 * npm run check-architecture
 * ```
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const MAX_ROUTE_LINES = 100

// 獲取腳本目錄（支持 ES modules 和 CommonJS）
// 簡化：直接從當前工作目錄計算
// 腳本在 scripts/ 目錄，需要找到 apps/web/app/api
const PROJECT_ROOT = process.cwd().includes('apps/web') 
  ? join(process.cwd(), '..', '..')
  : process.cwd()
const API_ROUTES_DIR = join(PROJECT_ROOT, 'apps/web/app/api')

interface Violation {
  file: string
  rule: string
  message: string
  line?: number
}

const violations: Violation[] = []

/**
 * 遞歸查找所有 route.ts 文件
 */
function findRouteFiles(dir: string): string[] {
  const files: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath))
    } else if (entry.name === 'route.ts') {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * 檢查 Route 文件大小
 */
function checkRouteFileSize(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').length

  if (lines > MAX_ROUTE_LINES) {
    violations.push({
      file: filePath,
      rule: 'ROUTE_FILE_SIZE',
      message: `Route 文件超過 ${MAX_ROUTE_LINES} 行（實際：${lines} 行），必須重構`,
    })
  }
}

/**
 * 檢查 Route 是否直接導入 supabase
 */
function checkDirectSupabaseImport(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8')

  // 檢查是否直接導入 tutor-utils 的 supabase
  if (content.includes("from '@/lib/tutor-utils'") && content.includes('supabase')) {
    violations.push({
      file: filePath,
      rule: 'DIRECT_SUPABASE_IMPORT',
      message: 'Route 禁止直接導入 supabase，請使用 Service/Repo 層',
    })
  }

  // 檢查是否直接使用 supabase.from()
  const lines = content.split('\n')
  lines.forEach((line, index) => {
    if (line.includes('supabase.from(') || line.includes('supabase.from(')) {
      violations.push({
        file: filePath,
        rule: 'DIRECT_DB_ACCESS',
        message: 'Route 禁止直接查詢數據庫，請使用 Repo 層',
        line: index + 1,
      })
    }
  })
}

/**
 * 檢查是否使用 ApiResponseBuilder
 */
function checkApiResponseBuilder(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8')

  // 檢查是否有手動構建響應對象
  const hasManualResponse =
    content.includes('NextResponse.json({') &&
    !content.includes("from '@/lib/utils/api-response-builder'") &&
    !content.includes('ok(') &&
    !content.includes('fail(')

  if (hasManualResponse) {
    violations.push({
      file: filePath,
      rule: 'MANUAL_RESPONSE_BUILDING',
      message: '請使用 ApiResponseBuilder (ok/fail) 構建響應，不要手動構建',
    })
  }
}

/**
 * 主檢查函數
 */
function checkArchitecture(): void {
  console.log('🔍 檢查架構規範...\n')

  if (!statSync(API_ROUTES_DIR).isDirectory()) {
    console.error(`❌ API routes 目錄不存在: ${API_ROUTES_DIR}`)
    process.exit(1)
  }

  const routeFiles = findRouteFiles(API_ROUTES_DIR)
  console.log(`📁 找到 ${routeFiles.length} 個 Route 文件\n`)

  for (const filePath of routeFiles) {
    const relativePath = filePath.replace(PROJECT_ROOT + '/', '')
    console.log(`  ✓ 檢查: ${relativePath}`)

    checkRouteFileSize(filePath)
    checkDirectSupabaseImport(filePath)
    checkApiResponseBuilder(filePath)
  }

  console.log('\n')

  if (violations.length > 0) {
    console.error('❌ 發現架構違規：\n')
    violations.forEach((violation, index) => {
      console.error(`${index + 1}. [${violation.rule}] ${violation.file}`)
      console.error(`   ${violation.message}`)
      if (violation.line) {
        console.error(`   行號: ${violation.line}`)
      }
      console.error('')
    })

    console.error('請修正上述違規後再提交 PR。')
    console.error('參考文檔: ARCHITECTURE.md')
    process.exit(1)
  } else {
    console.log('✅ 所有 Route 文件符合架構規範！')
    process.exit(0)
  }
}

// 執行檢查
checkArchitecture()

