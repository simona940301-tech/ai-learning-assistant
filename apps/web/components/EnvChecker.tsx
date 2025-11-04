'use client'

import { useEffect, useRef } from 'react'
import { checkEnvironment } from '@/lib/env-check'

/**
 * Environment Checker Component
 * Runs environment validation on client-side mount (once)
 */
export default function EnvChecker() {
  const hasRun = useRef(false)

  useEffect(() => {
    // Run environment check only once (prevent React Strict Mode double-run)
    if (!hasRun.current) {
      hasRun.current = true
      checkEnvironment()
    }
  }, [])

  // This component doesn't render anything
  return null
}

