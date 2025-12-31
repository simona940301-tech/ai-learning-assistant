// 測試認證流程的完整性
import { supabaseBrowser } from '@/lib/supabase'

export async function testAuthFlow() {
  console.log('🔍 Testing Authentication Flow...')
  
  // 1. 檢查當前環境變數
  console.log('📋 Environment Check:')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('NEXT_PUBLIC_DISABLE_MOCK_USER:', process.env.NEXT_PUBLIC_DISABLE_MOCK_USER)
  console.log('NEXT_PUBLIC_PREVIEW_FORCE_MOCK:', process.env.NEXT_PUBLIC_PREVIEW_FORCE_MOCK)
  
  // 2. 檢查 Mock User 是否啟用
  const USE_MOCK_USER = (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_PREVIEW_FORCE_MOCK === 'true'
  ) && process.env.NEXT_PUBLIC_DISABLE_MOCK_USER !== 'true'
  
  console.log('🎭 Mock User Enabled:', USE_MOCK_USER)
  
  // 3. 檢查當前 session 狀態
  const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession()
  console.log('🔐 Current Session:', {
    hasSession: !!sessionData?.session,
    hasUser: !!sessionData?.session?.user,
    error: sessionError?.message
  })
  
  // 4. 檢查當前用戶
  const { data: userData, error: userError } = await supabaseBrowser.auth.getUser()
  console.log('👤 Current User:', {
    hasUser: !!userData?.user,
    userId: userData?.user?.id,
    email: userData?.user?.email,
    error: userError?.message
  })
  
  // 5. 如果有用戶，檢查 profile
  if (userData?.user) {
    const { data: profileData, error: profileError } = await supabaseBrowser
      .from('profiles')
      .select('onboarding_completed, created_at')
      .eq('id', userData.user.id)
      .single()
    
    console.log('📝 Profile Data:', {
      exists: !!profileData,
      onboardingCompleted: profileData?.onboarding_completed,
      error: profileError?.message
    })
  }
  
  return {
    mockUserEnabled: USE_MOCK_USER,
    hasValidSession: !!sessionData?.session && !sessionError,
    hasUser: !!userData?.user && !userError,
    userId: userData?.user?.id
  }
}