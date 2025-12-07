'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Coins, Shield, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export function VirtualItemBanner() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.2 }}
        >
            <Card className="border border-border">
                <div className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center shrink-0">
                        <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-sm text-foreground">連勝保護盾</h4>
                            <span className="text-xs text-muted-foreground">
                                <Coins className="inline h-3.5 w-3.5 mr-0.5" />
                                200
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-muted-foreground">
                                目前 <span className="font-medium text-foreground">150</span> / 200
                            </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-orange-500 h-full rounded-full w-[75%] transition-all duration-300" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                            再玩 2 場對戰即可獲得
                        </p>
                    </div>

                    <Link href="/play">
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-full">
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </Card>
        </motion.div>
    )
}
