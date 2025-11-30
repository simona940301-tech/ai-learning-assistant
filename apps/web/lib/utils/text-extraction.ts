/**
 * PDF 文本提取工具
 * 
 * 使用 pdf-parse 提取 PDF 文件的文本內容
 */

/**
 * 從 PDF Buffer 提取文本
 * 使用 pdf-parse v2.4.5
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

        // 動態導入 pdf-parse（使用 v2 的 class API）
        // 在 Next.js API routes 中，優先使用 require，因為運行在 Node.js 環境
        let PDFParseClass: any;

        try {
            let pdfModule: any;
            
            // 方法 1: 優先使用 require（最可靠，因為 API routes 運行在 Node.js）
            // 使用動態 require 來避免 TypeScript 編譯錯誤
            if (typeof require !== 'undefined') {
                try {
                    pdfModule = require('pdf-parse');
                    console.log('[PDF Extract] ✅ Loaded via require()');
                } catch (requireError) {
                    console.warn('[PDF Extract] require() failed, trying alternatives...');
                }
            }
            
            // 方法 2: 如果 require 不可用，使用動態 import
            if (!pdfModule) {
                try {
                    const pdfModuleDefault = await import('pdf-parse');
                    pdfModule = (pdfModuleDefault as any).default || pdfModuleDefault;
                    console.log('[PDF Extract] ✅ Loaded via dynamic import()');
                } catch (importError) {
                    console.error('[PDF Extract] Dynamic import also failed:', importError);
                    throw new Error('Failed to load pdf-parse module');
                }
            }

            // 提取 PDFParse class（pdf-parse v2 使用 class API）
            PDFParseClass =
                (pdfModule as any).PDFParse ||
                (pdfModule as any).default?.PDFParse ||
                (pdfModule as any).default ||
                pdfModule;

            console.log('[PDF Extract] PDFParse type:', typeof PDFParseClass);

            if (typeof PDFParseClass !== 'function') {
                console.error('[PDF Extract] Available exports:', Object.keys(pdfModule || {}));
                throw new Error('PDFParse class not found in pdf-parse module');
            }
        } catch (importError) {
            console.error('[PDF Extract] ❌ Failed to import pdf-parse:', importError);
            const errorMsg = importError instanceof Error ? importError.message : String(importError);
            throw new Error(`pdf-parse 模組載入失敗: ${errorMsg}`);
        }

        // 解析 PDF（v2 API 需要先 new，再 getText）
        console.log('[PDF Extract] Parsing PDF with pdf-parse v2 API...');
        const parser = new PDFParseClass({ data: buffer });
        let data: any;
        try {
            data = await parser.getText();
        } finally {
            if (typeof parser.destroy === 'function') {
                await parser.destroy().catch(() => {});
            }
        }

        // 提取結果
        const numPages = data.total || data.numPages || data.pages?.length || 0;
        const rawText = data.text || '';

        console.log(`[PDF Extract] ✅ Success! Pages: ${numPages}, Text length: ${rawText.length}`);

        if (rawText.length > 0) {
            const preview = rawText.substring(0, 200).replace(/\n/g, ' ');
            console.log(`[PDF Extract] Preview: ${preview}...`);
        } else {
            console.warn('[PDF Extract] ⚠️  No text extracted. This may be a scanned image PDF.');
        }

        return {
            text: rawText.trim(),
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
