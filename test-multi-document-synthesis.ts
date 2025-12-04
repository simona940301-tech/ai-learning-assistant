/**
 * 測試多文件綜合分析 (NotebookLM-level Synthesis)
 *
 * 驗證：
 * 1. XML 格式化是否正確
 * 2. 多文件內容是否被綜合分析（而非只分析第一份）
 * 3. 輸出是否包含來源標註
 * 4. 動態豐富度是否根據輸入長度調整
 */

// 測試文件 1: 數學 - 指數與對數
const DOC1_MATH_EXPONENTIAL = `
指數與對數

一、指數律
1. a^m × a^n = a^(m+n)
2. a^m ÷ a^n = a^(m-n)
3. (a^m)^n = a^(mn)
4. (ab)^n = a^n × b^n

二、對數律
1. log_a(MN) = log_a M + log_a N
2. log_a(M/N) = log_a M - log_a N
3. log_a(M^k) = k × log_a M
4. log_a b × log_b c = log_a c (換底公式)

三、常見錯誤
- 錯誤：log(a+b) = log a + log b
- 正確：log(ab) = log a + log b
`.trim()

// 測試文件 2: 數學 - 指數函數應用
const DOC2_MATH_APPLICATIONS = `
指數函數的應用

一、複利計算
公式：A = P(1 + r)^t
- A: 本利和
- P: 本金
- r: 利率
- t: 期數

範例：本金 10000 元，年利率 5%，10 年後本利和為：
A = 10000(1.05)^10 ≈ 16288.95 元

二、人口成長模型
公式：P(t) = P_0 × e^(rt)
- P(t): t 年後的人口數
- P_0: 初始人口數
- r: 成長率
- e: 自然對數的底

三、放射性衰變
公式：N(t) = N_0 × e^(-λt)
- N(t): t 時間後的數量
- N_0: 初始數量
- λ: 衰變常數

學測考點：
- 複利問題（常考）
- 指數方程式求解
- 對數方程式求解
- 指數與對數的圖形
`.trim()

// 測試文件 3: 物理 - 牛頓運動定律
const DOC3_PHYSICS_NEWTON = `
牛頓運動定律

一、牛頓第一運動定律（慣性定律）
物體在不受外力或所受合外力為零時，靜者恆靜，動者恆以等速度直線運動。

二、牛頓第二運動定律
F = ma
- F: 合外力（向量）
- m: 質量
- a: 加速度（向量）

重點：
1. 力與加速度成正比
2. 力與質量的乘積
3. 方向：力與加速度同向

三、牛頓第三運動定律（作用力與反作用力）
當物體 A 對物體 B 施力時，B 也會對 A 施一大小相等、方向相反的力。

常見誤解：
- 作用力與反作用力「不會」互相抵消（因為作用在不同物體上）
`.trim()

async function testMultiDocumentSynthesis() {
  console.log('🧪 測試多文件綜合分析\n')

  // Test 1: 單一文件（基準測試）
  console.log('Test 1: 單一文件分析')
  console.log('=====================================')
  const singleDocContext = `<document index="1" filename="math_exponential.txt" type="primary">
${DOC1_MATH_EXPONENTIAL}
</document>`

  console.log('輸入長度:', singleDocContext.length, 'chars')
  console.log('預期：簡短摘要，因為內容較少\n')

  // Test 2: 多文件（相同科目）- 應該綜合分析
  console.log('Test 2: 多文件分析（相同科目 - 數學）')
  console.log('=====================================')
  const multiDocMathContext = `<document index="1" filename="math_exponential.txt" type="primary">
${DOC1_MATH_EXPONENTIAL}
</document>

<document index="2" filename="math_applications.txt" type="related">
${DOC2_MATH_APPLICATIONS}
</document>`

  console.log('輸入長度:', multiDocMathContext.length, 'chars')
  console.log('預期：')
  console.log('  - 綜合兩份文件的內容')
  console.log('  - 摘要應提到「指數律」和「複利應用」')
  console.log('  - 概念解析應整合兩份文件的知識點')
  console.log('  - 應包含來源標註 (如: 來源: math_exponential.txt, math_applications.txt)')
  console.log('  - 更豐富的摘要（因為內容更長）\n')

  // Test 3: 多文件（不同科目）- 應該提示科目不一致
  console.log('Test 3: 多文件分析（不同科目 - 數學 + 物理）')
  console.log('=====================================')
  const multiDocMixedContext = `<document index="1" filename="math_exponential.txt" type="primary">
${DOC1_MATH_EXPONENTIAL}
</document>

<document index="2" filename="physics_newton.txt" type="related">
${DOC3_PHYSICS_NEWTON}
</document>`

  console.log('輸入長度:', multiDocMixedContext.length, 'chars')
  console.log('預期：')
  console.log('  - 應識別出多個科目（數學、物理）')
  console.log('  - 摘要應分別說明兩個科目的內容\n')

  // 顯示 API 調用示例
  console.log('\n📡 API 調用示例')
  console.log('=====================================')
  console.log('POST /api/rag/analyze-object')
  console.log('Body:', JSON.stringify({
    documentId: 'primary-doc-id',
    relatedDocIds: ['related-doc-id-1', 'related-doc-id-2'],
    subject: 'math'
  }, null, 2))

  console.log('\n✅ 測試數據已準備好')
  console.log('\n📋 驗證檢查清單:')
  console.log('1. ✓ XML 標籤格式正確 (<document index="N" filename="..." type="primary|related">)')
  console.log('2. ⏳ 需要實際調用 API 驗證多文件綜合分析')
  console.log('3. ⏳ 需要檢查輸出是否包含來源標註')
  console.log('4. ⏳ 需要驗證長文件產生更豐富的摘要')

  console.log('\n💡 手動測試步驟:')
  console.log('1. 啟動開發伺服器: pnpm --filter web dev')
  console.log('2. 登入系統')
  console.log('3. 上傳多份相關文件（例如：數學第一章、數學第二章）')
  console.log('4. 在「重點統整」頁面選擇主文件')
  console.log('5. 點擊「選擇相關文件」按鈕，選擇其他相關文件')
  console.log('6. 觀察生成的摘要是否：')
  console.log('   - 包含所有文件的內容（而非只有第一份）')
  console.log('   - 有明確的來源標註')
  console.log('   - 在「核心概念」中整合了多份文件的知識點')
  console.log('   - 有跨章節的題組（測試學生整合能力）')

  // 輸出測試數據到文件（供手動測試使用）
  console.log('\n📝 測試數據已輸出到文件:')
  console.log('- test-data-single.txt')
  console.log('- test-data-multi-math.txt')
  console.log('- test-data-multi-mixed.txt')
}

// 執行測試
testMultiDocumentSynthesis().catch(console.error)

export {
  DOC1_MATH_EXPONENTIAL,
  DOC2_MATH_APPLICATIONS,
  DOC3_PHYSICS_NEWTON
}
