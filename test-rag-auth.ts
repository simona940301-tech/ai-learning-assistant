/**
 * 測試 RAG API 認證的腳本
 * 用於診斷 403 錯誤的真正原因
 * 
 * 執行方式：
 * 1. 確保已登入（有有效的 session）
 * 2. 在瀏覽器 Console 中執行此腳本
 * 3. 或使用：npx tsx test-rag-auth.ts
 */

async function testRAGAuth() {
  console.log('🔍 開始測試 RAG API 認證...\n')

  // 測試 1: 檢查當前認證狀態
  console.log('1️⃣ 檢查認證狀態...')
  try {
    const authRes = await fetch('/api/auth/user', { credentials: 'include' })
    const authData = await authRes.json()
    console.log('認證狀態:', authData)
    
    if (!authData.user) {
      console.error('❌ 用戶未登入！請先登入再測試。')
      return
    }
    console.log('✅ 用戶已登入:', authData.user.id)
  } catch (error) {
    console.error('❌ 認證檢查失敗:', error)
    return
  }

  // 測試 2: 測試 GET /api/rag/upload（應該不需要文件）
  console.log('\n2️⃣ 測試 GET /api/rag/upload...')
  try {
    const getRes = await fetch('/api/rag/upload', {
      method: 'GET',
      credentials: 'include',
    })
    const getData = await getRes.json()
    console.log('狀態碼:', getRes.status)
    console.log('響應:', getData)
    
    if (getRes.status === 401) {
      console.error('❌ 401 Unauthorized - 認證問題')
    } else if (getRes.status === 403) {
      console.error('❌ 403 Forbidden - 權限問題（可能是 RLS 政策）')
    } else if (getRes.status === 200) {
      console.log('✅ GET 請求成功')
    }
  } catch (error) {
    console.error('❌ GET 請求失敗:', error)
  }

  // 測試 3: 測試 POST /api/rag/upload（使用空的 FormData）
  console.log('\n3️⃣ 測試 POST /api/rag/upload（空文件）...')
  try {
    const formData = new FormData()
    // 不添加文件，測試驗證邏輯
    
    const postRes = await fetch('/api/rag/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const postData = await postRes.json()
    console.log('狀態碼:', postRes.status)
    console.log('響應:', postData)
    
    if (postRes.status === 400 && postData.error === 'VALIDATION_ERROR') {
      console.log('✅ 認證通過，但文件驗證失敗（這是預期的）')
    } else if (postRes.status === 401) {
      console.error('❌ 401 Unauthorized - 認證問題')
    } else if (postRes.status === 403) {
      console.error('❌ 403 Forbidden - 權限問題')
    }
  } catch (error) {
    console.error('❌ POST 請求失敗:', error)
  }

  // 測試 4: 檢查 Supabase 客戶端配置
  console.log('\n4️⃣ 檢查環境變數...')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 已設置' : '❌ 未設置')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 已設置' : '❌ 未設置')

  console.log('\n📋 診斷建議:')
  console.log('1. 如果看到 401，檢查 JWT token 是否有效')
  console.log('2. 如果看到 403，檢查 RLS 政策中的 auth.uid() 是否正確')
  console.log('3. 檢查瀏覽器 Network Tab 中的實際請求/響應')
  console.log('4. 檢查 Supabase Dashboard 的 Logs 查看詳細錯誤')
}

// 如果在 Node.js 環境中執行
if (typeof window === 'undefined') {
  // 需要設置環境變數
  console.log('⚠️ 在 Node.js 環境中執行需要設置環境變數')
  console.log('建議在瀏覽器 Console 中執行此腳本')
} else {
  testRAGAuth()
}

export { testRAGAuth }

