#!/usr/bin/env tsx
/**
 * API 验证脚本 - 测试 /api/solve 端点
 * 使用方法: npm run verify:solve 或 tsx scripts/ping-solve.ts
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

interface TestCase {
  name: string
  payload: Record<string, any>
}

const testCases: TestCase[] = [
  {
    name: '最小 JSON (仅 prompt)',
    payload: {
      prompt: '三角形 ABC，已知 a=5, b=7, C=60°，求 c=?',
      subject: 'MathA',
      mode: 'step'
    }
  },
  {
    name: '使用 session_id',
    payload: {
      session_id: '00000000-0000-0000-0000-000000000000',
      mode: 'step'
    }
  },
  {
    name: '使用 keypoint_code',
    payload: {
      prompt: '向量內積計算',
      subject: 'MathA',
      keypoint_code: 'VEC_DOT',
      mode: 'fast'
    }
  }
]

async function pingS

olve(testCase: TestCase) {
  console.log(`\n🧪 測試: ${testCase.name}`)
  console.log(`📤 Payload:`, JSON.stringify(testCase.payload, null, 2))

  try {
    const startTime = Date.now()
    const response = await fetch(`${API_BASE_URL}/api/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.payload)
    })
    const duration = Date.now() - startTime

    console.log(`📊 Status: ${response.status} ${response.statusText}`)
    console.log(`⏱️  Duration: ${duration}ms`)

    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ Response:`, JSON.stringify(data, null, 2))
    } else {
      console.log(`❌ Error:`, JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error(`💥 Network Error:`, error instanceof Error ? error.message : error)
  }
}

async function main() {
  console.log(`🚀 API 驗證開始: ${API_BASE_URL}/api/solve`)
  console.log(`⏰ 時間: ${new Date().toISOString()}`)

  for (const testCase of testCases) {
    await pingSolve(testCase)
    // 延遲避免過載
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`\n✨ 驗證完成`)
}

main().catch(console.error)

