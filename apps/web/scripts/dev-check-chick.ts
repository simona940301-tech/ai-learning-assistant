#!/usr/bin/env tsx
/**
 * 開發環境檢查工具 - Chick System
 * 
 * 整合所有檢查：遷移驗證、API 測試、環境變數檢查
 * 
 * Usage: tsx scripts/dev-check-chick.ts
 */

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface CheckResult {
  category: string
  name: string
  passed: boolean
  message: string
  details?: string
}

async function checkEnvironmentVariables(): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  const optional = [
    'NEXT_PUBLIC_APP_URL',
    'MOCK_USER_ID',
  ]

  for (const key of required) {
    const value = process.env[key]
    results.push({
      category: '環境變數',
      name: key,
      passed: !!value,
      message: value ? `✅ ${key} 已設定` : `❌ ${key} 未設定`,
    })
  }

  for (const key of optional) {
    const value = process.env[key]
    results.push({
      category: '環境變數',
      name: key,
      passed: true,
      message: value ? `✅ ${key} 已設定` : `⚠️  ${key} 未設定（可選）`,
    })
  }

  return results
}

async function checkDatabaseConnection(): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  if (!supabaseUrl || !serviceRoleKey) {
    results.push({
      category: '資料庫連線',
      name: 'Supabase Client',
      passed: false,
      message: '❌ 無法建立 Supabase client（缺少環境變數）',
    })
    return results
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // 測試連線
    const { data, error } = await supabase.from('profiles').select('id').limit(1)

    if (error) {
      results.push({
        category: '資料庫連線',
        name: 'Supabase 連線',
        passed: false,
        message: `❌ 無法連線到 Supabase: ${error.message}`,
      })
    } else {
      results.push({
        category: '資料庫連線',
        name: 'Supabase 連線',
        passed: true,
        message: '✅ Supabase 連線正常',
      })
    }
  } catch (err) {
    results.push({
      category: '資料庫連線',
      name: 'Supabase 連線',
      passed: false,
      message: `❌ 連線錯誤: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  return results
}

async function checkMigration(): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  if (!supabaseUrl || !serviceRoleKey) {
    return results
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const requiredColumns = [
    'chick_name',
    'user_nickname',
    'chick_hatched_at',
    'chick_first_fed_at',
    'last_seen_at',
  ]

  for (const column of requiredColumns) {
    const { error } = await supabase.from('profiles').select(column).limit(1)

    if (error && error.message.includes('does not exist')) {
      results.push({
        category: '資料庫遷移',
        name: `欄位: ${column}`,
        passed: false,
        message: `❌ 欄位 ${column} 不存在`,
      })
    } else {
      results.push({
        category: '資料庫遷移',
        name: `欄位: ${column}`,
        passed: true,
        message: `✅ 欄位 ${column} 存在`,
      })
    }
  }

  // 檢查函數
  try {
    const { error } = await supabase.rpc('use_chick_whistle', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_cost: 50,
    })

    if (error && error.message.includes('does not exist')) {
      results.push({
        category: '資料庫遷移',
        name: '函數: use_chick_whistle',
        passed: false,
        message: '❌ 函數 use_chick_whistle 不存在',
      })
    } else {
      results.push({
        category: '資料庫遷移',
        name: '函數: use_chick_whistle',
        passed: true,
        message: '✅ 函數 use_chick_whistle 存在',
      })
    }
  } catch (err) {
    results.push({
      category: '資料庫遷移',
      name: '函數: use_chick_whistle',
      passed: false,
      message: '❌ 無法驗證函數',
      details: err instanceof Error ? err.message : String(err),
    })
  }

  return results
}

async function checkAPIServer(): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  try {
    const response = await fetch(`${baseUrl}/api/chick/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok || response.status === 401) {
      results.push({
        category: 'API 伺服器',
        name: 'API 端點可達性',
        passed: true,
        message: `✅ API 伺服器正常運作 (${response.status})`,
      })
    } else {
      results.push({
        category: 'API 伺服器',
        name: 'API 端點可達性',
        passed: false,
        message: `❌ API 伺服器返回錯誤 (${response.status})`,
      })
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      results.push({
        category: 'API 伺服器',
        name: 'API 端點可達性',
        passed: false,
        message: '❌ API 伺服器連線超時（確認開發伺服器是否運行）',
      })
    } else {
      results.push({
        category: 'API 伺服器',
        name: 'API 端點可達性',
        passed: false,
        message: `❌ 無法連線到 API 伺服器: ${err instanceof Error ? err.message : String(err)}`,
        details: `請確認開發伺服器正在運行: npm run dev`,
      })
    }
  }

  return results
}

async function checkComponentFiles(): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  const requiredFiles = [
    'components/chick/ReunionModal.tsx',
    'components/chick/ReunionGate.tsx',
    'components/chick/HatchingCeremony.tsx',
    'src/store/chickStore.ts',
  ]

  const fs = await import('fs')
  const path = await import('path')

  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file)
    const exists = fs.existsSync(filePath)

    results.push({
      category: '檔案檢查',
      name: path.basename(file),
      passed: exists,
      message: exists ? `✅ ${file} 存在` : `❌ ${file} 不存在`,
    })
  }

  return results
}

async function main() {
  console.log('🔍 Chick System 開發環境檢查')
  console.log('=====================================\n')

  const allResults: CheckResult[] = []

  // 1. 環境變數檢查
  console.log('📋 檢查環境變數...')
  allResults.push(...(await checkEnvironmentVariables()))

  // 2. 資料庫連線檢查
  console.log('📋 檢查資料庫連線...')
  allResults.push(...(await checkDatabaseConnection()))

  // 3. 遷移檢查
  console.log('📋 檢查資料庫遷移...')
  allResults.push(...(await checkMigration()))

  // 4. API 伺服器檢查
  console.log('📋 檢查 API 伺服器...')
  allResults.push(...(await checkAPIServer()))

  // 5. 檔案檢查
  console.log('📋 檢查必要檔案...')
  allResults.push(...(await checkComponentFiles()))

  // 顯示結果
  console.log('\n📊 檢查結果摘要')
  console.log('=====================================')

  const byCategory = allResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = []
    }
    acc[result.category].push(result)
    return acc
  }, {} as Record<string, CheckResult[]>)

  for (const [category, results] of Object.entries(byCategory)) {
    console.log(`\n${category}:`)
    for (const result of results) {
      console.log(`  ${result.message}`)
      if (result.details) {
        console.log(`    ${result.details}`)
      }
    }
  }

  const passedCount = allResults.filter(r => r.passed).length
  const failedCount = allResults.filter(r => !r.passed).length

  console.log('\n=====================================')
  console.log(`✅ 通過: ${passedCount}`)
  console.log(`❌ 失敗: ${failedCount}`)
  console.log('=====================================\n')

  if (failedCount === 0) {
    console.log('✨ 所有檢查通過！開發環境已就緒。')
    console.log('\n下一步:')
    console.log('  1. 啟動開發伺服器: npm run dev')
    console.log('  2. 測試 API: tsx scripts/test-chick-api.ts')
    process.exit(0)
  } else {
    console.log('⚠️  部分檢查失敗。請根據上述結果進行修復。')
    console.log('\n建議步驟:')
    console.log('  1. 確認環境變數設定正確')
    console.log('  2. 執行資料庫遷移（如未執行）')
    console.log('  3. 啟動開發伺服器: npm run dev')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ 檢查過程發生錯誤:', error)
  process.exit(1)
})

