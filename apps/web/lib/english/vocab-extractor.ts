import { chatCompletionJSON } from '@/lib/openai'
import type { VocabItem, EnglishQuestionInput } from '@/lib/contracts/explain'

/**
 * Extract vocabulary hints from question stem and options
 * Returns 3-5 key terms with optional translations
 * Optimized: LLM enrichment has 2s timeout, falls back to basic vocab if slow
 */
export async function extractVocab(input: EnglishQuestionInput): Promise<VocabItem[]> {
  const { stem, options } = input
  
  // Combine all text
  const allText = [stem, ...options.map((o) => o.text)].join(' ')
  
  // Extract candidate words (2+ chars, alphabetic)
  const words = allText
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)
  
  // Basic frequency filter (exclude very common words)
  const commonWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one',
    'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old',
    'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too',
    'use', 'have', 'been', 'that', 'this', 'with', 'from', 'they', 'more', 'will', 'what',
    'when', 'your', 'each', 'than', 'them', 'many', 'some', 'time', 'very', 'were', 'come',
    'made', 'make', 'like', 'into', 'over', 'such', 'take', 'only', 'good', 'just', 'most',
    'know', 'back', 'much', 'also', 'well', 'where', 'being', 'which', 'after', 'there',
    'about', 'could', 'other', 'their', 'first', 'would', 'these', 'people',
  ])
  
  // Filter and count
  const wordFreq = new Map<string, number>()
  for (const word of words) {
    if (!commonWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }
  }
  
  // Get option words (higher priority)
  const optionWords = new Set(
    options.flatMap((o) => 
      o.text
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !commonWords.has(w))
    )
  )
  
  // Score words (option words get bonus)
  const scored = Array.from(wordFreq.entries())
    .map(([word, freq]) => ({
      word,
      score: freq + (optionWords.has(word) ? 10 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  
  // Convert to VocabItem (basic vocab, ready to return immediately)
  const basicVocab: VocabItem[] = scored.map(({ word }) => ({
    term: word,
    pos: undefined,
    zh: undefined,
  }))
  
  // If we have API access, try to enrich with translations (with timeout)
  if (process.env.OPENAI_API_KEY && basicVocab.length > 0) {
    try {
      // Set 2-second timeout to avoid blocking the pipeline
      const enriched = await Promise.race([
        enrichVocabWithLLM(basicVocab),
        new Promise<VocabItem[]>((resolve) => 
          setTimeout(() => {
            console.log('[vocab-extractor] LLM enrichment timeout (2s), returning basic vocab')
            resolve(basicVocab)
          }, 2000)
        ),
      ])
      return enriched
    } catch (error) {
      console.warn('[vocab-extractor] LLM enrichment failed, returning basic vocab:', error)
      return basicVocab
    }
  }
  
  return basicVocab
}

/**
 * Enrich vocabulary items with translations using LLM
 */
async function enrichVocabWithLLM(items: VocabItem[]): Promise<VocabItem[]> {

  const terms = items.map((v) => v.term).join(', ')

  const prompt = `請為以下英文單字提供完整的中文釋義和詞性標註（JSON 格式）：

單字：${terms}

要求：
1. 詞性 (pos) 必須使用縮寫：n. (名詞)、v. (動詞)、adj. (形容詞)、adv. (副詞)、prep. (介系詞)、conj. (連接詞)
2. 如果單字有多個詞性,用斜線分隔,例如 "n./v."
3. 中文釋義 (zh) 要簡潔精準,一般 2-4 個字
4. 必須為每個單字都提供 pos 和 zh

格式（僅輸出 JSON，不要其他文字）：
[
  {"term": "attack", "pos": "n./v.", "zh": "攻擊"},
  {"term": "supply", "pos": "n./v.", "zh": "供應"},
  {"term": "burden", "pos": "n.", "zh": "負擔"}
]

請直接輸出 JSON 陣列：`

  const enriched = await chatCompletionJSON<VocabItem[]>(
    [{ role: 'user', content: prompt }],
    {
      model: 'gpt-4o-mini',
      temperature: 0.2,
    }
  )

  console.log('[vocab-extractor] LLM enrichment result:', {
    inputCount: items.length,
    outputCount: Array.isArray(enriched) ? enriched.length : 0,
    sample: Array.isArray(enriched) ? enriched[0] : null,
  })

  // Ensure we return an array with all required fields
  if (Array.isArray(enriched) && enriched.length > 0) {
    return enriched.map((item, idx) => ({
      term: item.term || items[idx]?.term || '',
      pos: item.pos || 'n.',  // 預設為名詞
      zh: item.zh || '未提供翻譯',
    }))
  } else {
    console.warn('[vocab-extractor] LLM returned invalid data, using fallback')
    // Fallback: return items with default values
    return items.map(item => ({
      term: item.term,
      pos: 'n.',
      zh: '未提供翻譯',
    }))
  }
}

