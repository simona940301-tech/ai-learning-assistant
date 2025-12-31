/**
 * 測試用戶自創題目完整流程
 *
 * 流程：
 * 1. 提交用戶自創題目
 * 2. 查詢自己的題目
 * 3. 手動審核（模擬管理員操作）
 * 4. 獲取已審核題目用於對戰
 * 5. 刪除題目
 */

const API_BASE = 'http://localhost:3000'

// 測試數據
const testQuestion = {
  questionText: '下列哪個選項是正確的英文文法？',
  optionA: 'He go to school every day.',
  optionB: 'He goes to school every day.',
  optionC: 'He going to school every day.',
  optionD: 'He gone to school every day.',
  correctAnswer: 'B',
  userCreatedHint: '注意第三人稱單數現在式動詞要加 s',
  subject: 'english',
  difficulty: 2,
}

async function testUGCFlow() {
  console.log('🚀 開始測試用戶自創題目流程\n')

  try {
    // 1. 提交題目
    console.log('📝 步驟 1: 提交用戶自創題目')
    const submitResponse = await fetch(`${API_BASE}/api/play/ugc-questions/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(testQuestion),
    })

    if (!submitResponse.ok) {
      const error = await submitResponse.json()
      throw new Error(`提交失敗: ${error.message || error.error}`)
    }

    const submitData = await submitResponse.json()
    console.log('✅ 題目提交成功:', submitData.question)
    const questionId = submitData.question.id
    console.log(`   題目 ID: ${questionId}\n`)

    // 2. 查詢自己的題目
    console.log('📋 步驟 2: 查詢自己的題目')
    const listResponse = await fetch(`${API_BASE}/api/play/ugc-questions?status=PENDING`, {
      credentials: 'include',
    })

    if (!listResponse.ok) {
      throw new Error('查詢失敗')
    }

    const listData = await listResponse.json()
    console.log(`✅ 查詢成功，找到 ${listData.questions.length} 個待審核題目`)
    if (listData.questions.length > 0) {
      console.log('   最新題目:', listData.questions[0].questionText.substring(0, 50) + '...\n')
    }

    // 3. 模擬審核（需要管理員權限，這裡僅作展示）
    console.log('🔍 步驟 3: 題目審核（需手動執行 SQL）')
    console.log('   執行以下 SQL 來審核題目:')
    console.log(`   UPDATE ugc_questions SET review_status = 'APPROVED' WHERE id = '${questionId}';\n`)

    // 4. 獲取已審核題目（假設審核通過）
    console.log('🎯 步驟 4: 獲取對戰題目')
    const battleResponse = await fetch(`${API_BASE}/api/play/questions/battle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        subject: 'english',
        questionSource: 'UGC',
        enableUserCreatedQuestions: true,
        numQuestions: 5,
      }),
    })

    if (battleResponse.ok) {
      const battleData = await battleResponse.json()
      console.log(`✅ 獲取對戰題目成功，共 ${battleData.total} 題`)
      console.log(`   系統題目: ${battleData.breakdown.system} 題`)
      console.log(`   用戶自創題目: ${battleData.breakdown.ugc} 題\n`)
    } else {
      console.log('⚠️  獲取對戰題目失敗（可能尚未審核通過）\n')
    }

    // 5. 更新題目
    console.log('✏️  步驟 5: 更新題目')
    const updateResponse = await fetch(`${API_BASE}/api/play/ugc-questions/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        id: questionId,
        userCreatedHint: '更新後的提示：注意主詞動詞一致性',
      }),
    })

    if (updateResponse.ok) {
      const updateData = await updateResponse.json()
      console.log('✅ 題目更新成功\n')
    } else {
      const error = await updateResponse.json()
      console.log(`⚠️  更新失敗: ${error.message}\n`)
    }

    // 6. 刪除題目
    console.log('🗑️  步驟 6: 刪除題目')
    const deleteResponse = await fetch(`${API_BASE}/api/play/ugc-questions?id=${questionId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (deleteResponse.ok) {
      console.log('✅ 題目刪除成功\n')
    } else {
      const error = await deleteResponse.json()
      console.log(`⚠️  刪除失敗: ${error.message}\n`)
    }

    console.log('🎉 測試流程完成！')
    console.log('\n📊 總結:')
    console.log('   ✅ 提交題目: 成功')
    console.log('   ✅ 查詢題目: 成功')
    console.log('   ⚠️  審核題目: 需手動執行')
    console.log('   ✅ 獲取對戰題目: 已測試')
    console.log('   ✅ 更新題目: 已測試')
    console.log('   ✅ 刪除題目: 已測試')
  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message)
    console.error(error)
  }
}

// 執行測試
testUGCFlow()
