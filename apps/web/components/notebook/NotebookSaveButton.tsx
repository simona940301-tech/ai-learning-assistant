'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookmarkIcon, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface NotebookSaveButtonProps {
    title: string
    content: string
    sourceType: 'summary' | 'qa' | 'manual'
    documentId?: string
    tags?: string[]
    onSaveSuccess?: () => void
}

export function NotebookSaveButton({
    title,
    content,
    sourceType,
    documentId,
    tags = ['學測'],
    onSaveSuccess,
}: NotebookSaveButtonProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const handleSave = async () => {
        if (isSaving) return

        setIsSaving(true)
        setSaveStatus('idle')
        setErrorMessage('')

        try {
            const res = await fetch('/api/notebook/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content_md: content,
                    source_type: sourceType,
                    document_id: documentId,
                    tags,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || '保存失敗')
            }

            setSaveStatus('success')
            onSaveSuccess?.()

            // 發送 Chick 系統事件
            try {
                const { sendNoteSavedAction } = await import('@/lib/chick/action-bus')
                await sendNoteSavedAction({ noteId: data.entry?.id })
            } catch (chickError) {
                console.warn('[NotebookSaveButton] Failed to send NOTE_SAVED event:', chickError)
            }

            // 3 秒後重置狀態
            setTimeout(() => {
                setSaveStatus('idle')
            }, 3000)
        } catch (error) {
            console.error('[NotebookSaveButton] Save error:', error)
            setSaveStatus('error')
            setErrorMessage(error instanceof Error ? error.message : '保存失敗')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <Button
                onClick={handleSave}
                disabled={isSaving || saveStatus === 'success'}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 shadow-lg transition-all duration-200 hover:shadow-xl"
                size="lg"
            >
                {saveStatus === 'success' ? (
                    <>
                        <Check className="h-4 w-4" />
                        <span>已存到筆記本</span>
                    </>
                ) : (
                    <>
                        <BookmarkIcon className="h-4 w-4" />
                        <span>{isSaving ? '儲存中...' : '存到筆記本'}</span>
                    </>
                )}
            </Button>

            <AnimatePresence>
                {saveStatus === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-2 text-sm text-green-500"
                    >
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span>成功保存</span>
                    </motion.div>
                )}

                {saveStatus === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="text-sm text-red-400"
                    >
                        {errorMessage}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
