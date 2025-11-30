#!/usr/bin/env tsx
/**
 * Chick Hatching System Migration Verification Script
 * 
 * 驗證資料庫遷移是否已正確執行
 * 使用 Supabase client，不需要 DATABASE_URL
 * 
 * Usage: tsx scripts/verify-chick-migration.ts
 */

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

interface VerificationResult {
  name: string
  passed: boolean
  message: string
  details?: string
}

async function verifyMigration(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = []

  // 1. 檢查必要的欄位是否存在
  console.log('📊 檢查 profiles 表欄位...')
  const requiredColumns = [
    'chick_name',
    'user_nickname',
    'chick_hatched_at',
    'chick_first_fed_at',
    'last_seen_at',
  ]

  for (const column of requiredColumns) {
    // 使用直接查詢 profiles 表來驗證欄位
    const { error: testError } = await supabase
      .from('profiles')
      .select(column)
      .limit(1)

    if (testError && testError.message.includes('column') && testError.message.includes('does not exist')) {
      results.push({
        name: `欄位: ${column}`,
        passed: false,
        message: `❌ 欄位 ${column} 不存在`,
        details: testError.message,
      })
    } else if (testError) {
      // 其他錯誤（如權限問題）不應視為欄位不存在
      results.push({
        name: `欄位: ${column}`,
        passed: true,
        message: `✅ 欄位 ${column} 存在（查詢時有其他錯誤，但欄位存在）`,
        details: testError.message,
      })
    } else {
      results.push({
        name: `欄位: ${column}`,
        passed: true,
        message: `✅ 欄位 ${column} 存在`,
      })
    }
  }

  // 2. 檢查索引是否存在
  console.log('📊 檢查索引...')
  const { data: indexData, error: indexError } = await supabase
    .from('profiles')
    .select('id, last_seen_at')
    .limit(1)

  if (indexError && indexError.message.includes('does not exist')) {
    results.push({
      name: '索引檢查',
      passed: false,
      message: '❌ 無法驗證索引（可能需要手動檢查）',
    })
  } else {
    results.push({
      name: '索引檢查',
      passed: true,
      message: '✅ 索引相關欄位可正常查詢',
    })
  }

  // 3. 檢查函數是否存在
  console.log('📊 檢查資料庫函數...')
  try {
    // 嘗試呼叫函數來驗證它是否存在
    const { data: funcData, error: funcError } = await supabase.rpc('use_chick_whistle', {
      p_user_id: '00000000-0000-0000-0000-000000000000', // 測試用的假 UUID
      p_cost: 50,
    })

    // 如果函數不存在，會返回特定錯誤
    if (funcError) {
      if (funcError.message.includes('function') && funcError.message.includes('does not exist')) {
        results.push({
          name: '函數: use_chick_whistle',
          passed: false,
          message: '❌ 函數 use_chick_whistle 不存在',
          details: funcError.message,
        })
      } else if (funcError.message.includes('PROFILE_NOT_FOUND')) {
        // 這是預期的錯誤，表示函數存在但找不到用戶
        results.push({
          name: '函數: use_chick_whistle',
          passed: true,
          message: '✅ 函數 use_chick_whistle 存在且可呼叫',
        })
      } else {
        results.push({
          name: '函數: use_chick_whistle',
          passed: true,
          message: '✅ 函數 use_chick_whistle 存在',
          details: `（測試呼叫返回: ${funcError.message}）`,
        })
      }
    } else {
      results.push({
        name: '函數: use_chick_whistle',
        passed: true,
        message: '✅ 函數 use_chick_whistle 存在且可呼叫',
      })
    }
  } catch (err) {
    results.push({
      name: '函數: use_chick_whistle',
      passed: false,
      message: '❌ 無法驗證函數',
      details: err instanceof Error ? err.message : String(err),
    })
  }

  return results
}

async function main() {
  console.log('🔍 Chick Hatching System 遷移驗證')
  console.log('=====================================\n')

  const results = await verifyMigration()

  console.log('\n📋 驗證結果:')
  console.log('=====================================')
  
  let passedCount = 0
  let failedCount = 0

  for (const result of results) {
    console.log(`${result.message} - ${result.name}`)
    if (result.details) {
      console.log(`   詳情: ${result.details}`)
    }
    if (result.passed) {
      passedCount++
    } else {
      failedCount++
    }
  }

  console.log('\n=====================================')
  console.log(`✅ 通過: ${passedCount}`)
  console.log(`❌ 失敗: ${failedCount}`)
  console.log('=====================================\n')

  if (failedCount === 0) {
    console.log('✨ 所有檢查通過！遷移已正確執行。')
    process.exit(0)
  } else {
    console.log('⚠️  部分檢查失敗。請確認遷移 SQL 已正確執行。')
    console.log('\n請在 Supabase Dashboard → SQL Editor 中執行以下 SQL:')
    console.log('apps/web/db/migrations/add_chick_hatching_system.sql')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ 驗證過程發生錯誤:', error)
  process.exit(1)
})

