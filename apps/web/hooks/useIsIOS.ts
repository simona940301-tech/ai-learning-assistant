'use client'

import { useState, useEffect } from 'react'

/**
 * iOS Detection Hook
 *
 * Detects iOS devices using multiple strategies:
 * 1. User Agent string matching
 * 2. Platform API
 * 3. Touch support detection
 *
 * Used to adapt UX for iOS native selection behavior
 */
export function useIsIOS(): boolean {
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Strategy 1: User Agent detection
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSUserAgent = /iphone|ipad|ipod/.test(userAgent)

    // Strategy 2: Platform API (iOS 13+)
    const platform = (window.navigator as any).platform || ''
    const isIOSPlatform = /iphone|ipad|ipod/.test(platform.toLowerCase())

    // Strategy 3: Newer iPad detection (iPadOS 13+ reports as Mac)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isMacPlatform = /mac/.test(platform.toLowerCase())
    const isLikelyIPad = isMacPlatform && isTouchDevice

    // Combine all strategies
    const detected = isIOSUserAgent || isIOSPlatform || isLikelyIPad

    setIsIOS(detected)

    if (detected) {
      console.log('[useIsIOS] iOS device detected:', {
        userAgent: isIOSUserAgent,
        platform: isIOSPlatform,
        likelyIPad: isLikelyIPad,
      })
    }
  }, [])

  return isIOS
}
