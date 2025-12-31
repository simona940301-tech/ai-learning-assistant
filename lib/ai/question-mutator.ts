/**
 * 🧬 錯題變異系統 (Question Mutation System)
 * 使用 LLM 重新改寫舊錯題，保持核心考點不變，檢測真正的理解能力
 */

import { openai } from '@/lib/openai'

export interface QuestionMutationRequest {
  original_question: {
    stem: string
    choices: string[]
    correct_answer: string
    subject: string
    difficulty: number
    concepts: string[]
  }
  mutation_type?: 'context_change' | 'number_swap' | 'option_shuffle' | 'scenario_shift'
  preserve_difficulty?: boolean
}

export interface QuestionMutationResult {
  mutated_stem: string
  mutated_choices: string[]
  mutated_correct_answer: string
  core_concept_preserved: string
  mutation_type: string
  confidence_score: number
  generation_notes: string
}

/**
 * 🎯 核心變異函數
 */
export async function generateQuestionMutation(
  request: QuestionMutationRequest
): Promise<QuestionMutationResult> {
  const { original_question, mutation_type = 'context_change', preserve_difficulty = true } = request
  
  console.log('[Question Mutator] Generating mutation:', {
    mutation_type,
    subject: original_question.subject,
    concepts: original_question.concepts
  })

  try {
    const mutationPrompt = buildMutationPrompt(original_question, mutation_type, preserve_difficulty)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: MUTATION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: mutationPrompt
        }
      ],
      temperature: 0.7, // 適度創意
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('Empty response from OpenAI')
    }

    const parsed = JSON.parse(response)
    
    // 驗證變異結果
    const validationResult = validateMutationResult(original_question, parsed)
    if (!validationResult.valid) {
      throw new Error(`Mutation validation failed: ${validationResult.reason}`)
    }

    return {
      mutated_stem: parsed.mutated_question,
      mutated_choices: parsed.mutated_options,
      mutated_correct_answer: parsed.mutated_answer,
      core_concept_preserved: parsed.core_concept,
      mutation_type: parsed.actual_mutation_type || mutation_type,
      confidence_score: parsed.confidence || 0.8,
      generation_notes: parsed.generation_notes || ''
    }

  } catch (error) {
    console.error('[Question Mutator] Generation failed:', error)
    throw new Error(`Question mutation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 🎨 構建變異 Prompt
 */
function buildMutationPrompt(
  question: QuestionMutationRequest['original_question'],
  mutationType: string,
  preserveDifficulty: boolean
): string {
  const mutationInstructions = getMutationInstructions(mutationType)
  
  return `
請對以下${question.subject}題目進行「${mutationType}」變異：

【原始題目】
題幹：${question.stem}
選項：
A. ${question.choices[0]}
B. ${question.choices[1]}
C. ${question.choices[2]}
D. ${question.choices[3]}
正確答案：${question.correct_answer}
考查概念：${question.concepts.join(', ')}
難度等級：${question.difficulty}/5

【變異要求】
${mutationInstructions}
${preserveDifficulty ? '- 保持相同的難度等級' : '- 難度可適度調整'}
- 確保核心考點完全一致
- 四個選項的誘答性要保持相似
- 答案選項可以改變位置，但正確性不變

【核心概念檢查清單】
${question.concepts.map(concept => `- ${concept}：必須保持相同的考查深度`).join('\n')}

請以 JSON 格式回應：
{
  "mutated_question": "變異後的題幹",
  "mutated_options": ["選項A", "選項B", "選項C", "選項D"],
  "mutated_answer": "A/B/C/D",
  "core_concept": "主要考查概念",
  "actual_mutation_type": "實際使用的變異類型",
  "confidence": 0.95,
  "generation_notes": "變異說明",
  "concept_preservation_check": {
    ${question.concepts.map(concept => `"${concept}": "preserved"`).join(',\n    ')}
  }
}
`
}

function getMutationInstructions(mutationType: string): string {
  switch (mutationType) {
    case 'context_change':
      return `
- 改變題目的情境背景，但保持數學/邏輯結構
- 例如：將「學校購買」改為「家庭聚會」、「工廠生產」改為「農場種植」
- 保持數據的合理性和現實性
`
    case 'number_swap':
      return `
- 替換題目中的具體數字，但保持計算複雜度
- 確保新數字不會讓計算變得過於簡單或複雜
- 避免出現 0、1 等特殊值
`
    case 'option_shuffle':
      return `
- 重新排列答案選項的順序
- 可適度調整選項的表達方式，但保持選項間的區辨度
- 確保干擾選項仍然具有誘答性
`
    case 'scenario_shift':
      return `
- 將題目從一個學科情境轉換到另一個情境
- 例如：物理題改為經濟題，但數學邏輯相同
- 保持題目的認知負荷和解題步驟
`
    default:
      return '- 進行適當的題目變異，保持核心考點不變'
  }
}

/**
 * ✅ 變異結果驗證
 */
function validateMutationResult(
  original: QuestionMutationRequest['original_question'],
  mutated: any
): { valid: boolean; reason?: string } {
  // 基本結構檢查
  if (!mutated.mutated_question || !mutated.mutated_options || !mutated.mutated_answer) {
    return { valid: false, reason: 'Missing required fields' }
  }

  // 選項數量檢查
  if (mutated.mutated_options.length !== 4) {
    return { valid: false, reason: 'Must have exactly 4 options' }
  }

  // 答案格式檢查
  if (!['A', 'B', 'C', 'D'].includes(mutated.mutated_answer)) {
    return { valid: false, reason: 'Invalid answer format' }
  }

  // 題幹長度檢查 (避免過度簡化或複雜化)
  const originalLength = original.stem.length
  const mutatedLength = mutated.mutated_question.length
  if (mutatedLength < originalLength * 0.5 || mutatedLength > originalLength * 2) {
    return { valid: false, reason: 'Question length changed too drastically' }
  }

  // 概念保持檢查
  if (!mutated.core_concept || mutated.core_concept.length < 3) {
    return { valid: false, reason: 'Core concept not clearly identified' }
  }

  return { valid: true }
}

/**
 * 📝 系統 Prompt
 */
const MUTATION_SYSTEM_PROMPT = `你是一個專業的教育測驗專家，擅長重新改寫考試題目，同時保持其教育價值和考查目標。

你的任務是對題目進行「變異」處理，這是一種先進的教育技術：
1. **保持核心考點**：題目考查的知識點必須完全相同
2. **改變表面形式**：題目的敘述、情境、數據可以改變
3. **檢測真理解**：變異後的題目能區分「記住答案」和「真正理解」

變異原則：
- 🎯 **核心不變**：考查的概念、解題邏輯、認知層次保持一致
- 🔄 **形式變化**：情境、數據、表達方式可以改變
- ⚖️ **難度平衡**：避免因變異而顯著改變題目難度
- 🧠 **認知負荷**：保持相同的心理處理複雜度
- 📊 **選項品質**：干擾選項的誘答性要維持相似水平

請確保變異後的題目仍然是一道高品質的測驗題目，能夠有效評估學生的真實理解程度。`

/**
 * 🎲 批次變異功能
 */
export async function batchMutateQuestions(
  questions: QuestionMutationRequest[],
  options: {
    maxConcurrency?: number
    retryFailures?: boolean
  } = {}
): Promise<{ 
  successful: QuestionMutationResult[]
  failed: { question: QuestionMutationRequest, error: string }[]
}> {
  const { maxConcurrency = 3, retryFailures = true } = options
  const successful: QuestionMutationResult[] = []
  const failed: { question: QuestionMutationRequest, error: string }[] = []

  // 分批處理避免 API 限制
  for (let i = 0; i < questions.length; i += maxConcurrency) {
    const batch = questions.slice(i, i + maxConcurrency)
    
    const batchPromises = batch.map(async (question) => {
      try {
        const result = await generateQuestionMutation(question)
        successful.push(result)
      } catch (error) {
        failed.push({ 
          question, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    })

    await Promise.all(batchPromises)
    
    // API 限制間隔
    if (i + maxConcurrency < questions.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // 重試失敗的題目
  if (retryFailures && failed.length > 0) {
    console.log(`[Question Mutator] Retrying ${failed.length} failed mutations`)
    
    const retryResults = await batchMutateQuestions(
      failed.map(f => f.question),
      { maxConcurrency: 1, retryFailures: false }
    )
    
    successful.push(...retryResults.successful)
  }

  console.log(`[Question Mutator] Batch complete: ${successful.length} successful, ${failed.length} failed`)
  
  return { successful, failed }
}

/**
 * 🔍 變異品質評估
 */
export function evaluateMutationQuality(
  original: QuestionMutationRequest['original_question'],
  mutated: QuestionMutationResult
): {
  conceptPreservation: number // 0-1
  difficultyConsistency: number // 0-1
  linguisticDiversity: number // 0-1
  overallQuality: number // 0-1
} {
  // 這裡可以實現更精細的品質評估演算法
  // 暫時返回基於規則的評估
  
  const conceptPreservation = mutated.confidence_score
  const difficultyConsistency = 0.85 // 假設難度保持良好
  const linguisticDiversity = calculateLinguisticDiversity(original.stem, mutated.mutated_stem)
  
  const overallQuality = (conceptPreservation + difficultyConsistency + linguisticDiversity) / 3

  return {
    conceptPreservation,
    difficultyConsistency,
    linguisticDiversity,
    overallQuality
  }
}

function calculateLinguisticDiversity(original: string, mutated: string): number {
  // 簡單的詞彙重疊度計算
  const originalWords = new Set(original.split(/\s+/))
  const mutatedWords = new Set(mutated.split(/\s+/))
  
  const intersection = new Set([...originalWords].filter(word => mutatedWords.has(word)))
  const overlap = intersection.size / originalWords.size
  
  return Math.max(0, Math.min(1, 1 - overlap)) // 重疊越少，多樣性越高
}