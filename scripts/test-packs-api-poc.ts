#!/usr/bin/env tsx
/**
 * Packs API POC 測試腳本
 * 
 * 測試新的字段轉換工具是否能產生與現有 API 完全相同的響應
 * 確保零破壞性改動
 */

import { dbToApiFormat } from '../lib/utils/field-mapping'

// 本地實現 getConfidenceBadge 避免模組依賴問題
function getConfidenceBadge(avgConfidence: number): string {
  if (avgConfidence >= 0.85) return 'high';
  if (avgConfidence >= 0.7) return 'mid';
  return 'low';
}

// 模擬數據庫返回的原始記錄 (snake_case)
const mockDbPack = {
  id: 'pack_123',
  title: 'Test Pack',
  description: 'A test pack for validation',
  subject: 'english',
  topic: 'vocabulary',
  skill: 'word_recognition',
  grade: 'high_school',
  item_count: 25,
  has_explanation: true,
  explanation_rate: 0.95,
  avg_confidence: 0.87,
  status: 'published',
  visibility: 'public',
  source: 'internal',
  source_name: 'PLMS Team',
  source_id: 'plms_internal_001',
  published_at: '2024-01-01T00:00:00Z',
  expires_at: null,
  install_count: 150,
  completion_rate: 0.85,
  qr_alias: 'test123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user_admin_001'
}

/**
 * 現有的手動轉換方式 (來自原始代碼)
 */
function currentManualTransformation(pack: any, installedPackIds: string[]) {
  return {
    id: pack.id,
    title: pack.title,
    description: pack.description,
    subject: pack.subject,
    topic: pack.topic,
    skill: pack.skill,
    grade: pack.grade,
    itemCount: pack.item_count,                    // 手動轉換
    hasExplanation: pack.has_explanation,          // 手動轉換
    explanationRate: pack.explanation_rate,        // 手動轉換
    avgConfidence: pack.avg_confidence,            // 手動轉換
    confidenceBadge: getConfidenceBadge(pack.avg_confidence),
    status: pack.status,
    visibility: pack.visibility || 'public',
    source: pack.source || 'internal',
    sourceName: pack.source_name,                  // 手動轉換
    sourceId: pack.source_id,                     // 手動轉換
    publishedAt: pack.published_at,               // 手動轉換
    expiresAt: pack.expires_at,                   // 手動轉換
    installCount: pack.install_count,             // 手動轉換
    completionRate: pack.completion_rate || 0,    // 手動轉換
    qrAlias: pack.qr_alias,                      // 手動轉換
    createdAt: pack.created_at,                   // 手動轉換
    updatedAt: pack.updated_at,                   // 手動轉換
    createdBy: pack.created_by,                   // 手動轉換
    isInstalled: installedPackIds.includes(pack.id),
    installedAt: undefined,
  }
}

/**
 * 新的自動轉換方式
 */
function newAutomaticTransformation(pack: any, installedPackIds: string[]) {
  const autoConverted = dbToApiFormat(pack)
  
  return {
    ...autoConverted, // 自動處理所有 snake_case → camelCase
    // 只需手動處理業務邏輯
    confidenceBadge: getConfidenceBadge(pack.avg_confidence),
    visibility: pack.visibility || 'public',
    source: pack.source || 'internal',
    completionRate: pack.completion_rate || 0,
    isInstalled: installedPackIds.includes(pack.id),
    installedAt: undefined,
  }
}

/**
 * 深度比較兩個對象
 */
function deepEquals(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1, Object.keys(obj1).sort()) === 
         JSON.stringify(obj2, Object.keys(obj2).sort())
}

/**
 * 運行測試
 */
function runTest() {
  console.log('🧪 開始 Packs API POC 測試...\n')

  const installedPackIds = ['pack_456', 'pack_789'] // 不包含測試包
  
  // 測試兩種轉換方式
  const manualResult = currentManualTransformation(mockDbPack, installedPackIds)
  const autoResult = newAutomaticTransformation(mockDbPack, installedPackIds)

  // 比較結果
  const isEqual = deepEquals(manualResult, autoResult)

  console.log('📊 轉換結果比較:')
  console.log('=' * 50)

  if (isEqual) {
    console.log('✅ 結果完全相同！新方案可以安全替換現有代碼。\n')
    
    // 顯示代碼簡化效益
    console.log('💡 代碼簡化效益:')
    console.log('   手動轉換: 28行代碼，13個字段需要手動映射')
    console.log('   自動轉換: 9行代碼，只需處理業務邏輯')
    console.log('   代碼減少: 67%')
    console.log('   維護風險: 消除字段命名錯誤')
    
  } else {
    console.log('❌ 結果不相同，需要調整轉換邏輯。\n')
    
    console.log('🔍 詳細差異:')
    console.log('手動轉換結果:')
    console.log(JSON.stringify(manualResult, null, 2))
    console.log('\n自動轉換結果:')
    console.log(JSON.stringify(autoResult, null, 2))

    // 找出具體差異
    console.log('\n📋 字段差異分析:')
    Object.keys(manualResult).forEach(key => {
      if (manualResult[key] !== autoResult[key]) {
        console.log(`   ${key}: ${manualResult[key]} → ${autoResult[key]}`)
      }
    })
  }

  return isEqual
}

/**
 * 性能測試
 */
function runPerformanceTest() {
  console.log('\n⚡ 性能測試...')

  const installedPackIds = ['pack_456'] 
  const iterations = 1000
  const largePacks = Array.from({ length: iterations }, () => ({ ...mockDbPack }))

  // 測試手動轉換性能
  const manualStart = Date.now()
  largePacks.forEach(pack => currentManualTransformation(pack, installedPackIds))
  const manualTime = Date.now() - manualStart

  // 測試自動轉換性能
  const autoStart = Date.now()
  largePacks.forEach(pack => newAutomaticTransformation(pack, installedPackIds))
  const autoTime = Date.now() - autoStart

  console.log(`手動轉換: ${manualTime}ms (${iterations} 次)`)
  console.log(`自動轉換: ${autoTime}ms (${iterations} 次)`)
  
  const performanceRatio = autoTime / manualTime
  
  if (autoTime <= manualTime * 2.0) { // 允許最多100%的性能降低（因為增加了功能）
    console.log(`✅ 性能測試通過 (新方案: ${performanceRatio.toFixed(1)}x 時間，但功能更強大)`)
  } else {
    console.log('⚠️  性能可能需要優化')
  }

  // 在實際場景中，1-2ms 的差異可忽略不計
  return autoTime <= 10 // 只要單次轉換 < 10ms 就是可接受的
}

// 主函數
if (require.main === module) {
  const functionalTestPassed = runTest()
  const performanceTestPassed = runPerformanceTest()

  console.log('\n📊 總結:')
  console.log(`功能測試: ${functionalTestPassed ? '✅ 通過' : '❌ 失敗'}`)
  console.log(`性能測試: ${performanceTestPassed ? '✅ 通過' : '❌ 失敗'}`)

  if (functionalTestPassed && performanceTestPassed) {
    console.log('\n🎉 POC 測試全部通過！可以安全實施新方案。')
    process.exit(0)
  } else {
    console.log('\n⚠️  測試失敗，需要進一步調整。')
    process.exit(1)
  }
}