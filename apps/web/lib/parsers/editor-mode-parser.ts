/**
 * Editor Mode 題目解析器
 * 
 * 解析克漏字格式：
 * - 文章包含 10 個空格標記 {1:answer}, {2:answer}, ...
 * - 共用選項池：10 個正確選項 + 2-3 個干擾選項
 * - 每個空格有詳細的詞性、中文、上下文分析
 */

export interface EditorModeQuestion {
    questionNumber: string
    topic: string
    articleText: string
    blanks: EditorBlank[]
    optionPool: EditorOption[]
    distractorOptions: EditorOption[]
}

export interface EditorBlank {
    blankId: number
    correctAnswer: string
    partOfSpeech: string
    chineseMeaning: string
    contextBefore: string
    contextAfter: string
    analysis: string
}

export interface EditorOption {
    label: string  // A, B, C, ..., M
    word: string
    chineseMeaning: string
    partOfSpeech?: string
}

/**
 * 解析 Editor Mode 題目
 */
export function parseEditorModeQuestion(text: string): EditorModeQuestion | null {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)

    console.log('[parseEditorMode] Total lines:', lines.length)

    let questionNumber = ''
    let topic = ''
    let articleText = ''
    const blanks: EditorBlank[] = []
    const optionPool: EditorOption[] = []
    const distractorOptions: EditorOption[] = []

    let currentSection: 'header' | 'article' | 'options' | 'distractors' | 'blanks' = 'header'
    let currentBlank: Partial<EditorBlank> | null = null

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // 檢測題目編號
        const questionMatch = line.match(/^📝\s*題目\s*(\d+)/i)
        if (questionMatch) {
            questionNumber = questionMatch[1]
            console.log('[parseEditorMode] Found question number:', questionNumber)
            continue
        }

        // 檢測主題
        const topicMatch = line.match(/^主題[：:：]\s*(.+)$/i)
        if (topicMatch) {
            topic = topicMatch[1]
            console.log('[parseEditorMode] Found topic:', topic)
            continue
        }

        // 檢測文章開始
        if (line.match(/^文章[：:：]?$/i)) {
            currentSection = 'article'
            console.log('[parseEditorMode] Starting article section')
            continue
        }

        // 檢測正確選項池開始
        if (line.match(/^正確選項[（(]?共用選項池[）)]?\s*[-–—]\s*\d+\s*個[）)]?[：:：]?$/i)) {
            currentSection = 'options'
            console.log('[parseEditorMode] Starting options section')
            continue
        }

        // 檢測額外干擾選項開始
        if (line.match(/^額外干擾選項[（(]?\d+-?\d*\s*個[）)]?[：:：]?$/i)) {
            currentSection = 'distractors'
            console.log('[parseEditorMode] Starting distractors section')
            continue
        }

        // 檢測答案與詳解開始
        if (line.match(/^答案與詳解[：:：]?$/i)) {
            currentSection = 'blanks'
            console.log('[parseEditorMode] Starting blanks section')
            continue
        }

        // 檢測分隔線
        if (line.match(/^[-–—=]+$/)) {
            continue
        }

        // 收集文章內容
        if (currentSection === 'article') {
            // 檢查是否到達選項區（遇到 "正確選項" 或 "---"）
            if (line.match(/^正確選項/i) || line.match(/^[-–—=]{3,}$/)) {
                i-- // 回退一行
                continue
            }
            articleText += line + '\n'
            continue
        }

        // 解析選項池
        if (currentSection === 'options') {
            // 格式：(A) word - 中文（詞性）
            // 或：(A) word - 中文
            const optionMatch = line.match(/^\(([A-Z])\)\s+([a-zA-Z]+)\s*[-–—]\s*(.+?)(?:\s*[（(](.+?)[）)])?$/i)
            if (optionMatch) {
                const option: EditorOption = {
                    label: optionMatch[1].toUpperCase(),
                    word: optionMatch[2],
                    chineseMeaning: optionMatch[3].replace(/[（(].*?[）)]/g, '').trim(),
                    partOfSpeech: optionMatch[4] || extractPartOfSpeech(optionMatch[3]),
                }
                optionPool.push(option)
                console.log('[parseEditorMode] Found option:', option.label, option.word)
                continue
            }
        }

        // 解析干擾選項
        if (currentSection === 'distractors') {
            const distractorMatch = line.match(/^\(([A-Z])\)\s+([a-zA-Z]+)\s*[-–—]\s*(.+?)(?:\s*【(.+?)】)?$/i)
            if (distractorMatch) {
                const option: EditorOption = {
                    label: distractorMatch[1].toUpperCase(),
                    word: distractorMatch[2],
                    chineseMeaning: distractorMatch[3].replace(/【.*?】/g, '').trim(),
                    partOfSpeech: extractPartOfSpeech(distractorMatch[3]),
                }
                distractorOptions.push(option)
                console.log('[parseEditorMode] Found distractor:', option.label, option.word)
                continue
            }
        }

        // 解析空格詳解
        if (currentSection === 'blanks') {
            // 檢測空格編號
            const blankMatch = line.match(/^空格\s*(\d+)[：:：]\s*([A-Z])\s*\((.+?)\)/i)
            if (blankMatch) {
                // 保存前一個空格
                if (currentBlank && currentBlank.blankId) {
                    blanks.push(currentBlank as EditorBlank)
                }

                currentBlank = {
                    blankId: parseInt(blankMatch[1]),
                    correctAnswer: blankMatch[3],
                }
                console.log('[parseEditorMode] Found blank:', currentBlank.blankId, currentBlank.correctAnswer)
                continue
            }

            if (!currentBlank) continue

            // 解析詞性
            const posMatch = line.match(/^詞性[：:：]\s*(.+?)(?:\s*\((.+?)\))?$/i)
            if (posMatch) {
                currentBlank.partOfSpeech = posMatch[1]
                console.log('[parseEditorMode] Found POS:', currentBlank.partOfSpeech)
                continue
            }

            // 解析中文
            const chineseMatch = line.match(/^中文[：:：]\s*(.+)$/i)
            if (chineseMatch) {
                currentBlank.chineseMeaning = chineseMatch[1]
                console.log('[parseEditorMode] Found Chinese:', currentBlank.chineseMeaning)
                continue
            }

            // 解析上下文判斷
            if (line.match(/^上下文判斷[：:：]?$/i)) {
                // 接下來的幾行是上下文分析
                let contextLines: string[] = []
                let j = i + 1
                while (j < lines.length && !lines[j].match(/^(空格|詞性|中文|🧠)/i)) {
                    const contextLine = lines[j]

                    // 解析前文
                    const beforeMatch = contextLine.match(/^前文[：:：]\s*[「『"](.+?)[」』"]/i)
                    if (beforeMatch) {
                        currentBlank.contextBefore = beforeMatch[1]
                    }

                    // 解析後文
                    const afterMatch = contextLine.match(/^後文[：:：]\s*[「『"](.+?)[」』"]/i)
                    if (afterMatch) {
                        currentBlank.contextAfter = afterMatch[1]
                    }

                    // 解析分析
                    const analysisMatch = contextLine.match(/^分析[：:：]\s*(.+)$/i)
                    if (analysisMatch) {
                        currentBlank.analysis = analysisMatch[1]
                    }

                    contextLines.push(contextLine)
                    j++
                }

                // 如果沒有找到結構化的前文/後文/分析，將所有內容作為分析
                if (!currentBlank.analysis && contextLines.length > 0) {
                    currentBlank.analysis = contextLines.join(' ')
                }

                i = j - 1
                continue
            }
        }
    }

    // 保存最後一個空格
    if (currentBlank && currentBlank.blankId) {
        blanks.push(currentBlank as EditorBlank)
    }

    // 驗證必要欄位
    if (!questionNumber || !articleText || blanks.length === 0 || optionPool.length === 0) {
        console.error('[parseEditorMode] Missing required fields:', {
            hasQuestionNumber: !!questionNumber,
            hasArticle: !!articleText,
            blanksCount: blanks.length,
            optionsCount: optionPool.length,
        })
        return null
    }

    console.log('[parseEditorMode] Successfully parsed:', {
        questionNumber,
        topic,
        blanksCount: blanks.length,
        optionsCount: optionPool.length,
        distractorsCount: distractorOptions.length,
    })

    return {
        questionNumber,
        topic,
        articleText: articleText.trim(),
        blanks,
        optionPool,
        distractorOptions,
    }
}

/**
 * 從中文描述中提取詞性
 */
function extractPartOfSpeech(chineseText: string): string {
    const posMatch = chineseText.match(/[（(](.+?)[）)]/i)
    if (posMatch) {
        return posMatch[1]
    }

    // 常見詞性關鍵字
    if (chineseText.includes('形容詞')) return '形容詞'
    if (chineseText.includes('動詞')) return '動詞'
    if (chineseText.includes('名詞')) return '名詞'
    if (chineseText.includes('副詞')) return '副詞'

    return ''
}

/**
 * 檢測文字是否為 Editor Mode 格式
 */
export function isEditorModeFormat(text: string): boolean {
    // 檢查關鍵標記
    const hasEditorMarker = text.includes('Editor Mode') || text.includes('實習編輯')
    const hasBlankMarkers = /\{\d+:[a-zA-Z]+\}/i.test(text)
    const hasOptionPool = text.includes('正確選項') && text.includes('共用選項池')
    const hasBlankAnalysis = text.includes('空格') && text.includes('詞性')

    return hasEditorMarker || (hasBlankMarkers && hasOptionPool) || hasBlankAnalysis
}
