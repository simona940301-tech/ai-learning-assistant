/**
 * Install Prompt Component
 * 
 * Smart install prompt with platform-specific UI
 */

'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share, Home } from 'lucide-react'
import { usePWAInstall } from '@/lib/hooks/usePWAInstall'
import { motion, AnimatePresence } from 'framer-motion'
import { INSTALL_PROMPT_CONFIG } from '@/lib/pwa/config'

export function InstallPrompt() {
    const { canInstall, isInstalled, platform, promptInstall, dismissPrompt } = usePWAInstall()
    const [showPrompt, setShowPrompt] = useState(false)

    useEffect(() => {
        if (canInstall && !isInstalled) {
            // Show prompt after delay
            const timer = setTimeout(() => {
                setShowPrompt(true)
            }, INSTALL_PROMPT_CONFIG.deferredPromptDelay)

            return () => clearTimeout(timer)
        }
    }, [canInstall, isInstalled])

    const handleInstall = async () => {
        const success = await promptInstall()
        if (success) {
            setShowPrompt(false)
        }
    }

    const handleDismiss = () => {
        dismissPrompt()
        setShowPrompt(false)
    }

    // Don't show if already installed or can't install
    if (isInstalled || !canInstall || !showPrompt) {
        return null
    }

    // iOS-specific instructions
    if (platform === 'ios') {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl"
                >
                    <div className="max-w-md mx-auto p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Home className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">安裝 PLMS 到主畫面</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        獲得更好的使用體驗
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                            <p className="text-sm font-medium text-blue-900">
                                請按照以下步驟安裝：
                            </p>
                            <ol className="text-sm text-blue-800 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">1.</span>
                                    <span>
                                        點擊下方的 <Share className="w-4 h-4 inline mx-1" /> 分享按鈕
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">2.</span>
                                    <span>選擇「加入主畫面」</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">3.</span>
                                    <span>點擊「新增」完成安裝</span>
                                </li>
                            </ol>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        )
    }

    // Android/Desktop install prompt
    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
            >
                <div className="bg-white rounded-lg shadow-2xl border-2 border-yellow-200 overflow-hidden">
                    <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Download className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">安裝 PLMS</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        快速啟動，離線使用
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleInstall}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                立即安裝
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                            >
                                稍後
                            </button>
                        </div>
                    </div>

                    {/* Benefits */}
                    <div className="bg-yellow-50 px-6 py-3 border-t border-yellow-100">
                        <ul className="text-xs text-gray-600 space-y-1">
                            <li className="flex items-center gap-2">
                                <span className="text-yellow-500">✓</span>
                                <span>快速啟動，一鍵開啟</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-yellow-500">✓</span>
                                <span>離線也能使用部分功能</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-yellow-500">✓</span>
                                <span>獲得類似 App 的體驗</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
