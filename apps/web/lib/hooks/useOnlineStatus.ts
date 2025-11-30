/**
 * useOnlineStatus Hook
 * 
 * Real-time network status detection with connection quality monitoring
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OnlineStatusHook, NetworkStatus } from '../pwa/types'

export function useOnlineStatus(): OnlineStatusHook {
    const [isOnline, setIsOnline] = useState(true)
    const [wasOffline, setWasOffline] = useState(false)
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null)

    const updateOnlineStatus = useCallback(() => {
        const online = navigator.onLine
        setIsOnline(online)

        if (!online) {
            setWasOffline(true)
        }

        // Get connection information if available
        if ('connection' in navigator) {
            const conn = (navigator as any).connection
            if (conn) {
                setNetworkStatus({
                    isOnline: online,
                    effectiveType: conn.effectiveType || 'unknown',
                    downlink: conn.downlink || 0,
                    rtt: conn.rtt || 0,
                    saveData: conn.saveData || false,
                })
            }
        }
    }, [])

    useEffect(() => {
        // Initial check
        updateOnlineStatus()

        // Listen for online/offline events
        window.addEventListener('online', updateOnlineStatus)
        window.addEventListener('offline', updateOnlineStatus)

        // Listen for connection changes
        if ('connection' in navigator) {
            const conn = (navigator as any).connection
            if (conn) {
                conn.addEventListener('change', updateOnlineStatus)
            }
        }

        return () => {
            window.removeEventListener('online', updateOnlineStatus)
            window.removeEventListener('offline', updateOnlineStatus)

            if ('connection' in navigator) {
                const conn = (navigator as any).connection
                if (conn) {
                    conn.removeEventListener('change', updateOnlineStatus)
                }
            }
        }
    }, [updateOnlineStatus])

    return {
        isOnline,
        wasOffline,
        networkStatus,
    }
}
