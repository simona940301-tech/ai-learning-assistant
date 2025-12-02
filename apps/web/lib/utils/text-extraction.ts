/**
 * PDF 文本提取工具
 *
 * 使用 pdf-parse 提取 PDF 文件的文本內容
 * pdf-parse 是專為 Node.js 設計的輕量級 PDF 文本提取庫，無需 canvas 或 Worker 配置
 */

/**
 * 從 PDF Buffer 提取文本
 * 使用 pdf-parse（專為 Node.js 設計，無原生依賴）
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string, numPages: number }> {
    try {
        console.log('[PDF Extract] Starting PDF extraction...');
        console.log(`[PDF Extract] Buffer size: ${buffer.length} bytes`);

        // 驗證 buffer
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Invalid buffer: not a Buffer instance');
        }

        if (buffer.length === 0) {
            throw new Error('Empty buffer: PDF file is empty');
        }

        // ✅ 修復：直接使用 pdf-parse 的內部文件，跳過 index.js 的調試代碼
        // pdf-parse@1.1.1 的 index.js 在 !module.parent 時會進入調試模式，嘗試讀取測試文件
        // 在 Next.js 打包環境中，module.parent 可能是 null，導致進入調試模式
        // 解決方案：直接使用動態導入加載內部文件 lib/pdf-parse.js

        // 使用標準的動態導入，Next.js Webpack 會正確處理
        // @ts-ignore - 忽略類型檢查，因為我們直接導入內部文件
        const pdfParseModule = await import('pdf-parse/lib/pdf-parse');
        const pdfParse = pdfParseModule.default || pdfParseModule;

        // 驗證 pdfParse 是函數
        if (typeof pdfParse !== 'function') {
            throw new Error(`pdf-parse internal module is not a function. Type: ${typeof pdfParse}`);
        }

        console.log('[PDF Extract] ✅ pdf-parse loaded successfully');

        // 確保 buffer 是真正的 Node.js Buffer 實例
        // 如果 buffer 是從 ArrayBuffer 轉換的，確保它是完整的 Buffer
        const pdfBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

        // 解析 PDF 文件
        // pdf-parse 會自動提取所有頁面的文本
        // 注意：pdf-parse 需要真正的 Buffer，不是 ArrayBuffer 或 TypedArray
        const pdfData = await pdfParse(pdfBuffer, {
            max: 0 // 0 表示解析所有頁面
        });

        const extractedText = pdfData.text?.trim() || '';
        const numPages = pdfData.numpages || 0;

        console.log(`[PDF Extract] PDF parsed: ${numPages} pages`);
        console.log(`[PDF Extract] ✅ Success! Text length: ${extractedText.length} characters`);

        if (extractedText.length > 0) {
            const preview = extractedText.substring(0, 200).replace(/\n/g, ' ');
            console.log(`[PDF Extract] Preview: ${preview}...`);
        } else {
            console.warn('[PDF Extract] ⚠️  No text extracted. This may be a scanned image PDF.');
        }

        return {
            text: extractedText,
            numPages: numPages
        };
    } catch (error) {
        console.error('[PDF Extract] ❌ Error:', error);
        console.error('[PDF Extract] Buffer info:', {
            size: buffer?.length || 0,
            type: typeof buffer,
            isBuffer: buffer ? Buffer.isBuffer(buffer) : false
        });

        const errorMessage = error instanceof Error ? error.message : String(error);

        // 直接拋出原始錯誤訊息，不做轉換
        throw new Error(`無法解析 PDF 文件: ${errorMessage}`);
    }
}

/**
 * 從文本文件提取內容
 */
export function extractTextFromTXT(buffer: Buffer): string {
    try {
        // 嘗試 UTF-8 編碼
        let text = buffer.toString('utf-8')

        // 如果包含亂碼，嘗試其他編碼
        if (text.includes('�')) {
            // 嘗試 Big5（繁體中文常用編碼）
            const iconv = require('iconv-lite')
            text = iconv.decode(buffer, 'big5')
        }

        return text.trim()
    } catch (error) {
        console.error('[TXT Extract] Error:', error)
        throw new Error('文本文件解析失敗')
    }
}

/**
 * 清理文本（移除多餘空白、換行）
 */
export function cleanText(text: string): string {
    return text
        .replace(/\r\n/g, '\n')  // 統一換行符
        .replace(/\n{3,}/g, '\n\n')  // 移除多餘空行
        .replace(/[ \t]+/g, ' ')  // 移除多餘空格
        .trim()
}
