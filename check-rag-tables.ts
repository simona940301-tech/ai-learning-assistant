/**
 * 檢查 RAG 相關表是否存在
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://umzqjgxsetsmwzhniemw.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function checkTables() {
  console.log('🔍 檢查 RAG 相關資料庫表...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // 檢查 rag_documents 表
  console.log('1. 檢查 rag_documents 表')
  try {
    const { data, error } = await supabase
      .from('rag_documents')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ rag_documents 表不存在或無法訪問')
      console.error('   錯誤詳情:', error.message)
      console.error('   錯誤代碼:', error.code)
    } else {
      console.log('✅ rag_documents 表存在')
    }
  } catch (err) {
    console.error('❌ 查詢出錯:', err)
  }

  console.log('')

  // 檢查 notebook_entries 表
  console.log('2. 檢查 notebook_entries 表')
  try {
    const { data, error } = await supabase
      .from('notebook_entries')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ notebook_entries 表不存在或無法訪問')
      console.error('   錯誤詳情:', error.message)
      console.error('   錯誤代碼:', error.code)
    } else {
      console.log('✅ notebook_entries 表存在')
    }
  } catch (err) {
    console.error('❌ 查詢出錯:', err)
  }

  console.log('\n' + '='.repeat(60))
  console.log('診斷建議：')
  console.log('='.repeat(60))
  console.log('')
  console.log('如果看到 "relation does not exist" 錯誤：')
  console.log('  → 需要執行 migration')
  console.log('  → 命令: supabase db push')
  console.log('')
  console.log('或者手動執行 SQL:')
  console.log('  1. 前往 Supabase Dashboard')
  console.log('  2. 進入 SQL Editor')
  console.log('  3. 執行: supabase/migrations/20251123_create_rag_notebook_schema.sql')
  console.log('')
  console.log('如果看到 "permission denied" 錯誤：')
  console.log('  → 檢查 RLS 政策是否正確設置')
  console.log('  → 使用 service_role key 可繞過 RLS')
  console.log('')
}

checkTables().catch((err) => {
  console.error('執行失敗:', err)
  process.exit(1)
})
