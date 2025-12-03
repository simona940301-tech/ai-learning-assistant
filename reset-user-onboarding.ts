/**
 * 重置用戶 Onboarding 狀態工具
 *
 * 用途：將已完成 onboarding 的用戶重置為新用戶狀態，方便測試
 *
 * 使用方法：
 * npx tsx reset-user-onboarding.ts <user_email>
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'

// 載入環境變數
dotenv.config({ path: path.join(__dirname, 'apps/web/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question + ' (yes/no): ', (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

async function resetUserOnboarding(email: string) {
  console.log('\n🔄 準備重置用戶 Onboarding 狀態...\n')
  console.log('━'.repeat(80))

  try {
    // 1. 查詢用戶
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ 查詢失敗:', authError)
      return
    }

    const user = authUser.users.find(u => u.email === email)

    if (!user) {
      console.log(`❌ 找不到用戶: ${email}`)
      return
    }

    console.log('📧 找到用戶:')
    console.log(`  Email: ${user.email}`)
    console.log(`  ID: ${user.id}`)
    console.log('')

    // 2. 查詢當前狀態
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, avatar_url, target_university, target_department')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      console.log('❌ 找不到 profile')
      return
    }

    console.log('📊 當前狀態:')
    console.log(`  Onboarding Completed: ${profile.onboarding_completed ? '✅ 是' : '❌ 否'}`)
    console.log(`  Avatar URL: ${profile.avatar_url || '（未設置）'}`)
    console.log(`  Target University: ${profile.target_university || '（未設置）'}`)
    console.log(`  Target Department: ${profile.target_department || '（未設置）'}`)
    console.log('')

    // 3. 查詢 sessions
    const { data: sessions } = await supabase
      .from('onboarding_sessions')
      .select('id, status, current_step')
      .eq('user_id', user.id)

    console.log(`📝 Onboarding Sessions: ${sessions?.length || 0} 個`)
    console.log('')

    // 4. 確認操作
    if (!profile.onboarding_completed && !sessions?.length) {
      console.log('ℹ️  此用戶已經是新用戶狀態，無需重置')
      return
    }

    console.log('⚠️  警告：此操作將會：')
    console.log('  1. 設置 onboarding_completed = false')
    console.log('  2. 清除 avatar_url')
    console.log('  3. 清除 target_university / target_department')
    console.log(`  4. 刪除 ${sessions?.length || 0} 個 onboarding sessions`)
    console.log('  5. 刪除相關的學習計畫筆記（如果有）')
    console.log('')

    const confirmed = await askConfirmation('確定要繼續嗎？')

    if (!confirmed) {
      console.log('❌ 操作已取消')
      return
    }

    console.log('')
    console.log('🔄 開始重置...')
    console.log('')

    // 5. 執行重置
    // 5.1 重置 profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: false,
        avatar_url: null,
        target_university: null,
        target_department: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('❌ 更新 profile 失敗:', profileError)
      return
    }
    console.log('✅ Profile 已重置')

    // 5.2 刪除 onboarding sessions
    if (sessions && sessions.length > 0) {
      const { error: sessionError } = await supabase
        .from('onboarding_sessions')
        .delete()
        .eq('user_id', user.id)

      if (sessionError) {
        console.error('❌ 刪除 sessions 失敗:', sessionError)
        return
      }
      console.log(`✅ 已刪除 ${sessions.length} 個 onboarding sessions`)
    }

    // 5.3 刪除學習計畫筆記
    const { error: notesError } = await supabase
      .from('backpack_notes')
      .delete()
      .eq('user_id', user.id)
      .eq('question', '我的專屬學習計畫')

    if (notesError) {
      console.warn('⚠️  刪除學習計畫失敗（可能不存在）:', notesError.message)
    } else {
      console.log('✅ 已刪除學習計畫筆記')
    }

    // 5.4 刪除 task config
    const { error: taskConfigError } = await supabase
      .from('onboarding_task_configs')
      .delete()
      .eq('user_id', user.id)

    if (taskConfigError) {
      console.warn('⚠️  刪除 task config 失敗（可能不存在）:', taskConfigError.message)
    } else {
      console.log('✅ 已刪除 task config')
    }

    console.log('')
    console.log('━'.repeat(80))
    console.log('✅ 重置完成！')
    console.log('')
    console.log('下一步：')
    console.log('  1. 登出所有帳號')
    console.log('  2. 清除瀏覽器 localStorage 和 sessionStorage')
    console.log('  3. 重新打開網站，使用此 Email 登入')
    console.log('  4. 應該會進入 onboarding 流程')
    console.log('')

  } catch (error) {
    console.error('❌ 重置過程發生錯誤:', error)
  }
}

// Main execution
const email = process.argv[2]

if (!email) {
  console.log('使用方法: npx tsx reset-user-onboarding.ts <user_email>')
  console.log('範例: npx tsx reset-user-onboarding.ts test@example.com')
  process.exit(1)
}

resetUserOnboarding(email).then(() => {
  process.exit(0)
})
