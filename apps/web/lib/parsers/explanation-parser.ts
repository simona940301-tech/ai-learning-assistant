/**
 * 詳解檔案解析器
 * 
 * 解析包含題目、選項、答案、難度、標籤的詳解檔案格式
 * 
 * 支援格式：
 * 📝 題目 1
 * 1. Mangoes are a _____ fruit... (A) mature (B) usual (C) seasonal (D) particular
 * 答案：C 難度：3 標籤： 英文-詞彙題, 英文-自然/季節
 * 🧠 詳解
 * 核心考點：...
 * 題幹翻譯：...
 * 判斷詞義：...
 * 結論：...
 */

export interface ParsedQuestion {
  questionNumber: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  difficulty: number
  knowledgeTags: string[]
  explanation?: {
    correctAnalysis?: string
    translation?: string
    wordMeanings?: Array<{ option: string; word: string; meaning: string }>
    conclusion?: string
    optionAnalysis?: string
    structuredOptionAnalysis?: Record<string, string>
    fullText?: string
  }
}

/**
 * 解析詳解檔案（TXT 格式）
 * 
 * 格式：
 * 📝 題目 1
 * 1. Question text with (A) option (B) option (C) option (D) option
 * 答案：C 難度：3 標籤： tag1, tag2
 * 🧠 詳解
 * 核心考點：...
 * 題幹翻譯：...
 * 判斷詞義：...
 * 結論：...
 */
