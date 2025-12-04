'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Calendar, Tag } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { BackpackFile } from '@/lib/types'

interface NoteViewerModalProps {
    isOpen: boolean
    onClose: () => void
    file: BackpackFile | null
}

export function NoteViewerModal({ isOpen, onClose, file }: NoteViewerModalProps) {
    // 預處理 markdown：將「正確答案」標題和答案段落合併為一行
    // ✅ 修復：將 useMemo 移到條件 return 之前，符合 React Hooks 規則
    const processedContent = useMemo(() => {
        if (!file?.content) return ''

        // 匹配模式：## 正確答案 或 ## ✔ 正確答案 後面跟著 正確答案 : (C) germs
        const pattern = /(##\s*(?:✔|✅)?\s*正確答案\s*\n+)(正確答案[：:]\s*\(?[A-D]\)?\s*[^\n]+)/g
        return file.content.replace(pattern, (match, heading, answerLine) => {
            // 提取答案部分（去掉「正確答案:」前綴）
            const answerMatch = answerLine.match(/正確答案[：:]\s*(.+)/)
            const answerText = answerMatch ? answerMatch[1].trim() : ''
            // 合併為一行：## ✅ 正確答案: (C) germs
            return `## ✅ 正確答案: ${answerText}`
        })
    }, [file?.content])

    if (!file) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-none shadow-2xl [&>button]:hidden">
                <DialogTitle className="sr-only">筆記內容檢視</DialogTitle>
                <DialogDescription className="sr-only">
                    {/* ✅ 修復：使用正確的屬性名 title */}
                    檢視筆記 {file.title || '未命名'}，科目 {file.subject}
                </DialogDescription>
                {/* Header - Simplified: Only Date and Subject */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${file.subject === 'math' ? 'bg-orange-500/10 text-orange-500' :
                            file.subject === 'english' ? 'bg-blue-500/10 text-blue-500' :
                                file.subject === 'chinese' ? 'bg-red-500/10 text-red-500' :
                                    file.subject === 'science' ? 'bg-purple-500/10 text-purple-500' :
                                        'bg-green-500/10 text-green-500'
                            }`}>
                            <Tag className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(file.updated_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="capitalize">{file.subject}</span>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose} 
                        className="shrink-0 h-8 w-8 rounded-full hover:bg-muted z-50"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 sm:py-6">
                    <div className="max-w-3xl mx-auto">
                        <div className="explanation-content">
                            <ReactMarkdown
                                components={{
                                    // H1: 22–24px, weight 700, 下方段距 16px
                                    h1: ({ children }) => (
                                        <h1 className="text-[22px] sm:text-2xl font-bold mb-4 text-[#4B3425]">
                                            {children}
                                        </h1>
                                    ),
                                    // H2: 18–20px, weight 600, 段距 12–16px
                                    h2: ({ children }) => {
                                        const text = String(children)
                                        const isCorrectAnswer = text.includes('正確答案') || text.includes('✅')

                                        if (isCorrectAnswer) {
                                            // 提取答案部分（如果標題中已包含）
                                            const answerMatch = text.match(/正確答案[：:]\s*(.+)/)
                                            const answerText = answerMatch ? answerMatch[1] : ''

                                            return (
                                                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-[#5C4033] flex items-center gap-2">
                                                    <span className="text-green-600 text-xl">✅</span>
                                                    <span>正確答案{answerText ? `: ${answerText}` : ''}</span>
                                                </h2>
                                            )
                                        }

                                        // 檢查是否是 Reminder 或小結與記憶標題
                                        const isSummary = text.includes('Reminder') || text.includes('小結') || text.includes('記憶')
                                        const displayText = isSummary ? 'Reminder' : text

                                        return (
                                            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-[#5C4033]">
                                                {displayText}
                                            </h2>
                                        )
                                    },
                                    // Body Text: 15–16px, weight 400–500, line-height: 1.6–1.7, 段距 8–14px
                                    p: ({ children, node }) => {
                                        const text = String(children)

                                        // 如果這個段落是「正確答案:」格式，且前一個標題是「正確答案」，則不顯示（已在 h2 中合併）
                                        const isAnswerText = /正確答案[：:]\s*\(?[A-D]\)?/.test(text)
                                        if (isAnswerText) {
                                            // ✅ 修復：使用類型斷言處理 AST 節點的 previousSibling
                                            let prevSibling = (node as any)?.previousSibling
                                            while (prevSibling) {
                                                if (prevSibling.type === 'heading' && prevSibling.depth === 2) {
                                                    const headingText = String(prevSibling.children?.[0]?.value || '')
                                                    if (headingText.includes('正確答案')) {
                                                        // 這個段落已經在 h2 中合併顯示，不重複顯示
                                                        return null
                                                    }
                                                    break
                                                }
                                                prevSibling = prevSibling.previousSibling
                                            }
                                        }

                                        // 檢查前一個節點是否是「題幹」標題
                                        // ✅ 修復：使用類型斷言處理 AST 節點
                                        let prevSibling2 = (node as any)?.previousSibling
                                        let isAfterQuestionStem = false

                                        // 向上查找最近的 h2 標題
                                        while (prevSibling2) {
                                            if (prevSibling2.type === 'heading' && prevSibling2.depth === 2) {
                                                const headingText = String(prevSibling2.children?.[0]?.value || '')
                                                if (headingText.includes('題幹') || headingText.includes('題目')) {
                                                    isAfterQuestionStem = true
                                                    break
                                                }
                                            }
                                            prevSibling2 = prevSibling2.previousSibling
                                        }

                                        // 檢查內容是否看起來像題目（包含選項或問號）
                                        const looksLikeQuestion = /[A-D][).]|\([A-D]\)|（[A-D]）|\?|？/.test(text)

                                        if (isAfterQuestionStem || looksLikeQuestion) {
                                            // 題目內容：粗體
                                            return (
                                                <p className="text-[15px] sm:text-base font-medium mb-2 sm:mb-3.5 text-[#4B3425] leading-[1.65]">
                                                    {children}
                                                </p>
                                            )
                                        }

                                        return (
                                            <p className="text-[15px] sm:text-base font-normal mb-2 sm:mb-3.5 text-[#5C4033] leading-[1.65]">
                                                {children}
                                            </p>
                                        )
                                    },
                                    // 列表項：錯誤選項解析使用選項式編號
                                    li: ({ children, node }) => {
                                        const text = String(children)
                                        // 檢查是否是選項格式 (A), (B), (C), (D)
                                        const optionMatch = text.match(/^\(([A-D])\)/)

                                        if (optionMatch) {
                                            // 選項式編號：選項字母 weight 600
                                            return (
                                                <li className="mb-2 sm:mb-3 text-[15px] sm:text-base leading-[1.65] text-[#5C4033]">
                                                    <span className="font-semibold text-[#4B3425]">({optionMatch[1]})</span>
                                                    {text.replace(/^\([A-D]\)\s*/, '')}
                                                </li>
                                            )
                                        }

                                        // 檢查是否是小結與記憶（包含 🌟）
                                        const hasStar = text.includes('🌟')

                                        if (hasStar) {
                                            return (
                                                <li className="mb-2 text-[15px] sm:text-base leading-[1.65] text-[#5C4033]">
                                                    {children}
                                                </li>
                                            )
                                        }

                                        return (
                                            <li className="mb-2 text-[15px] sm:text-base leading-[1.65]">
                                                {children}
                                            </li>
                                        )
                                    },
                                    // 無序列表：用於小結與記憶
                                    ul: ({ children, node }) => {
                                        const text = String(node?.children?.map((c: any) => String(c.children?.[0]?.value || '')).join('') || '')
                                        const isSummary = text.includes('🌟') || text.includes('Reminder') || text.includes('小結') || text.includes('記憶')

                                        if (isSummary) {
                                            // 小結與記憶：淺色背景卡片
                                            return (
                                                <div className="bg-[#F9FAFB] rounded-xl p-4 sm:p-5 my-4 sm:my-5">
                                                    <ul className="list-none space-y-2">
                                                        {children}
                                                    </ul>
                                                </div>
                                            )
                                        }

                                        return (
                                            <ul className="list-disc pl-5 sm:pl-6 my-3 sm:my-4 space-y-2 sm:space-y-3">
                                                {children}
                                            </ul>
                                        )
                                    },
                                    // 有序列表
                                    ol: ({ children }) => (
                                        <ol className="list-decimal pl-5 sm:pl-6 my-3 sm:my-4 space-y-2 sm:space-y-3">
                                            {children}
                                        </ol>
                                    ),
                                    // 分隔線：顏色 #E5E7EB
                                    hr: () => (
                                        <hr className="my-4 sm:my-6 border-0 border-t border-[#E5E7EB]" />
                                    ),
                                    // 粗體
                                    strong: ({ children }) => (
                                        <strong className="font-semibold">{children}</strong>
                                    ),
                                }}
                            >
                                {processedContent || '*無內容*'}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
