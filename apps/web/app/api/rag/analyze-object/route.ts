import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { generateStreamedAnalysis } from '@/lib/services/elite-rag-analyzer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/rag/analyze-object
 * 
 * Handles structured streaming of RAG analysis
 * 
 * Supports:
 * - Single document analysis (documentId)
 * - Multi-document analysis (documentId + relatedDocIds)
 * - Direct text analysis (text)
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate user
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return new Response('Unauthorized', { status: 401 })
        }

        const { documentId, relatedDocIds, text, subject } = await req.json()

        if (!documentId && !text) {
            return new Response('Missing documentId or text', { status: 400 })
        }

        let analysisText = text

        if (documentId) {
            // Fetch primary document with authenticated client
            const { data: primaryDoc, error: primaryError } = await supabase
                .from('rag_documents')
                .select('original_text, filename')
                .eq('id', documentId)
                .single()

            if (primaryError || !primaryDoc) {
                console.error('[Analyze Object] Document not found:', {
                    documentId,
                    error: primaryError,
                    userId: user.id
                })
                return new Response('Document not found', { status: 404 })
            }

            analysisText = primaryDoc.original_text

            // ⚡ NEW: Fetch and append related documents
            if (relatedDocIds && Array.isArray(relatedDocIds) && relatedDocIds.length > 0) {
                console.log('[Analyze Object] 📚 Fetching related documents:', relatedDocIds.length)

                const { data: relatedDocs, error: relatedError } = await supabase
                    .from('rag_documents')
                    .select('original_text, filename')
                    .in('id', relatedDocIds)

                if (!relatedError && relatedDocs && relatedDocs.length > 0) {
                    // Append related documents as additional context
                    const relatedContext = relatedDocs.map((doc, idx) =>
                        `\n\n--- 相關文件 ${idx + 1}: ${doc.filename} ---\n${doc.original_text}`
                    ).join('\n')

                    analysisText = `--- 主要文件: ${primaryDoc.filename} ---\n${analysisText}${relatedContext}`

                    console.log('[Analyze Object] ✅ Combined text length:', analysisText.length)
                }
            }
        }

        if (!analysisText) {
            return new Response('No text to analyze', { status: 400 })
        }

        return generateStreamedAnalysis(analysisText, subject)

    } catch (error) {
        console.error('[Analyze Object] Error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
