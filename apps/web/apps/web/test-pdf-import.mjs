// 測試 pdf-parse 導入
try {
  const pdfModule = await import('pdf-parse');
  console.log('✅ pdf-parse 導入成功');
  console.log('Module keys:', Object.keys(pdfModule).slice(0, 10));
  
  // 測試不同的導入方式
  const pdfParse = pdfModule.default || pdfModule.PDFParse || pdfModule;
  console.log('PDFParse type:', typeof pdfModule.PDFParse);
  console.log('Default type:', typeof pdfModule.default);
  
  if (typeof pdfModule.PDFParse === 'function') {
    console.log('✅ PDFParse 函數存在');
  } else {
    console.log('❌ PDFParse 不是函數');
  }
} catch (error) {
  console.error('❌ 導入失敗:', error.message);
}
