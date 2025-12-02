// 測試 pdf-parse 動態導入（模擬 Next.js 環境）

console.log('🧪 測試 pdf-parse 動態導入...\n');

try {
    // 模擬我們的導入邏輯
    const pdfModule = await import('pdf-parse');

    console.log('1️⃣ 模組導入成功');
    console.log('   Type:', typeof pdfModule);
    console.log('   Keys:', Object.keys(pdfModule).slice(0, 8));

    // 使用我們修復後的邏輯
    const pdfParse = pdfModule.PDFParse;

    console.log('\n2️⃣ PDFParse 函數');
    console.log('   Type:', typeof pdfParse);
    console.log('   Is function:', typeof pdfParse === 'function');

    if (typeof pdfParse === 'function') {
        console.log('\n✅ 修復成功！pdf-parse 可以正確導入');
        console.log('   使用方式: const pdfParse = (pdfModule).PDFParse');
    } else {
        console.log('\n❌ PDFParse 不是函數');
        console.log('   Available:', Object.keys(pdfModule));
    }

} catch (error) {
    console.error('\n❌ 導入失敗:', error.message);
    process.exit(1);
}
