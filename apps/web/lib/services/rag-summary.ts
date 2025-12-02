/**
 * RAG 摘要服務
 * 
 * 提供抽取式摘要和關鍵詞提取功能
 * 使用 Gemini API 進行文本分析
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * 抽取式摘要：提取文件中最重要的 3-5 個句子
 * 
 * 使用 Gemini 分析文本並提取關鍵句子
 */
export async function extractiveSummary(
    text: string,
    numSentences: number = 5
): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }) // ⚡ Use 2.5 Flash

    const prompt = `你是一個專業的文本摘要專家。請從以下文本中提取 ${numSentences} 個最能代表核心思想的關鍵句子。

要求：
1. 只提取原文中的句子，不要改寫
2. 選擇最能概括主題的句子
3. 保持句子的原始順序
4. 每個句子單獨一行
5. 不要添加任何額外的說明或編號

文本內容：
${text}

請直接輸出 ${numSentences} 個關鍵句子：`

    const result = await model.generateContent(prompt)
    const response = result.response
    const summary = response.text().trim()

    return summary
}

/**
 * 關鍵詞提取：提取文件中的 5-10 個關鍵詞
 * 
 * 使用 Gemini 分析文本並提取關鍵詞
 */
export async function extractKeywords(
    text: string,
    topK: number = 10
): Promise<string[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }) // ⚡ Use 2.5 Flash

    const prompt = `你是一個專業的關鍵詞提取專家。請從以下文本中提取 ${topK} 個最重要的關鍵詞。

要求：
1. 關鍵詞應該是名詞或名詞短語
2. 優先選擇專業術語和核心概念
3. 每個關鍵詞單獨一行
4. 不要添加任何額外的說明或編號
5. 按重要性排序

文本內容：
${text}

請直接輸出 ${topK} 個關鍵詞（每行一個）：`

    const result = await model.generateContent(prompt)
    const response = result.response
    const keywordsText = response.text().trim()

    // 分割成陣列並清理
    const keywords = keywordsText
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0)
        .slice(0, topK)

    return keywords
}

/**
 * 文件主題生成：生成一句話的文件主題概覽
 * 
 * 使用 Gemini 分析文本並生成主題
 */
export async function generateDocumentTheme(text: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }) // ⚡ Use 2.5 Flash

    const prompt = `你是一個專業的文件分析專家。請閱讀以下文本，並用一句話概括這份文件的核心主題（Document Theme）。

要求：
1. 像標題一樣簡潔有力
2. 包含核心主題和關鍵背景（例如：時間、地點、人物、事件）
3. 不超過 30 個字
4. 不要使用「這份文件」、「本文」等開頭
5. 直接輸出主題

文本內容：
${text}

請直接輸出文件主題：`

    const result = await model.generateContent(prompt)
    const response = result.response
    return response.text().trim()
}

/**
 * 生成完整摘要（包含摘要和關鍵詞）
 */
export async function generateSummary(
    text: string,
    options: {
        numSentences?: number
        numKeywords?: number
    } = {}
): Promise<{
    summary: string
    keywords: string[]
    theme: string
}> {
    const { numSentences = 5, numKeywords = 10 } = options

    // 並行執行摘要、關鍵詞提取和主題生成
    const [summary, keywords, theme] = await Promise.all([
        extractiveSummary(text, numSentences),
        extractKeywords(text, numKeywords),
        generateDocumentTheme(text),
    ])

    return {
        summary,
        keywords,
        theme,
    }
}