export function parseExplanationFile(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)

  console.log('[parseExplanationFile] Total lines:', lines.length)
  console.log('[parseExplanationFile] First 10 lines:', lines.slice(0, 10))

  let currentQuestion: Partial<ParsedQuestion> | null = null
  let inExplanation = false
  let explanationLines: string[] = []
  let explanationSections: Record<string, string> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 檢測題目開始（📝 題目 1 或 題目 1）
    const questionNumberMatch =
      line.match(/^📝\s*題目\s*[：:：]?\s*(\d+)/i) ||
      line.match(/^題目\s*[：:：]?\s*(\d+)/i) ||
      line.match(/^📝\s*題目(\d+)/i)

    if (questionNumberMatch) {
      // 保存前一個題目
      if (currentQuestion) {
        if (isQuestionComplete(currentQuestion)) {
          // 整理詳解
          if (explanationLines.length > 0 || Object.keys(explanationSections).length > 0) {
            currentQuestion.explanation = {
              fullText: explanationLines.join('\n'),
              correctAnalysis: explanationSections['正確解析'] || explanationSections['核心考點'] || explanationSections['核心要點'],
              translation: explanationSections['題幹翻譯'] || explanationSections['題目翻譯'],
              conclusion: explanationSections['結論'],
              optionAnalysis: explanationSections['選項分析'],
              structuredOptionAnalysis: parseStructuredOptionAnalysis(explanationSections['選項分析']),
              ...parseWordMeanings(explanationLines),
            }
          }
          questions.push(currentQuestion as ParsedQuestion)
          console.log('[parseExplanationFile] Added question:', currentQuestion.questionNumber)
        } else {
          console.warn('[parseExplanationFile] Incomplete question skipped:', {
            questionNumber: currentQuestion.questionNumber,
            hasText: !!currentQuestion.questionText,
            hasOptions: !!(currentQuestion.optionA && currentQuestion.optionB && currentQuestion.optionC && currentQuestion.optionD),
            hasAnswer: !!currentQuestion.correctAnswer,
            hasDifficulty: !!currentQuestion.difficulty,
          })
        }
      }

      // 開始新題目
      currentQuestion = {
        questionNumber: questionNumberMatch[1],
        knowledgeTags: [],
      }
      inExplanation = false
      explanationLines = []
      explanationSections = {}
      console.log('[parseExplanationFile] Starting question:', questionNumberMatch[1])
      continue
    }

    if (!currentQuestion) continue

    // 檢測題目行：包含題號、題目文字和選項在同一行
    // 格式：1. Question text (A) option (B) option (C) option (D) option
    // 使用更寬鬆的正則，允許各種空格情況
    const questionLineMatch = line.match(/^(\d+)\.\s*(.+?)\s*\(([A-D])\)\s*(.+?)\s*\(([A-D])\)\s*(.+?)\s*\(([A-D])\)\s*(.+?)\s*\(([A-D])\)\s*(.+?)$/i)

    if (questionLineMatch && !currentQuestion.questionText) {
      const questionText = questionLineMatch[2].trim()
      const options = [
        { letter: questionLineMatch[3], text: questionLineMatch[4] },
        { letter: questionLineMatch[5], text: questionLineMatch[6] },
        { letter: questionLineMatch[7], text: questionLineMatch[8] },
        { letter: questionLineMatch[9], text: questionLineMatch[10] },
      ]

      currentQuestion.questionText = questionText

      // 按字母順序分配選項
      for (const opt of options) {
        const letter = opt.letter.toUpperCase()
        const text = opt.text.trim()
        if (letter === 'A') currentQuestion.optionA = text
        else if (letter === 'B') currentQuestion.optionB = text
        else if (letter === 'C') currentQuestion.optionC = text
        else if (letter === 'D') currentQuestion.optionD = text
      }

      console.log('[parseExplanationFile] Found question line:', {
        text: questionText.substring(0, 50),
        options: options.map(o => `${o.letter}: ${o.text.substring(0, 20)}`),
      })
      continue
    }

    // 如果題目行匹配失敗，嘗試分步解析（題目文字和選項可能分開）
    // 先檢測題目文字行（包含題號和題目文字，但沒有選項）
    if (!currentQuestion.questionText && line.match(/^\d+\.\s+.+/) && !line.match(/\([A-D]\)/i)) {
      const textMatch = line.match(/^\d+\.\s+(.+)$/)
      if (textMatch) {
        currentQuestion.questionText = textMatch[1].trim()
        console.log('[parseExplanationFile] Found question text:', currentQuestion.questionText.substring(0, 50))
        continue
      }
    }

    // 檢測沒有題號的題目文字行（直接跟在題目標記後面）
    // 格式：If you put a _________ under... 或包含選項的完整題目行
    if (!currentQuestion.questionText &&
      !line.match(/^(答案|難度|標籤|🧠|📝|題目|選項分析|核心考點|題幹翻譯|判斷詞義|結論)/i) &&
      line.length > 10) {
      // 檢查是否是英文題目（包含字母和可能的填空符號）
      if (line.match(/[a-zA-Z]/) && (line.match(/[a-zA-Z].*[a-zA-Z]/) || line.match(/_+/))) {
        // 檢查這一行是否同時包含答案、難度、標籤（題目文字和答案在同一行）
        const metaInLineMatch = line.match(/答案[：:：]\s*([A-DＡ-Ｄ])\s+難度[：:：]\s*(\d+)\s+標籤[：:：]\s*(.+)$/i)
        if (metaInLineMatch) {
          // 題目文字在「答案」之前
          const questionTextMatch = line.match(/^(.+?)\s*答案[：:：]/i)
          if (questionTextMatch) {
            currentQuestion.questionText = questionTextMatch[1].trim()
            // 同時提取答案、難度、標籤
            let answer = metaInLineMatch[1]
            const fullToHalf: Record<string, string> = { 'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D' }
            answer = fullToHalf[answer] || answer
            currentQuestion.correctAnswer = answer.toUpperCase() as 'A' | 'B' | 'C' | 'D'
            currentQuestion.difficulty = parseInt(metaInLineMatch[2])
            currentQuestion.knowledgeTags = metaInLineMatch[3]
              .split(/[,，、]/)
              .map(tag => tag.trim())
              .filter(Boolean)
            console.log('[parseExplanationFile] Found question text with meta in same line:', {
              text: currentQuestion.questionText.substring(0, 50),
              answer: currentQuestion.correctAnswer,
              difficulty: currentQuestion.difficulty,
            })
            continue
          }
        } else {
          // 檢查是否包含選項，如果是則分離題目文字和選項
          const optionsMatch = line.match(/^(.+?)\s*\(([A-D])\)\s*(.+?)\s*\(([A-D])\)\s*(.+?)\s*\(([A-D])\)\s*(.+?)\s*\(([A-D])\)\s*(.+?)$/i)
          if (optionsMatch) {
            // 題目文字和選項在同一行
            const questionText = optionsMatch[1].trim()
            const options = [
              { letter: optionsMatch[2], text: optionsMatch[3] },
              { letter: optionsMatch[4], text: optionsMatch[5] },
              { letter: optionsMatch[6], text: optionsMatch[7] },
              { letter: optionsMatch[8], text: optionsMatch[9] },
            ]

            currentQuestion.questionText = questionText

            // 按字母順序分配選項
            for (const opt of options) {
              const letter = opt.letter.toUpperCase()
              const text = opt.text.trim()
              if (letter === 'A') currentQuestion.optionA = text
              else if (letter === 'B') currentQuestion.optionB = text
              else if (letter === 'C') currentQuestion.optionC = text
              else if (letter === 'D') currentQuestion.optionD = text
            }

            console.log('[parseExplanationFile] Found question with options in same line:', {
              text: questionText.substring(0, 50),
              options: options.map(o => `${o.letter}: ${o.text.substring(0, 20)}`),
            })
            continue
          } else {
            // 只有題目文字，沒有答案在同一行
            currentQuestion.questionText = line.trim()
            console.log('[parseExplanationFile] Found question text (no number):', currentQuestion.questionText.substring(0, 50))
            continue
          }
        }
      }
    }

    // 檢測選項行（如果題目和選項分開）
    if (currentQuestion.questionText && !currentQuestion.optionA) {
      // 嘗試匹配整行的選項：(A) text (B) text (C) text (D) text
      const allOptionsMatch = line.match(/\(([A-D])\)\s*(.+?)\s*\(([A-D])\)\s*(.+?)\s*\(([A-D])\)\s*(.+?)\s*\(([A-D])\)\s*(.+?)$/i)
      if (allOptionsMatch) {
        const options = [
          { letter: allOptionsMatch[1], text: allOptionsMatch[2] },
          { letter: allOptionsMatch[3], text: allOptionsMatch[4] },
          { letter: allOptionsMatch[5], text: allOptionsMatch[6] },
          { letter: allOptionsMatch[7], text: allOptionsMatch[8] },
        ]

        for (const opt of options) {
          const letter = opt.letter.toUpperCase()
          const text = opt.text.trim()
          if (letter === 'A') currentQuestion.optionA = text
          else if (letter === 'B') currentQuestion.optionB = text
          else if (letter === 'C') currentQuestion.optionC = text
          else if (letter === 'D') currentQuestion.optionD = text
        }
        console.log('[parseExplanationFile] Found options line')
        continue
      }
    }

    // 檢測單獨一行的選項：(A) text（支援全形和半形括號）
    if (currentQuestion.questionText) {
      const singleOptionMatch =
        line.match(/^\(([A-D])\)\s*(.+)$/i) ||      // (A) text 半形
        line.match(/^（([A-D])）\s*(.+)$/i)         // （A） text 全形

      if (singleOptionMatch) {
        const letter = singleOptionMatch[1].toUpperCase()
        const text = singleOptionMatch[2].trim()

        if (letter === 'A' && !currentQuestion.optionA) {
          currentQuestion.optionA = text
          console.log('[parseExplanationFile] Found single option A:', text)
        } else if (letter === 'B' && !currentQuestion.optionB) {
          currentQuestion.optionB = text
          console.log('[parseExplanationFile] Found single option B:', text)
        } else if (letter === 'C' && !currentQuestion.optionC) {
          currentQuestion.optionC = text
          console.log('[parseExplanationFile] Found single option C:', text)
        } else if (letter === 'D' && !currentQuestion.optionD) {
          currentQuestion.optionD = text
          console.log('[parseExplanationFile] Found single option D:', text)
        }
        continue
      }
    }

    // 檢測答案、難度、標籤在同一行
    // 格式：答案：C 難度：3 標籤： 英文-詞彙題, 英文-自然/季節
    // 或：答案： (A)難度： 2標籤： 英文-詞彙題
    // 注意：標籤前面可能有空格，使用更寬鬆的匹配，支援全形字符和括號
    const metaLineMatch =
      line.match(/答案[：:：]\s*\(?([A-DＡ-Ｄ])\)?\s*難度[：:：]\s*(\d+)\s*標籤[：:：]\s*(.+)$/i) ||
      line.match(/答案[：:：]\s*（?([A-DＡ-Ｄ])）?\s*難度[：:：]\s*(\d+)\s*標籤[：:：]\s*(.+)$/i)

    if (metaLineMatch) {
      // 將全形字符轉換為半形
      let answer = metaLineMatch[1]
      const fullToHalf: Record<string, string> = { 'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D' }
      answer = fullToHalf[answer] || answer
      currentQuestion.correctAnswer = answer.toUpperCase() as 'A' | 'B' | 'C' | 'D'
      currentQuestion.difficulty = parseInt(metaLineMatch[2])

      // 解析標籤（支援逗號、中文逗號、頓號分隔）
      currentQuestion.knowledgeTags = metaLineMatch[3]
        .split(/[,，、]/)
        .map(tag => tag.trim())
        .filter(Boolean)

      console.log('[parseExplanationFile] Found meta:', {
        answer: currentQuestion.correctAnswer,
        difficulty: currentQuestion.difficulty,
        tags: currentQuestion.knowledgeTags,
      })
      continue
    }

    // 分別檢測答案、難度、標籤（如果不在同一行）
    // 支援全形和半形字符：答案：C 或 答案：Ｂ 或 答案： (A)
    const answerMatch =
      line.match(/^答案[：:：]\s*\(?([A-DＡ-Ｄ])\)?/i) ||
      line.match(/^答案[：:：]\s*（?([A-DＡ-Ｄ])）?/i)
    if (answerMatch && !currentQuestion.correctAnswer) {
      // 將全形字符轉換為半形
      let answer = answerMatch[1]
      const fullToHalf: Record<string, string> = { 'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D' }
      answer = fullToHalf[answer] || answer
      currentQuestion.correctAnswer = answer.toUpperCase() as 'A' | 'B' | 'C' | 'D'
      console.log('[parseExplanationFile] Found answer:', currentQuestion.correctAnswer)
      continue
    }

    const difficultyMatch = line.match(/^難度[：:：]\s*(\d+)/i)
    if (difficultyMatch && !currentQuestion.difficulty) {
      const difficulty = parseInt(difficultyMatch[1])
      if (difficulty >= 1 && difficulty <= 5) {
        currentQuestion.difficulty = difficulty
        console.log('[parseExplanationFile] Found difficulty:', difficulty)
      }
      continue
    }

    const tagsMatch = line.match(/^標籤[：:：]\s*(.+)$/i)
    if (tagsMatch && currentQuestion.knowledgeTags && currentQuestion.knowledgeTags.length === 0) {
      currentQuestion.knowledgeTags = tagsMatch[1]
        .split(/[,，、]/)
        .map(tag => tag.trim())
        .filter(Boolean)
      console.log('[parseExplanationFile] Found tags:', currentQuestion.knowledgeTags)
      continue
    }

    // 檢測「選項分析」區塊並提取選項（在詳解區塊內或外都可以）
    // 也檢測「選項分析：」（帶冒號）的情況
    if (line.match(/^選項分析[：:：]?/i)) {
      console.log('[parseExplanationFile] Found 選項分析 section at line:', i)
      // 開始收集選項
      let optionLineIndex = i + 1
      let foundOptions = 0

      // 檢查選項是否在同一行（選項分析：後面直接跟著空行或內容）
      const sameLineMatch = line.match(/^選項分析[：:：]\s*(.+)$/i)
      if (sameLineMatch && sameLineMatch[1].trim()) {
        // 選項可能在同一行，跳過這種情況，從下一行開始
        console.log('[parseExplanationFile] 選項分析 has content on same line, starting from next line')
      }

      while (optionLineIndex < lines.length) {
        const optionLine = lines[optionLineIndex]
        console.log('[parseExplanationFile] Checking option line:', optionLineIndex, optionLine.substring(0, 60))

        // 如果遇到下一個區塊標題或題目，停止
        if (optionLine.match(/^(核心考點|題幹翻譯|判斷詞義|結論|🧠|📝|題目\s*\d+)/i)) {
          console.log('[parseExplanationFile] Reached next section, stopping option extraction')
          break
        }

        // 匹配格式：* (A) text 或 (A) text，支援全形和半形括號
        const optionMatch =
          optionLine.match(/^[*•]\s*\(([A-D])\)\s*(.+)$/i) ||      // * (A) 半形
          optionLine.match(/^[*•]\s*（([A-D])）\s*(.+)$/i) ||     // * （A） 全形
          optionLine.match(/^\(([A-D])\)\s*(.+)$/i) ||            // (A) 半形
          optionLine.match(/^（([A-D])）\s*(.+)$/i)              // （A） 全形
        if (optionMatch) {
          const letter = optionMatch[1].toUpperCase()
          // 提取選項文字
          let optionText = optionMatch[2].trim()

          console.log('[parseExplanationFile] Raw option text:', letter, '=', optionText.substring(0, 50))

          // 提取第一個英文單字（在第一個空格或括號之前）
          // 格式：word (N.) 中文解釋 -> 只取 word
          // 格式：word （N.） 中文解釋 -> 只取 word
          const firstWordMatch = optionText.match(/^([a-zA-Z]+)/)
          if (firstWordMatch) {
            optionText = firstWordMatch[1].trim()
            console.log('[parseExplanationFile] Extracted first word:', optionText)
          } else {
            // 如果沒有匹配到英文字母開頭，嘗試去除括號（全形和半形）後取第一個詞
            const cleanText = optionText
              .replace(/\s*\([^)]+\)\s*/g, ' ')    // 移除半形括號
              .replace(/\s*（[^）]+）\s*/g, ' ')   // 移除全形括號
              .trim()
            optionText = cleanText.split(/\s+/)[0]
            console.log('[parseExplanationFile] Extracted word using fallback:', optionText)
          }

          if (letter === 'A' && !currentQuestion.optionA) {
            currentQuestion.optionA = optionText
            foundOptions++
            console.log('[parseExplanationFile] Set optionA =', optionText)
          } else if (letter === 'B' && !currentQuestion.optionB) {
            currentQuestion.optionB = optionText
            foundOptions++
            console.log('[parseExplanationFile] Set optionB =', optionText)
          } else if (letter === 'C' && !currentQuestion.optionC) {
            currentQuestion.optionC = optionText
            foundOptions++
            console.log('[parseExplanationFile] Set optionC =', optionText)
          } else if (letter === 'D' && !currentQuestion.optionD) {
            currentQuestion.optionD = optionText
            foundOptions++
            console.log('[parseExplanationFile] Set optionD =', optionText)
          }
        }
        optionLineIndex++
        // 如果已經找到4個選項，可以提前停止
        if (foundOptions >= 4) {
          console.log('[parseExplanationFile] Found all 4 options, stopping')
          break
        }
      }
      console.log('[parseExplanationFile] Finished extracting options, found:', foundOptions)
      // 跳過已處理的選項行
      i = optionLineIndex - 1
      continue
    }

    // 檢測詳解開始（🧠 詳解）
    if (line.match(/^🧠\s*詳解/i) || line.match(/^詳解[：:：]?.*$/i)) {
      inExplanation = true
      explanationLines = []
      explanationSections = {}

      // 如果詳解標題後還有內容，不需要 continue，讓後續邏輯處理同一行的內容
      // 例如：🧠 詳解 正確解析：...
      // 只有當整行只有「詳解」時才 continue
      if (line.match(/^🧠\s*詳解$/i) || line.match(/^詳解[：:：]?$/i)) {
        continue
      }
      // 如果有內容，去掉前面的「詳解」標記，保留剩下內容讓後續處理
      // 但為了簡單起見，我們讓後續的 sectionMatch 邏輯去抓，只要不 continue 即可
      // 不過要注意 sectionMatch 是 ^([^：:：]+)[：:：] 開頭，如果這一行是 "🧠 詳解 正確解析：..."
      // 那麼 sectionMatch 會抓到 "🧠 詳解 正確解析" 作為標題，這不是我們要的
      // 所以這裡要做一次預處理，把 "🧠 詳解" 或 "詳解" 去掉

      const cleanLine = line.replace(/^🧠\s*詳解\s*/i, '').replace(/^詳解[：:：]?\s*/i, '')
      if (cleanLine) {
        // 這一行變成了 "正確解析：..."，可以直接往下走
        // 但是 for loop 的 line 是 const，不能改
        // 所以我們手動觸發一下 section 檢查 logic ?
        // 或者更好的方式：不要 continue，而是讓下面的邏輯針對 cleanLine 跑？
        // 由於下面用的是 line 變數，我們必須在下一個循環處理，或者把它轉換成一種特殊的處理

        const sectionMatch = cleanLine.match(/^([^：:：]+)[：:：]\s*(.+)$/)
        if (sectionMatch) {
          const sectionTitle = sectionMatch[1].trim()
          const sectionContent = sectionMatch[2].trim()
          if (['核心考點', '核心要點', '正確解析', '題幹翻譯', '題目翻譯', '結論', '選項分析'].includes(sectionTitle)) {
            explanationSections[sectionTitle] = sectionContent
            console.log('[parseExplanationFile] Found section (same line):', sectionTitle, sectionContent.substring(0, 50))
          }
        }
        if (cleanLine.length > 0) {
          explanationLines.push(cleanLine)
        }
        continue
      }
      continue
    }

    // 收集詳解內容（移除 optionA 的檢查，允許在沒有選項時也收集詳解）
    if (inExplanation || (currentQuestion.questionText && currentQuestion.correctAnswer)) {
      // 如果遇到下一個題目的標記，停止收集
      if (line.match(/^📝\s*題目\s*\d+/i) || line.match(/^題目\s*\d+/i)) {
        i-- // 回退一行，讓外層循環處理
        continue
      }

      // 檢測詳解區段標題
      const sectionMatch = line.match(/^([^：:：]+)[：:：]\s*(.+)$/)
      if (sectionMatch) {
        const sectionTitle = sectionMatch[1].trim()
        const sectionContent = sectionMatch[2].trim()

        // 記錄主要區段
        if (['核心考點', '核心要點', '正確解析', '題幹翻譯', '題目翻譯', '結論', '選項分析'].includes(sectionTitle)) {
          explanationSections[sectionTitle] = sectionContent
          console.log('[parseExplanationFile] Found section:', sectionTitle, sectionContent.substring(0, 50))
        }
      }

      // 收集所有詳解內容
      if (line.length > 0) {
        explanationLines.push(line)
      }
    }
  }

  // 保存最後一個題目
  if (currentQuestion) {
    if (isQuestionComplete(currentQuestion)) {
      if (explanationLines.length > 0 || Object.keys(explanationSections).length > 0) {
        currentQuestion.explanation = {
          fullText: explanationLines.join('\n'),
          correctAnalysis: explanationSections['正確解析'] || explanationSections['核心考點'] || explanationSections['核心要點'],
          translation: explanationSections['題幹翻譯'] || explanationSections['題目翻譯'],
          conclusion: explanationSections['結論'],
          optionAnalysis: explanationSections['選項分析'],
          structuredOptionAnalysis: parseStructuredOptionAnalysis(explanationSections['選項分析']),
          ...parseWordMeanings(explanationLines),
        }
      }
      questions.push(currentQuestion as ParsedQuestion)
      console.log('[parseExplanationFile] Added final question:', currentQuestion.questionNumber)
    } else {
      console.warn('[parseExplanationFile] Final question incomplete:', {
        questionNumber: currentQuestion.questionNumber,
        hasText: !!currentQuestion.questionText,
        hasOptions: !!(currentQuestion.optionA && currentQuestion.optionB && currentQuestion.optionC && currentQuestion.optionD),
        hasAnswer: !!currentQuestion.correctAnswer,
        hasDifficulty: !!currentQuestion.difficulty,
      })
    }
  }

  console.log('[parseExplanationFile] Total questions parsed:', questions.length)
  return questions
}

