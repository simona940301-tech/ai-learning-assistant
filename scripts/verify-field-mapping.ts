#!/usr/bin/env tsx
/**
 * 字段映射驗證腳本
 * 
 * 確保新的字段映射工具：
 * 1. 正確轉換所有已知字段
 * 2. 不破壞現有數據結構
 * 3. 完全向後相容
 * 
 * 執行: npm run verify:field-mapping 或 tsx scripts/verify-field-mapping.ts
 */

import { dbToApiFormat, apiToDbFormat, safeDbToApiTransform } from '../lib/utils/field-mapping'

interface TestCase {
  name: string
  input: any
  expectedOutput: any
  description: string
}

const testCases: TestCase[] = [
  {
    name: 'Pack Installation Record',
    description: '測試題包安裝記錄的字段轉換',
    input: {
      id: '123',
      user_id: 'user_456',
      pack_id: 'pack_789',
      installed_at: '2024-01-01T00:00:00Z',
      source: 'shop',
      list_position: 1,
      created_at: '2024-01-01T00:00:00Z',
      status: 'active'
    },
    expectedOutput: {
      id: '123',
      userId: 'user_456',
      packId: 'pack_789',
      installedAt: '2024-01-01T00:00:00Z',
      source: 'shop',
      listPosition: 1,
      createdAt: '2024-01-01T00:00:00Z',
      status: 'active'
    }
  },

  {
    name: 'Pack Metadata',
    description: '測試題包元數據的字段轉換',
    input: {
      id: 'pack_123',
      title: 'Test Pack',
      description: 'A test pack',
      item_count: 25,
      has_explanation: true,
      avg_confidence: 0.85,
      install_count: 100,
      explanation_rate: 0.95,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      published_at: '2024-01-01T00:00:00Z',
      qr_alias: 'test123'
    },
    expectedOutput: {
      id: 'pack_123',
      title: 'Test Pack',
      description: 'A test pack',
      itemCount: 25,
      hasExplanation: true,
      avgConfidence: 0.85,
      installCount: 100,
      explanationRate: 0.95,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      publishedAt: '2024-01-01T00:00:00Z',
      qrAlias: 'test123'
    }
  },

  {
    name: 'Mission Record',
    description: '測試任務記錄的字段轉換',
    input: {
      id: 'mission_123',
      user_id: 'user_456',
      mission_date: '2024-01-01',
      all_completed: false,
      rewards_claimed: false,
      target_skill: 'english_vocabulary',
      num_questions: 5,
      pack_ratio: 0.7,
      error_book_ratio: 0.3
    },
    expectedOutput: {
      id: 'mission_123',
      userId: 'user_456',
      missionDate: '2024-01-01',
      allCompleted: false,
      rewardsClaimed: false,
      targetSkill: 'english_vocabulary',
      numQuestions: 5,
      packRatio: 0.7,
      errorBookRatio: 0.3
    }
  },

  {
    name: 'Nested Object',
    description: '測試嵌套對象的字段轉換',
    input: {
      id: 'test_123',
      user_data: {
        user_id: 'user_456',
        created_at: '2024-01-01',
        pack_installations: [
          { pack_id: 'pack_1', installed_at: '2024-01-01' },
          { pack_id: 'pack_2', installed_at: '2024-01-02' }
        ]
      }
    },
    expectedOutput: {
      id: 'test_123',
      userData: {
        userId: 'user_456',
        createdAt: '2024-01-01',
        packInstallations: [
          { packId: 'pack_1', installedAt: '2024-01-01' },
          { packId: 'pack_2', installedAt: '2024-01-02' }
        ]
      }
    }
  },

  {
    name: 'No Transformation Needed',
    description: '測試不需要轉換的字段保持不變',
    input: {
      id: 'test_123',
      title: 'Test Title',
      status: 'active',
      metadata: {
        version: '1.0',
        tags: ['test', 'example']
      }
    },
    expectedOutput: {
      id: 'test_123',
      title: 'Test Title',
      status: 'active',
      metadata: {
        version: '1.0',
        tags: ['test', 'example']
      }
    }
  }
]

