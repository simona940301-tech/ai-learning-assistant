/**
 * Test router classification on fixtures
 * Run with: npx tsx scripts/test-router-fixtures.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// Import router function
import { classifyEnglishType } from '../apps/web/lib/english/router'

const FIXTURES_DIR = join(process.cwd(), 'analysis/fixtures')

const fixtures = [
  { name: 'e4-oprah.txt', expected: 'E4' },
  { name: 'e4-obama-2015.txt', expected: 'E4' },
  { name: 'e6-sentences.txt', expected: 'E6' },
  { name: 'e7-phrases.txt', expected: 'E7' },
  { name: 'e1-vocab.txt', expected: 'E1' },
]

async function testFixture(filename: string, expected: string) {
  const filepath = join(FIXTURES_DIR, filename)
  const content = readFileSync(filepath, 'utf-8')

  // Extract options from content (simple regex)
  const optionMatches = Array.from(content.matchAll(/\(([A-H])\)\s*([^\n(]+)/g))
  const options = optionMatches.map(m => ({
    key: m[1],
    text: m[2].trim()
  }))

  console.log(`\n${'='.repeat(80)}`)
  console.log(`📄 Testing: ${filename}`)
  console.log(`   Expected: ${expected}`)
  console.log(`   Options count: ${options.length}`)
  console.log(`   Content length: ${content.length} chars`)
  console.log(`${'='.repeat(80)}`)

  const result = await classifyEnglishType({
    stem: content,
    options: options as any
  })

  const match = result.type === expected ? '✅' : '❌'
  console.log(`\n${match} Result: ${result.type} (confidence: ${result.confidence})`)
  console.log(`   Reason: ${result.reason}`)
  console.log(`   Signals: ${result.signals.join(', ')}`)

  // Check for numbered blanks false positive
  const hasYearParens = /\(20\d{2}\)/.test(content)
  if (hasYearParens && expected === 'E4') {
    console.log(`\n⚠️  WARNING: Contains year in parentheses like (2018)`)
  }

  return {
    filename,
    expected,
    actual: result.type,
    confidence: result.confidence,
    match: result.type === expected,
    reason: result.reason
  }
}

async function main() {
  console.log('🔍 Testing Router Classification on Fixtures\n')

  const results = []

  for (const fixture of fixtures) {
    try {
      const result = await testFixture(fixture.name, fixture.expected)
      results.push(result)
    } catch (error) {
      console.error(`❌ Error testing ${fixture.name}:`, error)
      results.push({
        filename: fixture.name,
        expected: fixture.expected,
        actual: 'ERROR',
        confidence: 0,
        match: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log('📊 SUMMARY')
  console.log(`${'='.repeat(80)}`)

  const passed = results.filter(r => r.match).length
  const failed = results.filter(r => !r.match).length

  console.log(`\nTotal: ${results.length}`)
  console.log(`Passed: ${passed} ✅`)
  console.log(`Failed: ${failed} ❌`)
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`)

  if (failed > 0) {
    console.log(`\n❌ Failed Tests:`)
    results.filter(r => !r.match).forEach(r => {
      console.log(`   - ${r.filename}: expected ${r.expected}, got ${r.actual}`)
    })
  }

  console.log(`\n`)
}

main().catch(console.error)
