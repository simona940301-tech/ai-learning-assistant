'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'

interface UpdateNotificationProps {
  isVisible: boolean
  onRefresh: () => void
  onDismiss: () => void
}

/**
 * PWA Update Notification Component
 *
 * Displays a minimalist toast notification when a new version is available.
 * Follows industry best practices (Discord, Notion, Linear style).
 *
 * Features:
 * - Minimalist design matching app aesthetics
 * - Auto-dismiss after 30 seconds
 * - Manual refresh button
 * - Manual dismiss button
 *
 * @example
 * ```tsx
 * <UpdateNotification
 *   isVisible={hasUpdate}
 *   onRefresh={() => window.location.reload()}
 *   onDismiss={() => setHasUpdate(false)}
 * />
 * ```
 */
export function UpdateNotification({ isVisible, onRefresh, onDismiss }: UpdateNotificationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 md:bottom-6"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-2xl backdrop-blur-xl">
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <RefreshCw className="h-5 w-5 text-blue-500" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                新版本可用
              </p>
              <p className="text-xs text-muted-foreground">
                重新整理以獲取最新功能
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onRefresh}
                className="h-8 bg-blue-500 px-3 text-xs text-white hover:bg-blue-600"
              >
                重新整理
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDismiss}
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
