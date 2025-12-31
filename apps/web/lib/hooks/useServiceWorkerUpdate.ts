/**
 * Service Worker Update Hook
 * 
 * Detects when a new version of the app is available and triggers update notification.
 * Works with next-pwa to provide seamless auto-update experience.
 * 
 * @module useServiceWorkerUpdate
 */

'use client'

import { useEffect, useState } from 'react'

export interface UpdateState {
    updateAvailable: boolean
    updateReady: boolean
    registration: ServiceWorkerRegistration | null
}

/**
 * Hook to detect service worker updates
 * 
 * @returns Update state and refresh function
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { updateAvailable, refreshApp } = useServiceWorkerUpdate()
 *   
 *   if (updateAvailable) {
 *     return <UpdateNotification onRefresh={refreshApp} />
 *   }
 * }
 * ```
 */
export function useServiceWorkerUpdate() {
    const [updateState, setUpdateState] = useState<UpdateState>({
        updateAvailable: false,
        updateReady: false,
        registration: null,
    })

    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return
        }

        // Check for updates every 60 seconds
        const checkForUpdates = async () => {
            try {
                const registration = await navigator.serviceWorker.getRegistration()
                if (registration) {
                    registration.update()
                }
            } catch (error) {
                console.error('[SW Update] Failed to check for updates:', error)
            }
        }

        // Initial check
        checkForUpdates()

        // Periodic check
        const interval = setInterval(checkForUpdates, 60 * 1000)

        // Listen for service worker updates
        const handleControllerChange = () => {
            console.log('[SW Update] New service worker activated, update ready')
            setUpdateState((prev) => ({
                ...prev,
                updateReady: true,
            }))
        }

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

        // Listen for waiting service worker
        navigator.serviceWorker.ready.then((registration) => {
            if (registration.waiting) {
                console.log('[SW Update] Update available, waiting to activate')
                setUpdateState({
                    updateAvailable: true,
                    updateReady: false,
                    registration,
                })
            }

            // Listen for new service worker installing
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing
                if (!newWorker) return

                console.log('[SW Update] New service worker installing')

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[SW Update] New service worker installed, update available')
                        setUpdateState({
                            updateAvailable: true,
                            updateReady: false,
                            registration,
                        })
                    }
                })
            })
        })

        return () => {
            clearInterval(interval)
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
        }
    }, [])

    /**
     * Refresh the app to apply the update
     * 
     * This will:
     * 1. Tell the waiting service worker to skip waiting
     * 2. Reload the page to activate the new service worker
     */
    const refreshApp = () => {
        if (updateState.registration?.waiting) {
            // Tell the waiting service worker to skip waiting
            updateState.registration.waiting.postMessage({ type: 'SKIP_WAITING' })

            // Reload the page after a short delay to ensure the new SW is activated
            setTimeout(() => {
                window.location.reload()
            }, 100)
        } else {
            // If no waiting worker, just reload
            window.location.reload()
        }
    }

    return {
        ...updateState,
        refreshApp,
    }
}
