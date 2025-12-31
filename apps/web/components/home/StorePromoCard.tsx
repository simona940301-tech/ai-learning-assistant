'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Timer, ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'
import { StoreModal } from '@/components/store/StoreModal'

export function StorePromoCard() {
    const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 23, seconds: 15 })
    const [showStore, setShowStore] = useState(false)

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 }
                return prev // Timer finished
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const formatTime = (val: number) => val.toString().padStart(2, '0')

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
            >
                <Card className="border border-border">
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Timer className="h-3.5 w-3.5" />
                                <span>限時特惠 {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}</span>
                            </div>
                            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                -50% OFF
                            </span>
                        </div>

                        <div>
                            <h3 className="text-base font-semibold text-foreground mb-1">全科衝刺題本包</h3>
                            <p className="text-sm text-muted-foreground">包含國英數社自 5 科精選考題，快速提升實戰力</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-semibold text-foreground">$9.99</span>
                                <span className="text-sm text-muted-foreground line-through">$19.99</span>
                            </div>
                            <Button
                                onClick={() => setShowStore(true)}
                                size="sm"
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                <ShoppingBag className="mr-1.5 h-4 w-4" />
                                立即搶購
                            </Button>
                        </div>
                    </div>
                </Card>
            </motion.div>

            <StoreModal
                open={showStore}
                onOpenChange={setShowStore}
            />
        </>
    )
}
