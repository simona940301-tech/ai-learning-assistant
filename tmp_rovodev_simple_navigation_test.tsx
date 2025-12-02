// 簡單測試組件來診斷導航問題
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SimpleNavigationTest() {
  const router = useRouter()
  const [status, setStatus] = useState('')

  const testNavigation = async () => {
    try {
      setStatus('開始導航測試...')
      console.log('Starting navigation test...')
      
      // 方法 1: 基本 push
      setStatus('嘗試 router.push...')
      await router.push('/onboarding/reward')
      setStatus('router.push 完成')
      console.log('router.push completed')
      
    } catch (error) {
      setStatus(`導航錯誤: ${error.message}`)
      console.error('Navigation error:', error)
      
      // 方法 2: 備用導航
      try {
        setStatus('嘗試 window.location...')
        window.location.href = '/onboarding/reward'
      } catch (windowError) {
        setStatus(`所有導航方法都失敗: ${windowError.message}`)
        console.error('All navigation failed:', windowError)
      }
    }
  }

  const testRewardPageAccess = async () => {
    try {
      setStatus('測試 reward 頁面可訪問性...')
      const response = await fetch('/onboarding/reward', { method: 'HEAD' })
      setStatus(`頁面狀態: ${response.status} ${response.statusText}`)
    } catch (error) {
      setStatus(`頁面訪問錯誤: ${error.message}`)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h3>導航測試工具</h3>
      <div style={{ marginBottom: '10px' }}>
        狀態: {status}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', maxWidth: '300px' }}>
        <button onClick={testNavigation} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none' }}>
          測試導航到 /onboarding/reward
        </button>
        <button onClick={testRewardPageAccess} style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none' }}>
          測試 reward 頁面可訪問性
        </button>
        <button onClick={() => window.open('/onboarding/reward', '_blank')} style={{ padding: '10px', background: '#6c757d', color: 'white', border: 'none' }}>
          在新視窗開啟 reward 頁面
        </button>
      </div>
    </div>
  )
}