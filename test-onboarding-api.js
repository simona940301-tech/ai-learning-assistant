/**
 * 測試 Onboarding Questions API
 * 在瀏覽器控制台執行此腳本
 */

async function testOnboardingAPI() {
  console.log('🔍 開始測試 Onboarding Questions API...\n');
  console.log('═'.repeat(60));
  
  try {
    // 測試 1: 基本查詢
    console.log('\n📡 測試 1: 基本查詢（difficulties=1,2,3&count=7）');
    console.log('─'.repeat(60));
    
    const response = await fetch('/api/onboarding/questions?difficulties=1,2,3&count=7');
    const data = await response.json();
    
    console.log('HTTP 狀態碼:', response.status);
    console.log('API 響應:', data);
    
    if (!data.success) {
      console.error('❌ API 返回失敗');
      console.error('錯誤信息:', data.error);
      return;
    }
    
    console.log('\n✅ API 查詢成功');
    console.log(`📊 返回題目數量: ${data.questions?.length || 0}`);
    
    // 測試 2: 檢查題目數量
    if (data.questions && data.questions.length >= 7) {
      console.log('✅ 題目數量充足（≥7 題）');
    } else {
      console.warn('⚠️ 題目數量不足 7 題');
      console.warn('這將導致 Challenge 頁面使用 fallback 測試題');
    }
    
    // 測試 3: 檢查第一題的數據結構
    if (data.questions && data.questions.length > 0) {
      const q = data.questions[0];
      console.log('\n📝 第一題詳細數據:');
      console.log('─'.repeat(60));
      console.log('ID:', q.id);
      console.log('題目文字:', q.question_text?.substring(0, 80) + '...');
      console.log('選項 A:', q.option_a || '❌ 缺失');
      console.log('選項 B:', q.option_b || '❌ 缺失');
      console.log('選項 C:', q.option_c || '❌ 缺失');
      console.log('選項 D:', q.option_d || '❌ 缺失');
      console.log('正確答案:', q.correct_answer);
      console.log('難度等級:', q.difficulty_level);
      console.log('科目:', q.subject);
      console.log('是否啟用:', q.is_active);
      console.log('解析:', q.explanation ? q.explanation.substring(0, 50) + '...' : '無');
      
      // 檢查選項完整性
      console.log('\n🔍 選項完整性檢查:');
      console.log('─'.repeat(60));
      const optionsStatus = {
        option_a: q.option_a ? '✅' : '❌',
        option_b: q.option_b ? '✅' : '❌',
        option_c: q.option_c ? '✅' : '❌',
        option_d: q.option_d ? '✅' : '❌',
      };
      console.log('選項狀態:', optionsStatus);
      
      const allOptionsPresent = q.option_a && q.option_b && q.option_c && q.option_d;
      if (allOptionsPresent) {
        console.log('\n✅ 所有選項字段都有值！');
      } else {
        console.error('\n❌ 選項字段缺失！這是導致 fallback 的主要原因。');
        console.error('請檢查數據庫中的列名是否正確。');
      }
      
      // 檢查必填字段
      console.log('\n🔍 必填字段檢查:');
      console.log('─'.repeat(60));
      const requiredFields = {
        'question_text': q.question_text,
        'correct_answer': q.correct_answer,
        'difficulty_level': q.difficulty_level,
        'subject': q.subject,
      };
      
      let allRequiredPresent = true;
      for (const [field, value] of Object.entries(requiredFields)) {
        const status = value ? '✅' : '❌';
        console.log(`${field}: ${status} ${value || '(缺失)'}`);
        if (!value) allRequiredPresent = false;
      }
      
      if (allRequiredPresent) {
        console.log('\n✅ 所有必填字段都有值');
      } else {
        console.error('\n❌ 部分必填字段缺失');
      }
    }
    
    // 測試 4: 按難度分組統計
    if (data.questions && data.questions.length > 0) {
      console.log('\n📊 按難度分組統計:');
      console.log('─'.repeat(60));
      const byDifficulty = data.questions.reduce((acc, q) => {
        const level = q.difficulty_level;
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {});
      
      for (const [level, count] of Object.entries(byDifficulty)) {
        console.log(`難度 ${level}: ${count} 題`);
      }
    }
    
    // 總結
    console.log('\n' + '═'.repeat(60));
    console.log('📋 測試總結');
    console.log('═'.repeat(60));
    
    const allGood = data.success && 
                    data.questions && 
                    data.questions.length >= 7 &&
                    data.questions.every(q => q.option_a && q.option_b && q.option_c && q.option_d);
    
    if (allGood) {
      console.log('✅ 所有測試通過！');
      console.log('✅ API 正常返回數據');
      console.log('✅ 題目數量充足');
      console.log('✅ 選項字段完整');
      console.log('\n💡 Challenge 頁面應該能正常顯示題目了！');
      console.log('   如果仍顯示 fallback，請檢查：');
      console.log('   1. 瀏覽器緩存是否已清除');
      console.log('   2. Challenge 頁面的 JavaScript 邏輯');
      console.log('   3. 瀏覽器控制台的錯誤信息');
    } else {
      console.warn('⚠️ 部分測試未通過');
      if (!data.success) {
        console.error('❌ API 返回失敗');
      }
      if (!data.questions || data.questions.length < 7) {
        console.error('❌ 題目數量不足 7 題');
        console.error('   請檢查數據庫中是否有足夠的可用題目');
      }
      if (data.questions && !data.questions.every(q => q.option_a && q.option_b && q.option_c && q.option_d)) {
        console.error('❌ 部分題目的選項字段缺失');
        console.error('   請檢查數據庫列名是否正確');
      }
    }
    
  } catch (error) {
    console.error('\n❌ 測試過程中發生錯誤:');
    console.error(error);
  }
}

// 如果在瀏覽器環境，執行測試
if (typeof window !== 'undefined') {
  console.log('💡 執行 testOnboardingAPI() 開始測試');
  // 導出到全局作用域
  window.testOnboardingAPI = testOnboardingAPI;
}

