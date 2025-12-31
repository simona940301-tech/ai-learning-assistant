// 測試實際的 Vercel AI SDK streaming 格式
const testStream = `0:{"subject":"國文"}
0:{"topics":["國學常識"]}
0:{"summary":"測試內容"}
`;

console.log('=== 測試 Vercel AI format ===');
const lines = testStream.split('\n');
for (const line of lines) {
    console.log('Line:', JSON.stringify(line));
    
    if (!line.trim()) {
        console.log('  → Skip: empty');
        continue;
    }
    
    // 檢查是否為 Vercel AI format: "0:{...}"
    const match = line.match(/^(\d+):(.+)$/);
    if (match) {
        const [, type, data] = match;
        console.log('  → Type:', type, 'Data:', data);
        try {
            const parsed = JSON.parse(data);
            console.log('  → Parsed:', parsed);
        } catch (e) {
            console.log('  → Parse error:', e.message);
        }
    } else if (line.startsWith('data: ')) {
        console.log('  → SSE format detected');
        const data = line.slice(6);
        try {
            const parsed = JSON.parse(data);
            console.log('  → Parsed:', parsed);
        } catch (e) {
            console.log('  → Parse error:', e.message);
        }
    } else {
        console.log('  → Unknown format');
    }
}
