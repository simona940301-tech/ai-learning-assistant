'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EditorGame } from './EditorGame'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Trophy, X } from 'lucide-react'

interface EditorGameModalProps {
    isOpen: boolean
    onClose: () => void
}

export function EditorGameModal({ isOpen, onClose }: EditorGameModalProps) {
    const [gameResult, setGameResult] = useState<{ score: number, total: number } | null>(null)

    const handleComplete = (score: number, total: number) => {
        setGameResult({ score, total })
    }

    const handleClose = () => {
        setGameResult(null)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/50">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <span className="text-2xl">📝</span>
                        實習編輯挑戰
                    </DialogTitle>
                    <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full hover:bg-muted">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden p-6 relative">
                    <EditorGame onComplete={handleComplete} />

                    {/* Result Overlay */}
                    <AnimatePresence>
                        {gameResult && (
                            <motion.div
                                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                className="absolute inset-0 z-50 flex items-center justify-center bg-background/60"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    className="bg-card border border-border shadow-2xl rounded-2xl p-8 max-w-md w-full text-center space-y-6"
                                >
                                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                                        <Trophy className="w-10 h-10 text-yellow-600" />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold">考核完成</h3>
                                        <p className="text-muted-foreground">
                                            你的編輯準確率為 {Math.round((gameResult.score / gameResult.total) * 100)}%
                                        </p>
                                    </div>

                                    <div className="p-4 bg-muted/50 rounded-xl">
                                        <div className="text-4xl font-black text-primary">
                                            {gameResult.score} <span className="text-xl text-muted-foreground font-medium">/ {gameResult.total}</span>
                                        </div>
                                    </div>

                                    <Button size="lg" className="w-full" onClick={handleClose}>
                                        領取獎勵並離開
                                    </Button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    )
}