/**
 * 從詳解內容中解析單字意思
 */
function parseWordMeanings(lines: string[]): { wordMeanings?: Array<{ option: string; word: string; meaning: string }> } {
  const wordMeanings: Array<{ option: string; word: string; meaning: string }> = []
  let inWordMeanings = false

  for (const line of lines) {
    // 檢測「判斷詞義」區段
    if (line.match(/^判斷詞義[：:：]?$/i)) {
      inWordMeanings = true
      continue
    }

    if (inWordMeanings) {
      // 解析格式：(A) word (adj.) 意思
      const match = line.match(/^\(([A-D])\)\s*([^(]+?)\s*\(([^)]+)\)\s*(.+)$/i)
      if (match) {
        wordMeanings.push({
          option: match[1].toUpperCase(),
          word: match[2].trim(),
          meaning: `${match[3].trim()} ${match[4].trim()}`,
        })
      }
    }
  }

  return wordMeanings.length > 0 ? { wordMeanings } : {}
}

/**
 * 檢查題目是否完整
 * 注意：對於填空題，選項可能是可選的
 */
function isQuestionComplete(question: Partial<ParsedQuestion>): boolean {
  const hasBasicInfo = !!(
    question.questionNumber &&
    question.questionText &&
    question.correctAnswer &&
    question.difficulty
  )

  if (!hasBasicInfo) return false

  // 檢查是否是選擇題（需要所有選項）還是填空題（不需要選項）
  const isMultipleChoice = question.questionText?.includes('(A)') || question.questionText?.includes('(B)') ||
    question.questionText?.includes('(C)') || question.questionText?.includes('(D)')

  if (isMultipleChoice) {
    // 選擇題需要所有選項
    return !!(question.optionA && question.optionB && question.optionC && question.optionD)
  } else {
    // 填空題只需要基本資訊
    return true
  }
}

