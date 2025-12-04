'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useChat, Chat, DefaultChatTransport } from '@ai-sdk/react'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { RAGMarkdownRenderer } from '@/components/ask/RAGMarkdownRenderer'

interface RAGChatInterfaceProps {
    refreshKey?: string
    contextFileIds?: string[]
    onChatReady?: () => void
}

const SUGGESTED_QUESTIONS = [
    "這份文件的核心觀念是什麼？",
    "請列出這份文件的時間軸",
    "有哪些常考的重點？",
    "請針對這份文件出三題練習題",
    "解釋文中的專有名詞"
]

export default function RAGChatInterface({
    refreshKey,
    contextFileIds = [],
    onChatReady
}: RAGChatInterfaceProps) {
    // Local input state (managed manually)
    const [input, setInput] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Create Chat instance with custom transport
    const chatInstance = useMemo(() => {
        const transport = new DefaultChatTransport({
            api: '/api/rag/chat',
            body: {
                contextFileIds: contextFileIds
            }
        })

        return new Chat({
            messages: [],
            transport
        })
    }, [contextFileIds.join(',')])

    // AI SDK Chat Hook (v2.0 API)
    const chat = useChat({
        chat: chatInstance,
        onError: (error: Error) => {
            console.error('[RAGChatInterface] Chat error:', error)
            setValidationError('發生錯誤，請稍後再試')
        },
        onFinish: () => {
            scrollToBottom()
        }
    })

    const { messages, sendMessage, status } = chat
    const isLoading = status === 'streaming'

    // Scroll to bottom on new messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Scroll on messages change
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Notify ready (only on mount)
    useEffect(() => {
        onChatReady?.()
    }, [])

    // Handle Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!input.trim() || isLoading) return

        if (contextFileIds.length === 0) {
            setValidationError('請先選擇至少一個文件')
            setTimeout(() => setValidationError(null), 3000)
            return
        }

        setValidationError(null)

        // Send message using new API
        await sendMessage({
            role: 'user',
            content: input.trim()
        })

        // Clear input
        setInput('')
    }

    const handleSuggestedClick = async (question: string) => {
        if (isLoading) return

        if (contextFileIds.length === 0) {
            setValidationError('請先選擇至少一個文件')
            setTimeout(() => setValidationError(null), 3000)
            return
        }

        await sendMessage({
            role: 'user',
            content: question
        })
    }

    return (
        <div className="relative flex flex-col min-h-[500px] bg-card/30">
            {/* Messages Area */}
            <div className="flex-1 space-y-6 px-4 py-6 pb-32">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-8">
                        <div className="space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                                <Sparkles className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">AI 學習助手</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    選擇文件並開始提問，AI 將為您分析重點
                                </p>
                            </div>
                        </div>

                        {/* Suggested Questions */}
                        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                            {SUGGESTED_QUESTIONS.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSuggestedClick(q)}
                                    className="px-4 py-2 rounded-full bg-secondary/50 hover:bg-secondary text-sm text-secondary-foreground transition-all duration-200 hover:scale-105"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex gap-4 max-w-3xl mx-auto",
                                m.role === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            {/* AI Avatar */}
                            {m.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                </div>
                            )}

                            {/* Message Bubble */}
                            <div className={cn(
                                "rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm max-w-[85%]",
                                m.role === 'user'
                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                    : "bg-card border border-border rounded-bl-none"
                            )}>
                                {m.role === 'user' ? (
                                    <p>{m.content}</p>
                                ) : (
                                    <RAGMarkdownRenderer content={m.content} />
                                )}
                            </div>
                        </motion.div>
                    ))
                )}

                {/* Loading Indicator */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-4 max-w-3xl mx-auto"
                    >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                        <div className="bg-card border border-border rounded-2xl rounded-bl-none px-5 py-3 shadow-sm">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Error Message */}
                {validationError && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm"
                    >
                        {validationError}
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Floating Input Area */}
            <div className="sticky bottom-6 flex justify-center px-4 z-40">
                <form
                    onSubmit={handleSubmit}
                    className="relative w-full max-w-2xl group"
                >
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-xl rounded-full -z-10" />

                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={contextFileIds.length > 0 ? "輸入問題..." : "請先選擇文件..."}
                        disabled={contextFileIds.length === 0 || isLoading}
                        className={cn(
                            "w-full h-14 pl-6 pr-14 rounded-full bg-background/80 border-2 border-border/50 shadow-lg backdrop-blur-sm transition-all duration-300",
                            "focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:bg-background",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "placeholder:text-muted-foreground/50"
                        )}
                    />

                    <Button
                        type="submit"
                        disabled={!input.trim() || isLoading || contextFileIds.length === 0}
                        size="icon"
                        className={cn(
                            "absolute right-2 top-2 h-10 w-10 rounded-full transition-all duration-300",
                            input.trim()
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-md"
                                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 ml-0.5" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
