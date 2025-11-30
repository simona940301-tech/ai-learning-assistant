/**
 * usePWAInstall Hook
 * 
 * Manages PWA install prompt with platform detection and user preferences
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BeforeInstallPromptEvent, InstallPromptState } from '../pwa/types'
import { INSTALL_PROMPT_CONFIG, STORAGE_KEYS, ANALYTICS_EVENTS } from '../pwa/config'

export function usePWAInstall() {
    const [installState, setInstallState] = useState<InstallPromptState>({
        canInstall: false,
        isInstalled: false,
        platform: 'unknown',
        promptEvent: null,
    })

    // Detect platform
    const detectPlatform = useCallback((): InstallPromptState['platform'] => {
        const ua = navigator.userAgent.toLowerCase()

        // iOS detection
        if (/iphone|ipad|ipod/.test(ua)) {
            return 'ios'
        }

        // Android detection
        if (/android/.test(ua)) {
            return 'android'
        }

        // Desktop
        if (!/mobile/.test(ua)) {
            return 'desktop'
        }

        return 'unknown'
    }, [])

    // Check if already installed
    const checkIfInstalled = useCallback(() => {
        // Check if running in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isIOSStandalone = (navigator as any).standalone === true

        return isStandalone || isIOSStandalone
    }, [])

    // Check if user has dismissed too many times
    const canShowPrompt = useCallback(() => {
        const dismissCount = parseInt(
            localStorage.getItem(STORAGE_KEYS.INSTALL_PROMPT_COUNT) || '0'
        )

        if (dismissCount >= INSTALL_PROMPT_CONFIG.maxDismissCount) {
            const lastDismiss = parseInt(
                localStorage.getItem(STORAGE_KEYS.INSTALL_PROMPT_DISMISSED) || '0'
            )
            const now = Date.now()

            // Check if cooldown period has passed
            if (now - lastDismiss < INSTALL_PROMPT_CONFIG.dismissCooldown) {
                return false
            }

            // Reset counter after cooldown
            localStorage.setItem(STORAGE_KEYS.INSTALL_PROMPT_COUNT, '0')
        }

        return true
    }, [])

    // Handle beforeinstallprompt event
    useEffect(() => {
        const platform = detectPlatform()
        const isInstalled = checkIfInstalled()

        setInstallState(prev => ({
            ...prev,
            platform,
            isInstalled,
        }))

        if (isInstalled) {
            return
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            const event = e as BeforeInstallPromptEvent

            // Prevent the mini-infobar from appearing on mobile
            event.preventDefault()

            // Check if we can show the prompt
            if (!canShowPrompt()) {
                return
            }

            // Store the event for later use
            setInstallState(prev => ({
                ...prev,
                canInstall: true,
                promptEvent: event,
            }))

            // Track analytics
            if (typeof window !== 'undefined' && (window as any).gtag) {
                (window as any).gtag('event', ANALYTICS_EVENTS.INSTALL_PROMPT_SHOWN, {
                    platform,
                })
            }
        }

        const handleAppInstalled = () => {
            setInstallState(prev => ({
                ...prev,
                isInstalled: true,
                canInstall: false,
                promptEvent: null,
            }))

            // Track analytics
            if (typeof window !== 'undefined' && (window as any).gtag) {
                (window as any).gtag('event', ANALYTICS_EVENTS.PWA_INSTALLED, {
                    platform: detectPlatform(),
                })
            }
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [detectPlatform, checkIfInstalled, canShowPrompt])

    // Trigger install prompt
    const promptInstall = useCallback(async () => {
        if (!installState.promptEvent) {
            return false
        }

        try {
            // Show the install prompt
            await installState.promptEvent.prompt()

            // Wait for user response
            const { outcome } = await installState.promptEvent.userChoice

            if (outcome === 'accepted') {
                // Track acceptance
                if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', ANALYTICS_EVENTS.INSTALL_PROMPT_ACCEPTED, {
                        platform: installState.platform,
                    })
                }

                setInstallState(prev => ({
                    ...prev,
                    canInstall: false,
                    promptEvent: null,
                }))

                return true
            } else {
                // Track dismissal
                if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', ANALYTICS_EVENTS.INSTALL_PROMPT_DISMISSED, {
                        platform: installState.platform,
                    })
                }

                // Increment dismiss count
                const dismissCount = parseInt(
                    localStorage.getItem(STORAGE_KEYS.INSTALL_PROMPT_COUNT) || '0'
                )
                localStorage.setItem(
                    STORAGE_KEYS.INSTALL_PROMPT_COUNT,
                    (dismissCount + 1).toString()
                )
                localStorage.setItem(
                    STORAGE_KEYS.INSTALL_PROMPT_DISMISSED,
                    Date.now().toString()
                )

                setInstallState(prev => ({
                    ...prev,
                    canInstall: false,
                    promptEvent: null,
                }))

                return false
            }
        } catch (error) {
            console.error('Error showing install prompt:', error)
            return false
        }
    }, [installState.promptEvent, installState.platform])

    // Manual dismiss (for custom UI)
    const dismissPrompt = useCallback(() => {
        const dismissCount = parseInt(
            localStorage.getItem(STORAGE_KEYS.INSTALL_PROMPT_COUNT) || '0'
        )
        localStorage.setItem(
            STORAGE_KEYS.INSTALL_PROMPT_COUNT,
            (dismissCount + 1).toString()
        )
        localStorage.setItem(
            STORAGE_KEYS.INSTALL_PROMPT_DISMISSED,
            Date.now().toString()
        )

        setInstallState(prev => ({
            ...prev,
            canInstall: false,
            promptEvent: null,
        }))

        // Track analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', ANALYTICS_EVENTS.INSTALL_PROMPT_DISMISSED, {
                platform: installState.platform,
            })
        }
    }, [installState.platform])

    return {
        ...installState,
        promptInstall,
        dismissPrompt,
    }
}
