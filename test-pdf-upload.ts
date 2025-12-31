/**
 * PDF Upload Test Script
 *
 * 測試 /api/rag/upload 端點的 PDF 上傳功能
 */

import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'

const API_URL = 'http://localhost:3000/api/rag/upload'
const TEST_PDF = path.join(process.cwd(), 'sample.pdf')

async function testPDFUpload() {
  console.log('🧪 Testing PDF Upload...\n')

  // 1. 檢查測試檔案
  if (!fs.existsSync(TEST_PDF)) {
    console.error('❌ 測試檔案不存在:', TEST_PDF)
    console.log('請確保 sample.pdf 存在於專案根目錄')
    return
  }

  const stats = fs.statSync(TEST_PDF)
  console.log(`📄 測試檔案: ${TEST_PDF}`)
  console.log(`📊 檔案大小: ${stats.size} bytes\n`)

  // 2. 創建 FormData
  const formData = new FormData()
  formData.append('file', fs.createReadStream(TEST_PDF), {
    filename: 'sample.pdf',
    contentType: 'application/pdf',
  })

  // 3. 發送請求
  console.log('📤 上傳 PDF 到 API...')

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData as any,
      headers: {
        ...formData.getHeaders(),
        // Mock user auth (development only)
        'x-user-id': 'e770f9cd-52a7-43de-b983-70f6f78d2f53',
      },
    })

    console.log(`📡 Response Status: ${response.status} ${response.statusText}\n`)

    const data = await response.json()

    if (response.ok) {
      console.log('✅ 上傳成功!\n')
      console.log('📋 Response Data:')
      console.log(JSON.stringify(data, null, 2))

      if (data.document) {
        console.log('\n📝 摘要:', data.document.summary)
        console.log('🔑 關鍵詞:', data.document.keywords)
        console.log('📖 頁數:', data.document.numPages || 'N/A')
      }
    } else {
      console.error('❌ 上傳失敗!')
      console.error('Error:', data.error)
      console.error('Message:', data.message)

      if (data.debug) {
        console.error('Debug Info:', JSON.stringify(data.debug, null, 2))
      }
    }
  } catch (error) {
    console.error('❌ 請求失敗:', error)
  }
}

// Run test
testPDFUpload()
