#!/usr/bin/env npx tsx

/**
 * Quick Verification Script for NotebookLM Upgrade
 *
 * This script verifies that all the key improvements are in place:
 * 1. XML formatting in route
 * 2. Synthesis prompt updates
 * 3. Schema enhancements
 */

import fs from 'fs'
import path from 'path'

const CHECKS = [
  {
    name: 'XML Formatting in Route',
    file: 'apps/web/app/api/rag/analyze-object/route.ts',
    patterns: [
      '<document index=',
      'type="primary"',
      'type="related"',
      'relatedDocIds'
    ],
    description: 'Ensures multi-document context is formatted with XML tags'
  },
  {
    name: 'Multi-Document Synthesis Prompt',
    file: 'apps/web/lib/services/elite-rag-analyzer.ts',
    patterns: [
      '多文件綜合',
      '絕對禁止',
      '交叉比對',
      '來源:',
    ],
    description: 'Verifies synthesis instructions are present'
  },
  {
    name: 'Dynamic Richness Prompt',
    file: 'apps/web/lib/services/elite-rag-analyzer.ts',
    patterns: [
      '動態豐富度',
      '根據輸入文件的內容長度與深度',
      '自由調整',
      '不要受限於簡短的格式'
    ],
    description: 'Confirms dynamic summary length instructions'
  },
  {
    name: 'Cross-Document Question Sets',
    file: 'apps/web/lib/services/elite-rag-analyzer.ts',
    patterns: [
      '跨章節題組',
      'question_set',
      '整合不同文件資訊'
    ],
    description: 'Checks for cross-document question requirements'
  },
  {
    name: 'Schema Source Tracking',
    file: 'apps/web/lib/schemas/gsat-analysis-schema.ts',
    patterns: [
      'sources: z.array',
      'KeyConceptSchema',
      '來源文件列表'
    ],
    description: 'Validates source tracking in schema'
  }
]

function checkFile(filePath: string, patterns: string[]): { passed: number; total: number; missing: string[] } {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    console.error(`  ❌ File not found: ${filePath}`)
    return { passed: 0, total: patterns.length, missing: patterns }
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const missing: string[] = []
  let passed = 0

  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      passed++
    } else {
      missing.push(pattern)
    }
  }

  return { passed, total: patterns.length, missing }
}

function main() {
  console.log('🔍 Verifying NotebookLM-Level Upgrade\n')
  console.log('=' .repeat(60))

  let totalPassed = 0
  let totalChecks = 0
  const failures: Array<{ name: string; missing: string[] }> = []

  for (const check of CHECKS) {
    console.log(`\n📋 ${check.name}`)
    console.log(`   ${check.description}`)
    console.log(`   File: ${check.file}`)

    const result = checkFile(check.file, check.patterns)
    totalPassed += result.passed
    totalChecks += result.total

    if (result.passed === result.total) {
      console.log(`   ✅ All checks passed (${result.passed}/${result.total})`)
    } else {
      console.log(`   ⚠️  Some checks failed (${result.passed}/${result.total})`)
      console.log(`   Missing patterns:`)
      result.missing.forEach(pattern => {
        console.log(`     - "${pattern}"`)
      })
      failures.push({ name: check.name, missing: result.missing })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Overall Results: ${totalPassed}/${totalChecks} checks passed`)

  if (failures.length === 0) {
    console.log('\n🎉 All verifications passed! NotebookLM upgrade is complete.')
    console.log('\n✅ Ready for manual testing:')
    console.log('   1. Start dev server: pnpm --filter web dev')
    console.log('   2. Upload multiple related documents')
    console.log('   3. Test multi-document analysis in Summary Workbench')
    console.log('   4. Verify source attribution and synthesis quality')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some verifications failed:')
    failures.forEach(f => {
      console.log(`\n   ${f.name}:`)
      f.missing.forEach(m => console.log(`     - Missing: "${m}"`))
    })
    console.log('\n💡 Please review the implementation and ensure all patterns are present.')
    process.exit(1)
  }
}

main()
