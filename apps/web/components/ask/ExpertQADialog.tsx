'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader2, Sparkles, XCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ExpertQADialogProps {
    analysisId: string
    onClose: () => void
}

interface Message {
    id: string
    type: 'user' | 'assistant'
    content: string
    sources?: Array<{
        type: 'concept' | 'insight' | 'section'
        content: string
        page?: number
    }>
    followUpQuestions?: string[]
    timestamp: number
}

export default function ExpertQADialog({ analysisId, onClose }: ExpertQADialogProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)
    const [streamingContent, setStreamingContent] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    // 自動滾動到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, streamingContent])

    // 發送問題
    const handleSendQuestion = async (question: string) => {
        if (!question.trim() || isStreaming) return

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            type: 'user',
            content: question,
            timestamp: Date.now()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsStreaming(true)
        setStreamingContent('')

        // 創建 AbortController（用於取消請求）
        abortControllerRef.current = new AbortController()

        try {
            const response = await fetch('/api/ai/expert-qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisId,
                    question
                }),
                signal: abortControllerRef.current.signal
            })

            if (!response.ok) {
                throw new Error('Request failed')
            }

            // ⭐ 處理 SSE 流
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) throw new Error('No response body')

            let buffer = ''
            let assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                type: 'assistant',
                content: '',
                timestamp: Date.now()
            }

            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // 處理 SSE 消息（可能包含多條）
                const lines = buffer.split('\n\n')
                buffer = lines.pop() || '' // 保留未完成的行

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue

                    const data = JSON.parse(line.slice(6))

                    if (data.type === 'chunk') {
                        // ⭐ 逐字顯示
                        setStreamingContent(prev => prev + data.content)
                        assistantMessage.content += data.content
                    } else if (data.type === 'complete') {
                        // 添加來源和後續問題
                        assistantMessage.sources = data.sources
                        assistantMessage.followUpQuestions = data.followUpQuestions

                        console.log(`[Expert Q&A] Complete in ${data.totalTime}ms`)
                    } else if (data.type === 'error') {
                        console.error('[Expert Q&A] Error:', data.message)
                        assistantMessage.content = `抱歉，發生了錯誤：${data.message}`
                    }
                }
            }

            // 完成流式輸出
            setMessages(prev => [...prev, assistantMessage])
            setStreamingContent('')
            setIsStreaming(false)

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('[Expert Q&A] Request cancelled')
            } else {
                console.error('[Expert Q&A] Error:', error)
                setMessages(prev => [...prev, {
                    id: `error-${Date.now()}`,
                    type: 'assistant',
                    content: '抱歉，發生了錯誤。請稍後再試。',
                    timestamp: Date.now()
                }])
            }
            setStreamingContent('')
            setIsStreaming(false)
        }
    }

    // 取消請求
    const handleCancel = () => {
        abortControllerRef.current?.abort()
        setIsStreaming(false)
        setStreamingContent('')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-3xl h-[80vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                            <MessageCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">專家問答</h3>
                            <p className="text-xs text-muted-foreground">基於文件內容的智能對話</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="p-4 rounded-full bg-primary/10 mb-4">
                                <Sparkles className="w-12 h-12 text-primary" />
                            </div>
                            <h4 className="text-xl font-semibold text-foreground mb-2">
                                問我任何關於文件的問題
                            </h4>
                            <p className="text-sm text-muted-foreground max-w-md">
                                我會基於文件內容為您提供詳細的解答，並標註來源引用。
                            </p>
                            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-md">
                                {[
                                    '這份文件的核心概念是什麼？',
                                    '如何理解這個主題？',
                                    '有哪些重點需要記住？'
                                ].map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSendQuestion(suggestion)}
                                        className="px-4 py-2 text-sm text-left rounded-xl border border-border hover:bg-muted transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <AnimatePresence>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                        message.type === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                    }`}
                                >
                                    {message.type === 'user' ? (
                                        <p className="text-sm">{message.content}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>

                                            {/* 來源引用 */}
                                            {message.sources && message.sources.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-border/50">
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        📚 引用來源:
                                                    </p>
                                                    <div className="space-y-1">
                                                        {message.sources.map((source, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1"
                                                            >
                                                                • {source.content}
                                                                {source.page && ` (頁 ${source.page})`}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 後續問題建議 */}
                                            {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-border/50">
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        💡 您可能還想問:
                                                    </p>
                                                    <div className="space-y-1">
                                                        {message.followUpQuestions.map((q, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleSendQuestion(q)}
                                                                disabled={isStreaming}
                                                                className="block w-full text-left text-xs px-2 py-1 rounded bg-background/50 hover:bg-background transition-colors disabled:opacity-50"
                                                            >
                                                                → {q}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* 流式內容（正在輸出） */}
                    {isStreaming && streamingContent && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                        >
                            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {streamingContent}
                                    </ReactMarkdown>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                    <p className="text-xs text-muted-foreground">正在輸入...</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-6 py-4 border-t border-border bg-card/50 backdrop-blur">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSendQuestion(input)
                        }}
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isStreaming}
                            placeholder="輸入您的問題..."
                            className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                        {isStreaming ? (
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="p-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        )}
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
