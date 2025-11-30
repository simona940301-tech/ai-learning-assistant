#!/usr/bin/env tsx
/**
 * Chick API 測試工具
 * 
 * 測試 chick 相關的 API 端點
 * 使用 Supabase session 進行認證
 * 
 * Usage: 
 *   tsx scripts/test-chick-api.ts
 *   tsx scripts/test-chick-api.ts --hatch
 *   tsx scripts/test-chick-api.ts --status
 *   tsx scripts/test-chick-api.ts --whistle
 */

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

// 使用 mock user ID 或從環境變數讀取
const MOCK_USER_ID = process.env.MOCK_USER_ID || 'e770f9cd-52a7-43de-b983-70f6f78d2f53'

interface TestResult {
  name: string
  passed: boolean
  message: string
  data?: any
  error?: string
}

async function getAuthToken(): Promise<string | null> {
  // 使用 service role key 創建一個測試用的 session token
  // 注意：這僅用於開發測試，生產環境應使用真實的用戶認證
  try {
    // 嘗試獲取用戶的 session
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(MOCK_USER_ID)
    
    if (userError || !user) {
      console.warn('⚠️  無法獲取用戶，嘗試創建測試 session...')
      // 如果用戶不存在，嘗試創建一個測試 session
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.admin.createSession({
          userId: MOCK_USER_ID,
        })
        if (!sessionError && session) {
          console.log('✅ 成功創建測試 session')
          return session.access_token
        }
      } catch (e) {
        // 忽略創建 session 的錯誤
      }
      console.warn('⚠️  將嘗試使用 cookie-based 認證（需要瀏覽器 session）')
      return null
    }

    // 創建一個測試用的 access token
    const { data: { session }, error: sessionError } = await supabase.auth.admin.createSession({
      userId: MOCK_USER_ID,
    })

    if (sessionError || !session) {
      console.warn('⚠️  無法創建 session，將嘗試無認證測試')
      return null
    }

    console.log('✅ 成功獲取認證 token')
    return session.access_token
  } catch (err) {
    console.warn('⚠️  認證過程發生錯誤，將嘗試無認證測試')
    return null
  }
}

