// 測試 streaming response 解析
const testData = `data: {"status":"analyzing","quick_summary":"測試"}

data: {"status":"completed","structured_notes":"# 測試\n內容"}

data: [DONE]
`;

const lines = testData.split('\n');
for (const line of lines) {
    if (!line.trim() || !line.startsWith('data: ')) {
        console.log('❌ Skip:', JSON.stringify(line));
        continue;
    }
    
    const data = line.slice(6);
    if (data === '[DONE]') {
        console.log('✅ DONE marker');
        continue;
    }
    
    try {
        const parsed = JSON.parse(data);
        console.log('✅ Parsed:', parsed);
    } catch (e) {
        console.log('❌ Parse error:', e.message);
    }
}
