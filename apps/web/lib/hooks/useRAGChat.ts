'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * Message type - compatible with Vercel AI SDK format
 */
export interface RAGMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    createdAt?: Date
}

/**
 * Hook options
 */
interface UseRAGChatOptions {
    /**
     * API endpoint for chat
     */
    api: string

    /**
     * Initial messages
     */
    initialMessages?: RAGMessage[]

    /**
     * Context file IDs for RAG
     */
    contextFileIds?: string[]

    /**
     * Callback when a message is finished streaming
     */
    onFinish?: (message: RAGMessage) => void

    /**
     * Callback when an error occurs
     */
    onError?: (error: Error) => void
}

/**
 * Hook state
 */
interface UseRAGChatState {
    messages: RAGMessage[]
    input: string
    isLoading: boolean
    error: Error | null
}

/**
 * Top-tier RAG Chat Hook
 *
 * Features:
 * - Native fetch with streaming support
 * - Full TypeScript type safety
 * - Optimistic UI updates
 * - Automatic error handling
 * - Context-aware RAG integration
 * - Zero external dependencies (except React)
 *
 * @example
 * ```tsx
 * const { messages, input, handleInputChange, handleSubmit, isLoading } = useRAGChat({
 *   api: '/api/rag/chat',
 *   contextFileIds: ['doc-1', 'doc-2']
 * })
 * ```
 */
export function useRAGChat({
    api,
    initialMessages = [],
    contextFileIds = [],
    onFinish,
    onError
}: UseRAGChatOptions) {
    // State
    const [messages, setMessages] = useState<RAGMessage[]>(initialMessages)
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    // Refs
    const abortControllerRef = useRef<AbortController | null>(null)

    /**
     * Generate unique message ID
     */
    const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    /**
     * Handle input change
     */
    const handleInputChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setInput(e.target.value)
    }, [])

    /**
     * Send message and handle streaming response
     */
    const handleSubmit = useCallback(async (
        e?: React.FormEvent,
        customMessage?: string
    ) => {
        if (e) {
            e.preventDefault()
        }

        const userMessageContent = customMessage || input
        if (!userMessageContent.trim()) return

        // Clear input immediately for better UX
        setInput('')
        setError(null)
        setIsLoading(true)

        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        // Create user message
        const userMessage: RAGMessage = {
            id: generateId(),
            role: 'user',
            content: userMessageContent.trim(),
            createdAt: new Date()
        }

        // Optimistic UI update
        setMessages(prev => [...prev, userMessage])

        // Prepare assistant message placeholder
        const assistantMessageId = generateId()
        let accumulatedContent = ''

        // Add empty assistant message
        setMessages(prev => [
            ...prev,
            {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                createdAt: new Date()
            }
        ])

        try {
            // Prepare request payload
            const requestBody = {
                messages: [...messages, userMessage].map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                contextFileIds
            }

            console.log('[useRAGChat] 📤 Sending request:', {
                endpoint: api,
                messageCount: requestBody.messages.length,
                contextFiles: contextFileIds.length
            })

            // Send request
            const response = await fetch(api, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: abortControllerRef.current.signal
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error')
                throw new Error(`HTTP ${response.status}: ${errorText}`)
            }

            if (!response.body) {
                throw new Error('Response body is empty')
            }

            // Stream response
            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            console.log('[useRAGChat] 📖 Starting to read stream...')

            while (true) {
                const { done, value } = await reader.read()

                if (done) {
                    console.log('[useRAGChat] ✅ Streaming completed. Total length:', accumulatedContent.length)
                    break
                }

                // Decode chunk
                const chunk = decoder.decode(value, { stream: true })

                if (chunk) {
                    console.log('[useRAGChat] 📥 Received chunk:', chunk.substring(0, 50) + '...')
                    accumulatedContent += chunk

                    // Update assistant message in real-time
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === assistantMessageId
                                ? { ...msg, content: accumulatedContent }
                                : msg
                        )
                    )
                }
            }

            // Final message
            const finalMessage: RAGMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: accumulatedContent,
                createdAt: new Date()
            }

            // Call onFinish callback
            if (onFinish) {
                onFinish(finalMessage)
            }

        } catch (err: any) {
            // Handle abort (user cancelled)
            if (err.name === 'AbortError') {
                console.log('[useRAGChat] ⚠️ Request aborted')

                // Remove incomplete assistant message
                setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))

            } else {
                // Real error
                console.error('[useRAGChat] ❌ Error:', err)

                const error = err instanceof Error ? err : new Error(String(err))
                setError(error)

                // Update assistant message with error
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === assistantMessageId
                            ? {
                                ...msg,
                                content: '抱歉，發生錯誤。請稍後再試。'
                              }
                            : msg
                    )
                )

                // Call onError callback
                if (onError) {
                    onError(error)
                }
            }
        } finally {
            setIsLoading(false)
            abortControllerRef.current = null
        }
    }, [input, messages, api, contextFileIds, onFinish, onError])

    /**
     * Append a message directly (for suggested questions)
     */
    const append = useCallback((message: Omit<RAGMessage, 'id' | 'createdAt'>) => {
        handleSubmit(undefined, message.content)
    }, [handleSubmit])

    /**
     * Reset chat
     */
    const reset = useCallback(() => {
        setMessages(initialMessages)
        setInput('')
        setError(null)
        setIsLoading(false)

        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
    }, [initialMessages])

    /**
     * Stop streaming
     */
    const stop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
    }, [])

    return {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        append,
        reset,
        stop,
        isLoading,
        error,
        setMessages,
        setInput
    }
}
