/**
 * Update Prompt Component
 * 
 * Notifies user when a new version of the app is available
 */

'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, X, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { UPDATE_PROMPT_CONFIG } from '@/lib/pwa/config'

export function UpdatePrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Check for updates periodically
            const checkForUpdate = () => {
                if (registration) {
                    registration.update()
                }
            }

            // Listen for controlling service worker changes
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // This fires when the service worker controlling this page changes
                // usually meaning the new SW has taken over
                if (!showPrompt) {
                    window.location.reload()
                }
            })

            // Register service worker and handle updates
            // Note: next-pwa handles registration, we just need to access it
            navigator.serviceWorker.ready.then(reg => {
                setRegistration(reg)

                // Check if there's a waiting worker (update ready)
                if (reg.waiting) {
                    setShowPrompt(true)
                }
            })
        }
    }, [showPrompt, registration])

    // Listen for custom event from next-pwa
    useEffect(() => {
        const handleWorkboxWaiting = (event: any) => {
            setShowPrompt(true)
            setRegistration(event.detail?.sw || null)
        }

        window.addEventListener('workbox-waiting', handleWorkboxWaiting)
        return () => window.removeEventListener('workbox-waiting', handleWorkboxWaiting)
    }, [])

    const handleUpdate = () => {
        if (registration && registration.waiting) {
            // Send message to SW to skip waiting
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })

            // Also try workbox message
            if (window.workbox) {
                window.workbox.messageSW({ type: 'SKIP_WAITING' })
            }
        }

        // Fallback reload if SW doesn't trigger controllerchange
        setTimeout(() => {
            window.location.reload()
        }, 1000)
    }

    const handleDismiss = () => {
        setShowPrompt(false)
    }

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
                >
                    <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-200 overflow-hidden">
                        <div className="p-5 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Zap className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">發現新版本</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            更新以獲得最新功能和修復
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
                                    onClick={handleUpdate}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    立即更新
                                </button>
                                {UPDATE_PROMPT_CONFIG.allowSkip && (
                                    <button
                                        onClick={handleDismiss}
                                        className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                                    >
                                        稍後
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
