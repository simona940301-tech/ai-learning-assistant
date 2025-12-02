import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'
import { chatCompletionStream } from '@/lib/gemini'
import { embedText1536Edge } from '@/lib/ai/embedding-edge'
import { shouldSkipRAG } from '@/lib/ai/smart-rag-detector'
import {
  SELECTION_MODE_SYSTEM_PROMPT,
  buildSelectionUserPrompt,
  buildGeneralUserPrompt,
} from '@/lib/prompts/backpack-ask-prompts'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

type DocChunkResult = {
  chunk_id: string
  file_id: string
  page_index: number
  start: number
  end: number
  text: string
  score: number
}

/**
 * POST /api/backpack/ask
 * Ask AI questions about document content with RAG retrieval
 * 
 * Architecture:
 * - Edge runtime compatible (matches backpack/explain pattern)
 * - Uses createClient() for authentication (RLS-controlled)
 * - Direct RPC calls via user client (no service client needed)
 * - Edge-compatible embedding via fetch API
 */
export async function POST(req: NextRequest) {
  try {
    // Create Supabase client (uses getSupabaseClient which handles edge runtime)
    // This method supports both Bearer token and cookie-based auth
    const supabase = getSupabaseClient(req)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('[backpack/ask] Auth error:', {
        error: authError,
        message: authError.message,
        code: (authError as any).code,
        // Log request headers for debugging (sanitized)
        hasAuthHeader: !!req.headers.get('authorization'),
        hasCookie: !!req.headers.get('cookie'),
      })
      return NextResponse.json(
        { error: 'Unauthorized', details: authError.message },
        { status: 401 }
      )
    }

    if (!user) {
      console.warn('[backpack/ask] No user found', {
        hasAuthHeader: !!req.headers.get('authorization'),
        hasCookie: !!req.headers.get('cookie'),
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[backpack/ask] User authenticated:', { user_id: user.id })

    const body = await req.json()
    const { scope, file_id, selection, prompt, top_k = 6, session_id } = body

    if (!file_id || !prompt?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: file_id, prompt' },
        { status: 400 }
      )
    }

    // Check if this is local preview mode (preview- prefix)
    const isLocalMode = file_id.startsWith('preview-')

    // File verification and RAG availability
    let fileVerified = false
    let skipRAG = isLocalMode
    let ragFileId: string | null = null // The file_id for RAG (may differ from backpack_item id)

    if (isLocalMode) {
      console.log('[backpack/ask] Local preview mode detected, skipping file verification')
      // For local mode, we'll use only the selected text without RAG retrieval
    } else {
      // 🎯 根本修復：同時支持 backpack_items 和 files 表
      // 1. 先查詢 backpack_items（用戶上傳的文件）
      console.log('[backpack/ask] Verifying file in backpack_items:', { file_id, user_id: user.id })

      const { data: backpackItem, error: backpackError } = await supabase
        .from('backpack_items')
        .select('id, user_id, file_url, type')
        .eq('id', file_id)
        .eq('user_id', user.id)
        .single()

      if (backpackError) {
        console.error('[backpack/ask] Backpack item query error:', {
          error: backpackError,
          code: backpackError.code,
          message: backpackError.message,
        })

        // If backpack_items not found, try files table (for RAG-processed files)
        console.log('[backpack/ask] Trying files table as fallback...')
        const { data: ragFile, error: fileError } = await supabase
          .from('files')
          .select('id, user_id')
          .eq('id', file_id)
          .eq('user_id', user.id)
          .single()

        if (fileError) {
          console.error('[backpack/ask] Files table query error:', {
            error: fileError,
            code: fileError.code,
            message: fileError.message,
          })

          // Check if it's a "not found" error or RLS error
          if (fileError.code === 'PGRST116' || fileError.code === 'PGRST301') {
            // PGRST116: Not found
            // PGRST301: RLS policy violation
            console.warn('[backpack/ask] File not found in both tables:', {
              file_id,
              user_id: user.id,
              error_code: fileError.code,
            })

            // ⚡ Graceful degradation: If we have selection, allow selection-only mode
            if (scope === 'selection' && selection?.quote) {
              console.warn('[backpack/ask] File verification failed, but continuing with selection-only mode (graceful degradation)')
              skipRAG = true
              fileVerified = false
            } else {
              return NextResponse.json(
                { error: 'File not found or access denied' },
                { status: 404 }
              )
            }
          } else {
            // For other errors, allow graceful degradation if we have selection
            if (scope === 'selection' && selection?.quote) {
              console.warn('[backpack/ask] File verification failed, but continuing with selection-only mode:', fileError.message)
              skipRAG = true
              fileVerified = false
            } else {
              return NextResponse.json(
                {
                  error: 'Failed to verify file',
                  details: fileError.message
                },
                { status: 500 }
              )
            }
          }
        } else if (ragFile) {
          // Found in files table (RAG-processed file)
          console.log('[backpack/ask] File verified in files table:', { file_id: ragFile.id })
          fileVerified = true
          ragFileId = ragFile.id
        } else {
          // Not found in either table
          console.warn('[backpack/ask] File not found in both tables:', { file_id, user_id: user.id })
          
          // ⚡ Graceful degradation: If we have selection, allow selection-only mode
          if (scope === 'selection' && selection?.quote) {
            console.warn('[backpack/ask] File not found, but continuing with selection-only mode (graceful degradation)')
            skipRAG = true
            fileVerified = false
          } else {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
          }
        }
      } else if (backpackItem) {
        // Found in backpack_items
        console.log('[backpack/ask] File verified in backpack_items:', { file_id: backpackItem.id, type: backpackItem.type })
        fileVerified = true

        // 🎯 檢查是否有對應的 files 記錄（用於 RAG）
        // 如果 backpack_item 有 file_url，可能已經處理過
        // 我們需要找到對應的 files 記錄（通過 storage_path 或 file_url 匹配）
        if (backpackItem.file_url) {
          // 嘗試通過 storage_path 查找對應的 files 記錄
          // 從 file_url 提取路徑：https://...supabase.co/storage/v1/object/public/backpack_files/[user_id]/[filename]
          const urlMatch = backpackItem.file_url.match(/backpack_files\/(.+)$/)
          if (urlMatch) {
            const storagePath = urlMatch[1]
            
            // 查詢 files 表中是否有對應的記錄
            const { data: matchingFile } = await supabase
              .from('files')
              .select('id')
              .eq('user_id', user.id)
              .eq('storage_path', storagePath)
              .single()

            if (matchingFile) {
              console.log('[backpack/ask] Found matching RAG file:', { rag_file_id: matchingFile.id })
              ragFileId = matchingFile.id
            } else {
              // 沒有對應的 files 記錄，使用降級策略
              console.warn('[backpack/ask] No matching RAG file found, will use selection-only mode if available')
              if (scope === 'selection' && selection?.quote) {
                skipRAG = true
              }
            }
          }
        } else {
          // backpack_item 沒有 file_url，可能是文本內容
          // 使用降級策略
          if (scope === 'selection' && selection?.quote) {
            skipRAG = true
          }
        }

        // 如果沒有找到 RAG file，使用 backpack_item id 作為 fallback
        if (!ragFileId) {
          ragFileId = backpackItem.id
        }
      }
    }

    // ⚡ Step 2: 智能 RAG 判斷
    const trimmedPrompt = prompt.trim()
    const hasSelection = scope === 'selection' && !!selection?.quote
    
    // 判斷是否需要跳過 RAG
    const skipRAGBySmartDetector = shouldSkipRAG(trimmedPrompt, hasSelection)
    const finalSkipRAG = skipRAG || skipRAGBySmartDetector

    // Build query for RAG retrieval
    let queryText = trimmedPrompt
    if (hasSelection && selection?.quote) {
      queryText = `${selection.quote}\n\n${trimmedPrompt}`
    }

    // ⚡ Step 1: 並行處理 - 準備 RAG 檢索（如果需要）
    let relevantChunks: DocChunkResult[] = []
    
    // 創建並行任務
    const ragTask = !finalSkipRAG && ragFileId
      ? (async () => {
          try {
            // 生成 embedding（如果快取未命中會調用 API）
            const queryEmbedding = await embedText1536Edge(queryText)
            
            // RAG 檢索
            const { measureRPCLatency } = await import('@/lib/monitoring/rpc-latency')
            
            const { data: chunks, error: searchError } = await measureRPCLatency(
              'search_doc_chunks_scoped',
              async () => {
                return await supabase.rpc(
                  'search_doc_chunks_scoped',
                  {
                    q_embedding: queryEmbedding,
                    p_file_id: ragFileId,
                    p_top_k: top_k,
                  }
                )
              },
              'edge'
            ) as { data: DocChunkResult[] | null; error: any }

            if (searchError) {
              console.error('[backpack/ask] RAG search error:', searchError)
              return []
            }
            
            return (chunks || []) as DocChunkResult[]
          } catch (error) {
            console.error('[backpack/ask] RAG retrieval failed:', error)
            return []
          }
        })()
      : Promise.resolve([])

    // 同時開始準備 prompt（不等待 RAG）
    // 對於簡單查詢，可以立即開始生成回答
    console.log('[backpack/ask] RAG decision:', {
      skipRAG: finalSkipRAG,
      reason: skipRAG ? 'file_not_found_or_local' : skipRAGBySmartDetector ? 'simple_query' : 'complex_query',
      promptLength: trimmedPrompt.length,
      hasSelection,
    })

    // 等待 RAG 檢索完成（並行處理中）
    relevantChunks = await ragTask

    // Filter chunks by selection if scope is 'selection' (only for database files with verified files)
    if (!finalSkipRAG && fileVerified && scope === 'selection' && selection && relevantChunks.length > 0) {
      const selectionPage = selection.page_index
      const selectionStart = selection.start
      const selectionEnd = selection.end

      // If we have valid selection indices, try to find chunks near the selection
      if (selectionStart >= 0 && selectionEnd >= 0) {
        const filteredChunks = relevantChunks
          .filter((chunk) => {
            // Same page
            if (chunk.page_index !== selectionPage) return false

            // Overlap or near the selection (within 500 chars)
            const chunkStart = chunk.start
            const chunkEnd = chunk.end
            return (
              (chunkStart <= selectionEnd && chunkEnd >= selectionStart) ||
              Math.abs(chunkStart - selectionStart) < 500 ||
              Math.abs(chunkEnd - selectionEnd) < 500
            )
          })
          .sort((a, b) => {
            // Sort by proximity to selection
            const distA = Math.min(
              Math.abs(a.start - selectionStart),
              Math.abs(a.end - selectionEnd)
            )
            const distB = Math.min(
              Math.abs(b.start - selectionStart),
              Math.abs(b.end - selectionEnd)
            )
            return distA - distB
          })

        // If no chunks match, use all chunks from the same page
        if (filteredChunks.length === 0) {
          const pageChunks = relevantChunks.filter(
            (chunk) => chunk.page_index === selectionPage
          )
          relevantChunks = pageChunks.length > 0 ? pageChunks : relevantChunks
        } else {
          relevantChunks = filteredChunks
        }
      } else {
        // If no valid indices (e.g. from native selection), just prefer chunks from the same page
        const pageChunks = relevantChunks.filter(
          (chunk) => chunk.page_index === selectionPage
        )
        if (pageChunks.length > 0) {
          relevantChunks = pageChunks
        }
      }
    }

    // ⚡ Step 3: 使用壓縮後的 Prompt（在 RAG 完成後構建）
    let systemPrompt = ''
    let userPrompt = ''

    if (scope === 'selection' && selection) {
      // 使用精簡版 System Prompt（50 行以內，已壓縮）
      systemPrompt = SELECTION_MODE_SYSTEM_PROMPT

      // Format Auxiliary Context
      const auxiliaryContext = relevantChunks.length > 0
        ? relevantChunks.map((chunk, idx) => {
          const sourceRef = `[來源 ${idx + 1} - 第 ${chunk.page_index + 1} 頁]`
          return `${sourceRef}\n${chunk.text}`
        }).join('\n\n')
        : '（無相關上下文）'

      // TODO: Fetch conversation history using session_id if provided
      const historyContext = session_id ? `\n**[對話歷史]**\n(Previous messages would be here)\n` : undefined

      // 使用優化後的 prompt builder（已壓縮）
      userPrompt = buildSelectionUserPrompt(
        selection,
        auxiliaryContext,
        trimmedPrompt,
        historyContext
      )
    } else {
      // Default Mode (General Q&A)
      systemPrompt = `你是一個專業的學習助手，專門幫助用戶理解文件內容。根據提供的文件上下文回答問題，並在回答中引用相關的來源頁碼。

回答要求：
1. 基於提供的文件上下文回答問題
2. 如果上下文不足以回答，誠實說明
3. 引用相關的來源頁碼（格式：第 X 頁）
4. 回答要簡潔、準確、易懂`

      // Build context from chunks
      const contextText = relevantChunks
        .map((chunk, idx) => {
          return `[來源 ${idx + 1} - 第 ${chunk.page_index + 1} 頁]\n${chunk.text}`
        })
        .join('\n\n')

      userPrompt = buildGeneralUserPrompt(contextText, trimmedPrompt)
    }

    // Return session_id in response (generate new one if not provided)
    const currentSessionId = session_id || crypto.randomUUID()

    // Stream response (matches backpack/explain pattern)
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send SSE events
        const send = (type: string, data: any) => {
          const message = `data: ${JSON.stringify({ type, ...data })}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        // Send session ID first
        send('session', { session_id: currentSessionId })

        try {
          // Send citations first (before streaming answer)
          for (const chunk of relevantChunks.slice(0, top_k)) {
            send('citation', {
              page_index: chunk.page_index,
              text: chunk.text.substring(0, 200), // Truncate for citation preview
              score: chunk.score,
            })
          }

          // Determine confidence based on chunk scores
          const avgScore = relevantChunks.length > 0
            ? relevantChunks.reduce((sum, c) => sum + c.score, 0) / relevantChunks.length
            : 0
          const confidenceLow = avgScore < 0.3 || relevantChunks.length === 0

          send('confidence', { low: confidenceLow })

          // Stream AI response using Gemini API
          // Note: model 'gpt-4o-mini' will be mapped to 'gemini-2.0-flash-exp' by chatCompletionStream
          console.log('[backpack/ask] Starting Gemini stream:', {
            systemPromptLength: systemPrompt.length,
            userPromptLength: userPrompt.length,
            contextChunks: relevantChunks.length,
          })

          let fullAnswer = ''
          for await (const chunk of chatCompletionStream(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            {
              useCase: 'quick', // ⚡ Use 2.5 Flash for fast TTFT
              temperature: 0.3,
              maxOutputTokens: 2048
            }
          )) {
            fullAnswer += chunk
            send('token', { content: chunk })
          }

          console.log('[backpack/ask] Gemini stream completed:', {
            answerLength: fullAnswer.length,
          })

          send('done', {})
        } catch (error) {
          console.error('[backpack/ask] Error:', error)
          send('error', {
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[backpack/ask] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
