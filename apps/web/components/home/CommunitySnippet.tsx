'use client'

import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export function CommunitySnippet() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 }}
        >
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm text-foreground">社群動態</h3>
                    <Link href="/community" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        查看更多
                    </Link>
                </div>

                {/* Friend Achievement */}
                <Card className="border border-border">
                    <div className="p-3 flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" />
                            <AvatarFallback>FX</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-sm text-foreground">
                            <span className="font-medium">Felix</span> 剛剛達成了 <span className="font-medium text-orange-600 dark:text-orange-400">Level 5</span> 里程碑
                        </div>
                        <button className="text-muted-foreground hover:text-red-500 transition-colors">
                            <Heart className="h-4 w-4" />
                        </button>
                    </div>
                </Card>

                {/* Trending Topic */}
                <Card className="border border-border">
                    <div className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 text-sm text-foreground">
                            <span className="font-medium">98 人</span> 正在討論「如何快速記憶三角函數公式」
                        </div>
                    </div>
                </Card>
            </div>
        </motion.div>
    )
}
