/**
 * Preview Flags Management - Batch 1.5 Hotfix
 * 
 * This module provides runtime access to preview flags and allows
 * toggling them without restarting the dev server.
 */

// Flag definitions
export interface PreviewFlags {
  batch1_5: boolean
  single_cta: boolean
  near_difficulty: boolean
  batch_api: boolean
  sampler_perf: boolean
}

// Read flags from environment (set at build/start time)
const getInitialFlags = (): PreviewFlags => ({
  batch1_5: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5 === 'true',
  single_cta: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA === 'true',
  near_difficulty: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY === 'true',
  batch_api: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API === 'true',
  sampler_perf: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF === 'true',
})

// In-memory flag storage (can be updated at runtime)
let currentFlags: PreviewFlags = getInitialFlags()

/**
 * Get current flag values
 */
export function getPreviewFlags(): PreviewFlags {
  return { ...currentFlags }
}

/**
 * Update flags at runtime (persists in sessionStorage)
 */
export function updatePreviewFlags(updates: Partial<PreviewFlags>): void {
  if (typeof window === 'undefined') return
  
  currentFlags = { ...currentFlags, ...updates }
  
  // Persist to sessionStorage
  sessionStorage.setItem('plms_preview_flags', JSON.stringify(currentFlags))
  
  // Log the change
  console.log('🔄 Preview flags updated:', currentFlags)
  
  // Trigger custom event for components to react
  window.dispatchEvent(new CustomEvent('preview-flags-changed', { 
    detail: currentFlags 
  }))
}

/**
 * Reset flags to environment defaults
 */
export function resetPreviewFlags(): void {
  if (typeof window === 'undefined') return
  
  currentFlags = getInitialFlags()
  sessionStorage.removeItem('plms_preview_flags')
  
  console.log('🔄 Preview flags reset to defaults:', currentFlags)
  
  window.dispatchEvent(new CustomEvent('preview-flags-changed', { 
    detail: currentFlags 
  }))
}

/**
 * Load flags from sessionStorage (on page load)
 */
export function loadPreviewFlags(): void {
  if (typeof window === 'undefined') return
  
  const stored = sessionStorage.getItem('plms_preview_flags')
  if (stored) {
    try {
      currentFlags = JSON.parse(stored)
      console.log('✓ Loaded preview flags from session:', currentFlags)
    } catch (e) {
      console.warn('Failed to parse stored flags, using defaults')
    }
  }
}

/**
 * React Hook for preview flags
 */
import { useEffect, useState } from 'react'

export function usePreviewFlags() {
  const [flags, setFlags] = useState<PreviewFlags>(getPreviewFlags)
  
  useEffect(() => {
    // Load from session on mount
    loadPreviewFlags()
    setFlags(getPreviewFlags())
    
    // Listen for flag changes
    const handleFlagsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<PreviewFlags>
      setFlags(customEvent.detail)
    }
    
    window.addEventListener('preview-flags-changed', handleFlagsChanged)
    return () => window.removeEventListener('preview-flags-changed', handleFlagsChanged)
  }, [])
  
  return {
    flags,
    updateFlags: updatePreviewFlags,
    resetFlags: resetPreviewFlags,
  }
}

/**
 * Check if we're in preview mode
 */
export function isPreviewMode(): boolean {
  return getPreviewFlags().batch1_5
}

/**
 * Log flag status (for debugging)
 */
export function logPreviewFlags(): void {
  const flags = getPreviewFlags()
  console.group('🎛️  Preview Flags Status')
  console.log('Batch 1.5:', flags.batch1_5 ? '✅' : '❌')
  console.log('Single CTA:', flags.single_cta ? '✅' : '❌')
  console.log('Near Difficulty:', flags.near_difficulty ? '✅' : '❌')
  console.log('Batch API:', flags.batch_api ? '✅' : '❌')
  console.log('Sampler Perf:', flags.sampler_perf ? '✅' : '❌')
  console.groupEnd()
}