async function testHatchAPI(token: string | null): Promise<TestResult> {
  console.log('🥚 測試 Hatch API...')
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${baseUrl}/api/chick/hatch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chickName: 'TestChick',
        userNickname: 'TestUser',
      }),
    })

    const data = await response.json()

    if (response.status === 409 && data.error === 'ALREADY_HATCHED') {
      return {
        name: 'Hatch API',
        passed: true,
        message: '✅ Hatch API 正常運作（用戶已孵化）',
        data: data.data,
      }
    }

    if (response.ok && data.success) {
      return {
        name: 'Hatch API',
        passed: true,
        message: '✅ Hatch API 成功執行',
        data: data.data,
      }
    }

    if (response.status === 401) {
      return {
        name: 'Hatch API',
        passed: false,
        message: '❌ Hatch API 認證失敗（需要有效的 session token）',
        error: data.error || 'UNAUTHORIZED',
        details: '提示：在瀏覽器中登入後，從 Network 標籤獲取 Authorization header 中的 token',
      }
    }

    return {
      name: 'Hatch API',
      passed: false,
      message: `❌ Hatch API 返回錯誤 (${response.status})`,
      error: data.error || JSON.stringify(data),
    }
  } catch (err) {
    return {
      name: 'Hatch API',
      passed: false,
      message: '❌ Hatch API 請求失敗',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function testStatusAPI(token: string | null): Promise<TestResult> {
  console.log('📊 測試 Status API...')
  
  const headers: Record<string, string> = {}
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${baseUrl}/api/chick/status`, {
      method: 'GET',
      headers,
    })

    const data = await response.json()

    if (response.ok) {
      const hasRequiredFields = 
        'chickName' in data &&
        'userNickname' in data &&
        'hatchedAt' in data &&
        'lastSeenAt' in data &&
        'daysSinceLastSeen' in data &&
        'reunionState' in data

      return {
        name: 'Status API',
        passed: hasRequiredFields,
        message: hasRequiredFields
          ? '✅ Status API 正常運作，包含所有必要欄位'
          : '⚠️  Status API 運作中，但缺少部分欄位',
        data: {
          chickName: data.chickName,
          userNickname: data.userNickname,
          hatchedAt: data.hatchedAt,
          lastSeenAt: data.lastSeenAt,
          daysSinceLastSeen: data.daysSinceLastSeen,
          reunionState: data.reunionState,
        },
      }
    }

    if (response.status === 401) {
      return {
        name: 'Status API',
        passed: false,
        message: '❌ Status API 認證失敗（需要有效的 session token）',
        error: data.error || 'UNAUTHORIZED',
        details: '提示：在瀏覽器中登入後，從 Network 標籤獲取 Authorization header 中的 token',
      }
    }

    return {
      name: 'Status API',
      passed: false,
      message: `❌ Status API 返回錯誤 (${response.status})`,
      error: data.error || JSON.stringify(data),
    }
  } catch (err) {
    return {
      name: 'Status API',
      passed: false,
      message: '❌ Status API 請求失敗',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function testWhistleAPI(token: string | null): Promise<TestResult> {
  console.log('🔔 測試 Whistle API...')
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${baseUrl}/api/chick/reunion/whistle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ cost: 50 }),
    })

    const data = await response.json()

    if (response.ok && data.success) {
      return {
        name: 'Whistle API',
        passed: true,
        message: '✅ Whistle API 成功執行',
        data: data.data,
      }
    }

    if (response.status === 400 && data.error === 'INSUFFICIENT_FUNDS') {
      return {
        name: 'Whistle API',
        passed: true,
        message: '✅ Whistle API 正常運作（餘額不足是預期行為）',
        data: { error: 'INSUFFICIENT_FUNDS' },
      }
    }

    if (response.status === 401) {
      return {
        name: 'Whistle API',
        passed: false,
        message: '❌ Whistle API 認證失敗（需要有效的 session token）',
        error: data.error || 'UNAUTHORIZED',
        details: '提示：在瀏覽器中登入後，從 Network 標籤獲取 Authorization header 中的 token',
      }
    }

    return {
      name: 'Whistle API',
      passed: false,
      message: `❌ Whistle API 返回錯誤 (${response.status})`,
      error: data.error || JSON.stringify(data),
    }
  } catch (err) {
    return {
      name: 'Whistle API',
      passed: false,
      message: '❌ Whistle API 請求失敗',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const testHatch = args.includes('--hatch') || args.length === 0
  const testStatus = args.includes('--status') || args.length === 0
  const testWhistle = args.includes('--whistle') || args.length === 0

  console.log('🧪 Chick API 測試工具')
  console.log('=====================================\n')
  console.log(`📍 Base URL: ${baseUrl}`)
  console.log(`👤 Test User ID: ${MOCK_USER_ID}\n`)

  const token = await getAuthToken()
  if (!token) {
    console.warn('⚠️  無法獲取認證 token，將進行無認證測試')
    console.warn('   注意：某些 API 可能需要認證，這會導致 401 錯誤')
    console.warn('   建議：在瀏覽器中登入後，從瀏覽器開發者工具獲取 session token\n')
  }

  const results: TestResult[] = []

  if (testHatch) {
    results.push(await testHatchAPI(token))
  }

  if (testStatus) {
    results.push(await testStatusAPI(token))
  }

  if (testWhistle) {
    results.push(await testWhistleAPI(token))
  }

  console.log('\n📋 測試結果:')
  console.log('=====================================')

  let passedCount = 0
  let failedCount = 0

  for (const result of results) {
    console.log(`\n${result.message}`)
    if (result.data) {
      console.log(`   資料: ${JSON.stringify(result.data, null, 2)}`)
    }
    if (result.error) {
      console.log(`   錯誤: ${result.error}`)
    }
    if ((result as any).details) {
      console.log(`   ${(result as any).details}`)
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
    console.log('✨ 所有 API 測試通過！')
    process.exit(0)
  } else {
    console.log('⚠️  部分 API 測試失敗。')
    console.log('\n提示:')
    console.log('  - 確認開發伺服器正在運行 (npm run dev)')
    console.log('  - 確認已執行資料庫遷移')
    console.log('  - 確認環境變數設定正確')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ 測試過程發生錯誤:', error)
  process.exit(1)
})

