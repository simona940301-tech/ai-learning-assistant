import { NextRequest } from 'next/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getModelConfig } from '@/lib/config/model-config'
import { getApiUser } from '@/lib/api/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

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
type DocumentGroupItem = DocumentGroup['groups'][number]

type RouterJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface DocumentRecord {
    id: string
    filename: string
    original_text: string | null
}

const ClassificationRequestSchema = z.object({
    documentIds: z.array(z.string().uuid()).min(1, '至少需要 1 個文件').max(24, '一次最多分類 24 個文件'),
})

const JobQuerySchema = z.object({
    jobId: z.string().uuid(),
})

const estimateDuration = (count: number) => {
    const base = 1600
    const perDoc = 500
    return Math.min(8000, base + perDoc * Math.max(count, 1))
}

/**
 * POST /api/rag/router-classify
 *
 * Schedules async document classification job and immediately returns job status
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const parseResult = ClassificationRequestSchema.safeParse(body)

        if (!parseResult.success) {
            return Response.json({
                error: 'VALIDATION_ERROR',
                message: parseResult.error.errors[0]?.message ?? '請提供有效的文件 ID 列表'
            }, { status: 400 })
        }

        const { documentIds } = parseResult.data
        const uniqueIds = Array.from(new Set(documentIds))

        const { supabase, user, errorType } = await getApiUser(req)
        if (!user) {
            return Response.json({
                error: 'UNAUTHORIZED',
                message: '需要登入',
                debug: { errorType }
            }, { status: 401 })
        }

        console.log('[Router Classify] 🧾 Scheduling job:', {
            userId: user.id,
            documentCount: uniqueIds.length
        })

        const { data: documents, error: docError } = await supabase
            .from('rag_documents')
            .select('id, filename, original_text')
            .in('id', uniqueIds)

        if (docError) {
            console.error('[Router Classify] ❌ Document fetch error:', docError)
            return Response.json({
                error: 'DATABASE_ERROR',
                message: '無法讀取文件'
            }, { status: 500 })
        }

        if (!documents || documents.length !== uniqueIds.length) {
            return Response.json({
                error: 'NOT_FOUND',
                message: '部分文件不存在或無權限'
            }, { status: 404 })
        }

        const etaMs = estimateDuration(uniqueIds.length)

        const { data: job, error: insertError } = await supabase
            .from('rag_router_jobs')
            .insert({
                user_id: user.id,
                document_ids: uniqueIds,
                status: 'pending',
                eta_ms: etaMs
            })
            .select('*')
            .single()

        if (insertError || !job) {
            console.error('[Router Classify] ❌ Failed to create job:', insertError)
            return Response.json({
                error: 'DATABASE_ERROR',
                message: '無法建立分類任務'
            }, { status: 500 })
        }

        // Single document: mark as completed immediately without AI call
        if (uniqueIds.length === 1) {
            const singleGroup: DocumentGroupItem[] = [{
                subject: '其他',
                documentIds: uniqueIds,
                confidence: 1.0,
                reasoning: '單一文件，無需分類'
            }]

            await supabase
                .from('rag_router_jobs')
                .update({
                    status: 'completed',
                    groups: singleGroup,
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                })
                .eq('id', job.id)

            return Response.json({
                jobId: job.id,
                status: 'completed',
                etaMs,
                documentIds: uniqueIds,
                groups: singleGroup
            })
        }

        // Kick off background classification
        Promise.resolve().then(async () => {
            console.log('[Router Classify] 🚀 Background job started:', job.id)
            await runClassificationJob(job.id, documents as DocumentRecord[], supabase)
        }).catch((err) => {
            console.error('[Router Classify] ❌ Background promise error:', err)
        })

        return Response.json({
            jobId: job.id,
            status: job.status,
            etaMs,
            documentIds: uniqueIds
        })

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

/**
 * GET /api/rag/router-classify?jobId=xxx
 *
 * Returns current status/result for a classification job
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const parseResult = JobQuerySchema.safeParse({ jobId: searchParams.get('jobId') })

    if (!parseResult.success) {
        return Response.json({
            error: 'VALIDATION_ERROR',
            message: '需要有效的 jobId'
        }, { status: 400 })
    }

    const { supabase, user, errorType } = await getApiUser(req)
    if (!user) {
        return Response.json({
            error: 'UNAUTHORIZED',
            message: '需要登入',
            debug: { errorType }
        }, { status: 401 })
    }

    const { data: job, error } = await supabase
        .from('rag_router_jobs')
        .select('*')
        .eq('id', parseResult.data.jobId)
        .single()

    if (error || !job) {
        return Response.json({
            error: 'NOT_FOUND',
            message: '找不到指定任務'
        }, { status: 404 })
    }

    return Response.json({
        jobId: job.id,
        status: job.status as RouterJobStatus,
        etaMs: job.eta_ms,
        documentIds: job.document_ids,
        groups: job.status === 'completed' ? job.groups ?? [] : null,
        error: job.error_message,
        startedAt: job.started_at,
        completedAt: job.completed_at
    })
}

async function runClassificationJob(jobId: string, documents: DocumentRecord[], supabase: SupabaseClient) {
    const now = new Date().toISOString()

    await supabase
        .from('rag_router_jobs')
        .update({ status: 'processing', started_at: now })
        .eq('id', jobId)

    try {
        const documentPreviews = documents.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            preview: (doc.original_text || '').substring(0, 2000)
        }))

        console.log('[Router Classify] 📝 Analyzing previews...', {
            jobId,
            docs: documents.length
        })

        const modelConfig = getModelConfig('router-classify')
        const prompt = buildPrompt(documentPreviews)

        const result = await generateObject({
            model: google(modelConfig.modelName),
            temperature: modelConfig.temperature,
            schema: DocumentGroupSchema,
            prompt
        })

        console.log('[Router Classify] ✅ Job complete:', jobId, result.object.groups.length, 'groups')

        await supabase
            .from('rag_router_jobs')
            .update({
                status: 'completed',
                groups: result.object.groups,
                completed_at: new Date().toISOString()
            })
            .eq('id', jobId)

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error('[Router Classify] ❌ Job failed:', jobId, errorMessage)

        await supabase
            .from('rag_router_jobs')
            .update({
                status: 'failed',
                error_message: errorMessage,
                completed_at: new Date().toISOString()
            })
            .eq('id', jobId)
    }
}

function buildPrompt(documentPreviews: { id: string; filename: string; preview: string }[]) {
    return `你是一名專業的科目分類專家。請分析以下文件預覽內容，使用思考鏈 (Chain-of-Thought) 方法進行精確分類。

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

請僅輸出 JSON。`
}
