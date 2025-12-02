// 真實認證測試組件
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabaseBrowser } from '@/lib/supabase'

export function AuthFlowTester() {
  const [testResults, setTestResults] = useState<any>({})
  const { user, loading, signInWithOAuth } = useAuth()
  
  useEffect(() => {
    async function runTests() {
      const results = {
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          mockDisabled: process.env.NEXT_PUBLIC_DISABLE_MOCK_USER,
          previewMock: process.env.NEXT_PUBLIC_PREVIEW_FORCE_MOCK
        },
        authState: {
          userExists: !!user,
          userId: user?.id,
          email: user?.email,
          loading
        }
      }
      
      // 檢查 session
      try {
        const { data: sessionData, error } = await supabaseBrowser.auth.getSession()
        results.session = {
          hasSession: !!sessionData?.session,
          error: error?.message,
          accessToken: !!sessionData?.session?.access_token
        }
      } catch (err) {
        results.session = { error: err.message }
      }
      
      // 檢查 profile
      if (user) {
        try {
          const { data: profileData, error } = await supabaseBrowser
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            
          results.profile = {
            exists: !!profileData,
            onboardingCompleted: profileData?.onboarding_completed,
            error: error?.message
          }
        } catch (err) {
          results.profile = { error: err.message }
        }
      }
      
      setTestResults(results)
      console.log('🔍 Auth Flow Test Results:', results)
    }
    
    if (!loading) {
      runTests()
    }
  }, [user, loading])
  
  const handleGoogleLogin = async () => {
    try {
      console.log('🚀 Starting Google OAuth...')
      await signInWithOAuth('google')
    } catch (error) {
      console.error('❌ Google login failed:', error)
    }
  }
  
  return (
    <div className="p-6 bg-white shadow rounded-lg">
      <h2 className="text-xl font-bold mb-4">🔍 認證流程測試面板</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">環境狀態</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(testResults.environment, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">認證狀態</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(testResults.authState, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Session 狀態</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(testResults.session, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Profile 狀態</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(testResults.profile, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mt-4 space-x-2">
        <button
          onClick={handleGoogleLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          測試 Google 登入
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          重新載入
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-semibold text-yellow-800">測試指示:</h4>
        <ol className="text-sm text-yellow-700 mt-1 list-decimal list-inside">
          <li>確認 Mock User 已停用 (mockDisabled: true)</li>
          <li>點擊 "測試 Google 登入" 進行真實 OAuth</li>
          <li>完成 Google 認證後檢查狀態變化</li>
          <li>確認 session 和 profile 正確建立</li>
        </ol>
      </div>
    </div>
  )
}