function runTests(): boolean {
  console.log('🧪 開始執行字段映射驗證測試...\n')

  let passed = 0
  let total = testCases.length

  testCases.forEach((test, index) => {
    console.log(`📋 Test ${index + 1}: ${test.name}`)
    console.log(`   描述: ${test.description}`)

    try {
      // 測試 DB → API 轉換
      const result = dbToApiFormat(test.input)
      const isDbToApiMatch = JSON.stringify(result) === JSON.stringify(test.expectedOutput)

      // 測試 API → DB 反向轉換
      const reversedResult = apiToDbFormat(result)
      const isReverseMatch = JSON.stringify(reversedResult) === JSON.stringify(test.input)

      // 測試安全轉換
      const safeResult = safeDbToApiTransform(test.input)
      const isSafeMatch = JSON.stringify(safeResult) === JSON.stringify(test.expectedOutput)

      if (isDbToApiMatch && isReverseMatch && isSafeMatch) {
        console.log('   結果: ✅ PASS (DB→API, API→DB, Safe Transform)\n')
        passed++
      } else {
        console.log('   結果: ❌ FAIL')
        
        if (!isDbToApiMatch) {
          console.log('   DB→API 轉換失敗:')
          console.log('   Expected:', JSON.stringify(test.expectedOutput, null, 2))
          console.log('   Got:     ', JSON.stringify(result, null, 2))
        }
        
        if (!isReverseMatch) {
          console.log('   API→DB 反向轉換失敗:')
          console.log('   Expected:', JSON.stringify(test.input, null, 2))
          console.log('   Got:     ', JSON.stringify(reversedResult, null, 2))
        }

        if (!isSafeMatch) {
          console.log('   安全轉換失敗:')
          console.log('   Expected:', JSON.stringify(test.expectedOutput, null, 2))
          console.log('   Got:     ', JSON.stringify(safeResult, null, 2))
        }
        
        console.log()
      }
    } catch (error) {
      console.log('   結果: ❌ ERROR')
      console.log('   錯誤:', error)
      console.log()
    }
  })

  // 測試摘要
  console.log('📊 測試結果摘要:')
  console.log(`   通過: ${passed}/${total} (${Math.round((passed / total) * 100)}%)`)
  
  if (passed === total) {
    console.log('   🎉 所有測試通過！字段映射工具運行正常。')
  } else {
    console.log('   ⚠️  部分測試失敗，請檢查實現。')
  }

  return passed === total
}

/**
 * 測試現有 API 響應格式相容性
 */
function testApiCompatibility(): void {
  console.log('\n🔄 測試 API 響應格式相容性...')

  // 模擬現有 API 響應
  const existingApiResponse = {
    userId: 'user_123',
    packId: 'pack_456', 
    createdAt: '2024-01-01'
  }

  // 這應該保持不變（已經是 API 格式）
  const result = dbToApiFormat(existingApiResponse)
  
  if (JSON.stringify(result) === JSON.stringify(existingApiResponse)) {
    console.log('✅ API 響應格式相容性測試通過')
  } else {
    console.log('❌ API 響應格式相容性測試失敗')
    console.log('原始:', existingApiResponse)
    console.log('結果:', result)
  }
}

/**
 * 性能測試
 */
function performanceTest(): void {
  console.log('\n⚡ 執行性能測試...')

  const largeObject = {
    user_id: 'user_123',
    packs: Array.from({ length: 1000 }, (_, i) => ({
      pack_id: `pack_${i}`,
      installed_at: '2024-01-01',
      item_count: i + 1
    }))
  }

  const startTime = Date.now()
  const result = dbToApiFormat(largeObject)
  const endTime = Date.now()

  const duration = endTime - startTime
  console.log(`✅ 大型對象轉換完成，耗時: ${duration}ms`)
  
  if (duration < 100) {
    console.log('✅ 性能測試通過 (< 100ms)')
  } else {
    console.log('⚠️  性能可能需要優化 (> 100ms)')
  }
}

// 主函數
if (require.main === module) {
  const success = runTests()
  testApiCompatibility()
  performanceTest()

  process.exit(success ? 0 : 1)
}

export { runTests, testCases }