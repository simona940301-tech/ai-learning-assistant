'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BookOpen, Brain, Sparkles, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PracticeRoomSetupModalProps {
    isOpen: boolean
    onClose: () => void
}

type SourceType = 'MIXED' | 'ERROR_BOOK' | 'UGC' | 'ENGLISH'

interface SourceOption {
    id: SourceType
    label: string
    description: string
    icon: React.ComponentType<any>
    accent: string
    available: boolean
}

export function PracticeRoomSetupModal({ isOpen, onClose }: PracticeRoomSetupModalProps) {
    const router = useRouter()
    const [selectedSource, setSelectedSource] = useState<SourceType>('MIXED')
    const [isCreating, setIsCreating] = useState(false)

    const sourceOptions: SourceOption[] = [
        {
            id: 'MIXED',
            label: '系統混合題庫',
            description: '各科目隨機混合，適合全面練習',
            icon: Brain,
            accent: 'from-cyan-500 to-blue-500',
            available: true
        },
        {
            id: 'ERROR_BOOK',
            label: '我的錯題本',
            description: '專注練習曾經答錯的題目',
            icon: BookOpen,
            accent: 'from-orange-500 to-red-500',
            available: true
        },
        {
            id: 'UGC',
            label: 'UGC 社群題目',
            description: '由社群貢獻的優質題目',
            icon: Sparkles,
            accent: 'from-purple-500 to-pink-500',
            available: true
        },
        {
            id: 'ENGLISH',
            label: '英文專項',
            description: '專注英文科目練習',
            icon: Zap,
            accent: 'from-green-500 to-emerald-500',
            available: true
        }
    ]

    const handleQuickStart = async () => {
        setIsCreating(true)
        try {
            const res = await fetch('/api/play/practice/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceType: 'MIXED' })
            })
            const data = await res.json()
            if (data.success) {
                router.push(`/play/practice/${data.room.room_code}`)
            } else {
                toast.error('無法建立練習室')
            }
        } catch (e) {
            console.error(e)
            toast.error('連線錯誤')
        } finally {
            setIsCreating(false)
        }
    }

    const handleCreateRoom = async () => {
        setIsCreating(true)
        try {
            const res = await fetch('/api/play/practice/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceType: selectedSource })
            })
            const data = await res.json()
            if (data.success) {
                router.push(`/play/practice/${data.room.room_code}`)
            } else {
                toast.error('無法建立練習室')
            }
        } catch (e) {
            console.error(e)
            toast.error('連線錯誤')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white">創建練習室</DialogTitle>
                    <p className="text-sm text-white/60 mt-2">選擇題目來源，開始無限刷題</p>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Quick Start Button */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white">⚡ 快速開始</h3>
                                <p className="text-sm text-white/60 mt-1">使用系統混合題庫，立即開始練習</p>
                            </div>
                            <Button
                                onClick={handleQuickStart}
                                disabled={isCreating}
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
                            >
                                {isCreating ? '創建中...' : '立即開始'}
                            </Button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-900 px-2 text-white/40">或自訂題目來源</span>
                        </div>
                    </div>

                    {/* Source Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sourceOptions.map((option) => {
                            const Icon = option.icon
                            const isSelected = selectedSource === option.id

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => setSelectedSource(option.id)}
                                    disabled={!option.available}
                                    className={cn(
                                        "relative p-4 rounded-xl border-2 text-left transition-all",
                                        "hover:scale-[1.02] active:scale-[0.98]",
                                        isSelected
                                            ? "border-white/40 bg-white/10"
                                            : "border-white/10 bg-white/5 hover:bg-white/10",
                                        !option.available && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {/* Selection Indicator */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                                            option.accent
                                        )}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white">{option.label}</h3>
                                            <p className="text-sm text-white/60 mt-1">{option.description}</p>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-white/20 text-white hover:bg-white/10"
                        >
                            取消
                        </Button>
                        <Button
                            onClick={handleCreateRoom}
                            disabled={isCreating}
                            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
                        >
                            {isCreating ? '創建中...' : '創建練習室'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
