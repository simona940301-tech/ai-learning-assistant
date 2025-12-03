/**
 * Onboarding 診斷工具
 *
 * 用途：檢查用戶的 onboarding 狀態，診斷為何會被識別為老用戶
 *
 * 使用方法：
 * 1. 設置環境變數（.env.local）
 * 2. npx tsx diagnose-onboarding.ts <user_email>
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 載入環境變數
dotenv.config({ path: path.join(__dirname, 'apps/web/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數：')
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseUser(email: string) {
  console.log('\n🔍 診斷用戶 onboarding 狀態...\n')
  console.log('━'.repeat(80))

  try {
    // 1. 查詢 auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ 查詢 auth.users 失敗:', authError)
      return
    }

    const user = authUser.users.find(u => u.email === email)

    if (!user) {
      console.log(`❌ 找不到用戶: ${email}`)
      console.log('\n可用的用戶列表：')
      authUser.users.forEach(u => {
        console.log(`  - ${u.email} (${u.id})`)
      })
      return
    }

    console.log('📧 用戶基本資訊:')
    console.log(`  Email: ${user.email}`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Created: ${user.created_at}`)
    console.log(`  Last Sign In: ${user.last_sign_in_at || '從未登入'}`)
    console.log('')

    // 2. 查詢 profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('❌ 查詢 profiles 失敗:', profileError)
      return
    }

    if (!profile) {
      console.log('⚠️  用戶 profile 不存在！')
      console.log('   這表示 handle_new_user trigger 可能沒有正常執行')
      return
    }

    console.log('👤 Profile 狀態:')
    console.log(`  Username: ${profile.username}`)
    console.log(`  Onboarding Completed: ${profile.onboarding_completed ? '✅ 是（老用戶）' : '❌ 否（新用戶）'}`)
    console.log(`  Created At: ${profile.created_at}`)
    console.log(`  Avatar URL: ${profile.avatar_url || '（未設置）'}`)
    console.log(`  Daily Energy: ${profile.daily_energy}`)
    console.log(`  XP: ${profile.xp}`)
    console.log(`  Coins: ${profile.user_wallet_balance}`)
    console.log('')

    // 3. 查詢 onboarding_sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (sessionError) {
      console.error('❌ 查詢 onboarding_sessions 失敗:', sessionError)
      return
    }

    console.log(`📝 Onboarding Sessions (${sessions?.length || 0} 個):`)
    if (!sessions || sessions.length === 0) {
      console.log('  （無任何 onboarding session）')
    } else {
      sessions.forEach((session, index) => {
        console.log(`\n  Session ${index + 1} (${session.id}):`)
        console.log(`    Status: ${session.status}`)
        console.log(`    Current Step: ${session.current_step}`)
        console.log(`    Challenge Completed: ${session.challenge_completed_at ? '✅' : '❌'}`)
        console.log(`    Challenge Score: ${session.challenge_score ?? 'N/A'}`)
        console.log(`    Scorecard Submitted: ${session.scorecard_submitted_at ? '✅' : '❌'}`)
        console.log(`    Created: ${session.created_at}`)
      })
    }
    console.log('')

    // 4. 判斷問題
    console.log('━'.repeat(80))
    console.log('\n🎯 診斷結果:\n')

    if (profile.onboarding_completed) {
      console.log('❌ 問題：用戶被標記為「已完成 onboarding」')
      console.log('')
      console.log('可能原因：')
      console.log('  1. 這是一個已經存在的老用戶（正常情況）')
      console.log('  2. 在測試時手動設置了 onboarding_completed = true')
      console.log('  3. onboarding/complete 頁面錯誤地設置了 flag')
      console.log('')
      console.log('解決方案：')
      console.log('  方案 1: 使用全新的 Email 註冊（建議）')
      console.log('  方案 2: 手動重置此用戶的 onboarding 狀態：')
      console.log(`    UPDATE profiles SET onboarding_completed = false WHERE id = '${user.id}';`)
      console.log(`    DELETE FROM onboarding_sessions WHERE user_id = '${user.id}';`)
    } else {
      console.log('✅ 用戶狀態正常：onboarding_completed = false')
      console.log('')

      if (!sessions || sessions.length === 0) {
        console.log('⚠️  但是沒有 onboarding session 記錄')
        console.log('   這表示：')
        console.log('   - 用戶剛創建，還沒開始 onboarding')
        console.log('   - 或是匿名資料遷移失敗')
      } else {
        const activeSession = sessions.find(s => s.status === 'in_progress')
        if (activeSession) {
          console.log('✅ 有進行中的 onboarding session')
          console.log(`   應該導向的頁面：`)

          if (activeSession.scorecard_submitted_at) {
            console.log('   → /onboarding/complete')
          } else if (activeSession.challenge_completed_at) {
            console.log('   → /onboarding/reward 或 /onboarding/habits')
          } else if (profile.avatar_url) {
            console.log('   → /onboarding/challenge')
          } else if (activeSession.current_step >= 1) {
            console.log('   → /onboarding/avatar')
          } else {
            console.log('   → /onboarding/goal')
          }
        } else {
          console.log('⚠️  所有 sessions 都已完成或取消')
          console.log('   但 onboarding_completed 仍為 false')
          console.log('   這是不一致的狀態！')
        }
      }
    }

    console.log('')
    console.log('━'.repeat(80))

  } catch (error) {
    console.error('❌ 診斷過程發生錯誤:', error)
  }
}

// Main execution
const email = process.argv[2]

if (!email) {
  console.log('使用方法: npx tsx diagnose-onboarding.ts <user_email>')
  console.log('範例: npx tsx diagnose-onboarding.ts test@example.com')
  process.exit(1)
}

diagnoseUser(email).then(() => {
  console.log('\n✅ 診斷完成\n')
  process.exit(0)
})
