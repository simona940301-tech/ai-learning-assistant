import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getModelConfig } from '@/lib/config/model-config'

export const dynamic = 'force-dynamic'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
})

/**
 * Document Group Schema
 * Represents classified groups of documents by subject
 */
const DocumentGroupSchema = z.object({
    groups: z.array(z.object({
        subject: z.enum([
            '國文', '英文', '數學A', '數學B',
            '物理', '化學', '生物', '地科',
            '歷史', '地理', '公民', '其他'
        ]).describe('科目分類'),
        documentIds: z.array(z.string()).describe('該科目的文件 ID 列表'),
        confidence: z.number().min(0).max(1).describe('分類信心度 0-1，0.8+ 為高信心'),
        reasoning: z.string().optional().describe('分類理由（可選）')
    }))
})

type DocumentGroup = z.infer<typeof DocumentGroupSchema>

/**
 * POST /api/rag/router-classify
 * 
 * Intelligently classifies and groups uploaded documents by subject
 * 
 * Input: { documentIds: string[] }
 * Output: { groups: DocumentGroup[] }
 * 
 * Features:
 * - Chain-of-Thought prompting for better accuracy
 * - Confidence scoring
 * - Fast classification using Gemini 2.5 Flash
 * - Graceful handling of single documents
 */
export async function POST(req: NextRequest) {
    try {
        const { documentIds } = await req.json()

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return Response.json({
                error: 'VALIDATION_ERROR',
                message: '請提供有效的文件 ID 列表'
            }, { status: 400 })
        }

        console.log('[Router Classify] 📋 Classifying documents:', documentIds.length)

        // Single document - no classification needed
        if (documentIds.length === 1) {
            console.log('[Router Classify] ✅ Single document, skipping classification')
            return Response.json({
                groups: [{
                    subject: '其他',
                    documentIds: documentIds,
                    confidence: 1.0,
                    reasoning: '單一文件，無需分類'
                }]
            })
        }

        // Fetch document previews (first 2000 chars each for speed)
        const supabase = createClient()
        const { data: documents, error } = await supabase
            .from('rag_documents')
            .select('id, filename, original_text')
            .in('id', documentIds)

        if (error) {
            console.error('[Router Classify] ❌ Database error:', error)
            return Response.json({
                error: 'DATABASE_ERROR',
                message: '無法讀取文件'
            }, { status: 500 })
        }

        if (!documents || documents.length === 0) {
            return Response.json({
                error: 'NOT_FOUND',
                message: '找不到指定的文件'
            }, { status: 404 })
        }

        // Build document previews
        const documentPreviews = documents.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            preview: doc.original_text.substring(0, 2000)  // 2000 chars for fast classification
        }))

        console.log('[Router Classify] 📝 Analyzing previews...')

        // Get model configuration
        const modelConfig = getModelConfig('router-classify')

        // ⚡ ENHANCED PROMPT: Chain-of-Thought for better accuracy
        const prompt = `你是一名專業的科目分類專家。請分析以下文件預覽內容，使用思考鏈 (Chain-of-Thought) 方法進行精確分類。

## 分類步驟 (請嚴格遵循)

1. **識別主題關鍵詞**：
   - 仔細閱讀每個文件的預覽（2000字）
   - 找出核心主題、專有名詞、學科特徵詞
   - 例如：「光合作用」→ 生物、「三角函數」→ 數學、「法國大革命」→ 歷史

2. **匹配科目**：
   - 將識別的主題關鍵詞對應到以下科目列表
   - 科目列表：國文、英文、數學A、數學B、物理、化學、生物、地科、歷史、地理、公民、其他
   - 如果無法明確判斷，使用「其他」

3. **分組**：
   - 將主題相同的文件 ID 歸入同一個群組
   - 不同科目的文件必須分開
   - 每個群組必須有明確的科目標籤

4. **信心度評估**：
   - 0.9-1.0：關鍵詞明確，科目特徵明顯（如「牛頓定律」→ 物理）
   - 0.7-0.8：主題清晰，但可能有交叉（如「環境議題」可能是地理或公民）
   - 0.5-0.6：主題模糊，需要更多上下文
   - <0.5：無法判斷，建議使用「其他」

## 文件列表

${documentPreviews.map((doc, i) => `
### 文件 ${i + 1}
- **ID**: ${doc.id}
- **檔名**: ${doc.filename}
- **預覽內容**:
${doc.preview}

---
`).join('\n')}

## 輸出要求

請輸出 JSON 格式的分組結果，包含：
- groups: 分組列表
  - subject: 科目名稱（必須從科目列表中選擇）
  - documentIds: 該科目的文件 ID 陣列
  - confidence: 信心度 (0-1)
  - reasoning: 簡短說明分類理由（可選）

範例輸出：
{
  "groups": [
    {
      "subject": "物理",
      "documentIds": ["id1", "id2"],
      "confidence": 0.95,
      "reasoning": "包含「牛頓定律」、「力學」等物理關鍵詞"
    },
    {
      "subject": "歷史",
      "documentIds": ["id3"],
      "confidence": 0.85,
      "reasoning": "提到「法國大革命」、「拿破崙」等歷史事件"
    }
  ]
}

現在請開始分析並輸出 JSON 結果。`

        // Generate classification using Gemini 2.5 Flash
        const result = await generateObject({
            model: google(modelConfig.modelName),
            temperature: modelConfig.temperature,
            schema: DocumentGroupSchema,
            prompt: prompt
        })

        console.log('[Router Classify] ✅ Classification complete:', result.object.groups.length, 'groups')

        // Log classification results for debugging
        result.object.groups.forEach((group, idx) => {
            console.log(`[Router Classify] Group ${idx + 1}:`, {
                subject: group.subject,
                documentCount: group.documentIds.length,
                confidence: group.confidence
            })
        })

        return Response.json(result.object)

    } catch (error) {
        console.error('[Router Classify] ❌ Error:', error)

        const errorMessage = error instanceof Error ? error.message : String(error)

        return Response.json({
            error: 'CLASSIFICATION_ERROR',
            message: '分類失敗，請稍後再試',
            debug: errorMessage
        }, { status: 500 })
    }
}
