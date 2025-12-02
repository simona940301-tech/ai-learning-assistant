/**
 * 測試重點統整 Tab 的文件上傳流程
 *
 * 目的：診斷文件上傳和分析功能，確保整個流程正常運作
 */

import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:3000'

// 測試用的簡單 TXT 文件
const TEST_TEXT_CONTENT = `
學測數學複習重點

一、數與式
1. 指數律與對數律
2. 多項式的運算與因式分解
3. 複數的運算

二、方程式
1. 一元二次方程式
2. 聯立方程式
3. 不等式

三、函數
1. 函數的基本概念
2. 一次函數與二次函數
3. 多項式函數的圖形

四、數列與級數
1. 等差數列與等比數列
2. 數列的和
3. 級數的收斂

五、排列組合
1. 加法原理與乘法原理
2. 排列
3. 組合
4. 二項式定理

重要公式：
- 等差數列第 n 項：an = a1 + (n-1)d
- 等比數列第 n 項：an = a1 × r^(n-1)
- 組合公式：C(n,r) = n! / (r!(n-r)!)
`.trim()

async function main() {
  console.log('🔍 開始測試重點統整 Tab 文件上傳流程\n')

  // 步驟 1: 檢查伺服器是否運行
  console.log('步驟 1: 檢查伺服器狀態')
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`)
    if (healthRes.ok) {
      console.log('✅ 伺服器正常運行\n')
    }
  } catch (error) {
    console.error('❌ 伺服器未運行，請先啟動：pnpm --filter web dev')
    process.exit(1)
  }

  // 步驟 2: 創建測試 TXT 文件
  console.log('步驟 2: 創建測試 TXT 文件')
  const testFilePath = path.join(__dirname, 'test-summary-upload.txt')
  fs.writeFileSync(testFilePath, TEST_TEXT_CONTENT)
  console.log(`✅ 測試文件已創建: ${testFilePath}\n`)

  // 步驟 3: 上傳文件到 /api/rag/upload
  console.log('步驟 3: 測試文件上傳 API')
  try {
    const formData = new FormData()
    const fileBlob = new Blob([TEST_TEXT_CONTENT], { type: 'text/plain' })
    formData.append('file', fileBlob, 'test-summary-upload.txt')

    const uploadRes = await fetch(`${BASE_URL}/api/rag/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // 注意：這裡需要有效的認證 token
        // 在實際測試時，請從瀏覽器的 DevTools 中複製 Cookie
      },
    })

    console.log(`上傳響應狀態: ${uploadRes.status}`)
    const uploadData = await uploadRes.json()
    console.log('上傳響應數據:', JSON.stringify(uploadData, null, 2))

    if (!uploadRes.ok) {
      console.error('❌ 上傳失敗')
      if (uploadData.error === 'UNAUTHORIZED') {
        console.log('\n💡 提示：需要登入才能上傳文件')
        console.log('   請在瀏覽器中登入後，從 DevTools 複製 Cookie')
      }
      console.log('\n')
    } else {
      console.log('✅ 文件上傳成功\n')

      // 步驟 4: 檢查生成的摘要
      console.log('步驟 4: 檢查生成的摘要')
      if (uploadData.document) {
        const { filename, summary, keywords, theme, status } = uploadData.document
        console.log(`文件名稱: ${filename}`)
        console.log(`主題: ${theme || '未生成'}`)
        console.log(`摘要: ${summary ? summary.substring(0, 100) + '...' : '未生成'}`)
        console.log(`關鍵詞: ${keywords?.join(', ') || '未生成'}`)
        console.log(`狀態: ${status}`)
        console.log('✅ 摘要生成成功\n')
      }
    }
  } catch (error) {
    console.error('❌ 上傳過程出錯:', error)
    if (error instanceof Error) {
      console.error('錯誤詳情:', error.message)
    }
    console.log('\n')
  }

  // 步驟 5: 獲取已上傳文件列表
  console.log('步驟 5: 獲取已上傳文件列表')
  try {
    const listRes = await fetch(`${BASE_URL}/api/rag/upload`)
    console.log(`列表響應狀態: ${listRes.status}`)
    const listData = await listRes.json()

    if (!listRes.ok) {
      console.error('❌ 獲取列表失敗')
      console.log('響應數據:', JSON.stringify(listData, null, 2))
    } else {
      console.log(`✅ 獲取成功，共 ${listData.documents?.length || 0} 個文件\n`)
      if (listData.documents && listData.documents.length > 0) {
        console.log('最近上傳的文件:')
        listData.documents.slice(0, 3).forEach((doc: any) => {
          console.log(`  - ${doc.filename} (${doc.status})`)
        })
      }
    }
  } catch (error) {
    console.error('❌ 獲取列表出錯:', error)
  }

  // 清理測試文件
  console.log('\n步驟 6: 清理測試文件')
  try {
    fs.unlinkSync(testFilePath)
    console.log('✅ 測試文件已刪除')
  } catch (error) {
    console.log('⚠️  無法刪除測試文件')
  }

  console.log('\n🎉 測試完成！')
  console.log('\n📋 診斷總結：')
  console.log('1. 如果看到 401 UNAUTHORIZED，請確保已登入')
  console.log('2. 如果上傳成功但沒有摘要，檢查 AI API 配置')
  console.log('3. 如果出現資料庫錯誤，請執行 migration')
  console.log('4. 檢查瀏覽器控制台的網絡請求，查看詳細錯誤')
}

main().catch(console.error)