/**
 * 解析結構化的選項分析
 * 格式：
 * (A) text
 * (B) text
 * ...
 */
function parseStructuredOptionAnalysis(text: string | undefined): Record<string, string> | undefined {
  if (!text) return undefined

  const result: Record<string, string> = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    // 支援單行包含多個選項：(A) text (B) text ...
    const lineOptions = [...line.matchAll(/(\([A-D]\)|（[A-D]）)([^()（）]+)/g)]

    if (lineOptions.length > 0) {
      for (const match of lineOptions) {
        // match[1] 是選項代號 (A) 或 （A），match[2] 是內容
        const letterMatch = match[1].match(/[A-D]/i)
        if (letterMatch) {
          const option = letterMatch[0].toUpperCase()
          const analysis = match[2].trim()
          result[option] = analysis
        }
      }
      continue
    }

    // 支援舊格式：一行一個選項
    const match =
      line.match(/^\(([A-D])\)\s*(.+)$/i) ||
      line.match(/^（([A-D])）\s*(.+)$/i) ||
      line.match(/^[*•]\s*\(([A-D])\)\s*(.+)$/i) ||
      line.match(/^[*•]\s*（([A-D])）\s*(.+)$/i)

    if (match) {
      const option = match[1].toUpperCase()
      const analysis = match[2].trim()
      result[option] = analysis
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}
