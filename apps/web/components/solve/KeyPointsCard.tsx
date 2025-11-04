'use client'

import { motion } from 'framer-motion'
import { type KeyPointsResult } from '@/lib/solve-types'

interface KeyPointsCardProps {
  result: KeyPointsResult
}

export default function KeyPointsCard({ result }: KeyPointsCardProps) {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold"
        >
          ⭐ {result.title}
        </motion.div>

        {/* Key Points Bullets */}
        <div className="space-y-3">
          {result.bullets.map((bullet, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-3 p-3 rounded-xl border border-border/60 bg-secondary/60"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium">
                {index + 1}
              </div>
              <div className="text-foreground/90 text-sm flex-1">{bullet}</div>
            </motion.div>
          ))}
        </div>

        {/* Examples (if provided) */}
        {result.examples && result.examples.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-2"
          >
            <div className="text-sm font-medium text-muted-foreground mt-6 mb-3">範例說明</div>
            <div className="space-y-3">
              {result.examples.map((example, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-border/50 bg-accent/40"
                >
                  <div className="text-xs font-medium text-foreground mb-1">{example.label}</div>
                  <div className="text-sm text-foreground/90 font-mono">{example.example}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 p-4 border border-border/60 bg-secondary/60 rounded-lg text-sm text-muted-foreground text-center"
        >
          💡 重點整理完成！建議搭配「相似題」練習以加強記憶
        </motion.div>
      </div>
    </div>
  )
}
