'use client'

import { motion } from 'framer-motion'

export function DailySnapshot() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">早安, User! 👋</h2>
                <p className="text-sm text-muted-foreground">
                    本週專注時長超越 <span className="font-medium text-foreground">78%</span> 的用戶
                </p>
            </div>
        </motion.div>
    )
}
