'use client'

import { usePreviewFlags, logPreviewFlags } from '@/lib/preview-flags'
import { useEffect, useState } from 'react'

/**
 * Preview Flags Control Panel
 * 
 * A floating panel to toggle Batch 1.5 flags in real-time
 * without restarting the dev server.
 * 
 * Usage: Add to root layout in dev mode
 */
export function PreviewFlagsPanel() {
  const { flags, updateFlags, resetFlags } = usePreviewFlags()
  const [isOpen, setIsOpen] = useState(false)
  const [isDev, setIsDev] = useState(false)
  
  useEffect(() => {
    // Only show in development
    setIsDev(process.env.NODE_ENV === 'development')
    
    // Log flags on mount
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => logPreviewFlags(), 1000)
    }
    
    // Keyboard shortcut: Ctrl+Shift+F to toggle panel
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        setIsOpen(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [])
  
  if (!isDev) return null
  
  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-all"
        title="Preview Flags Panel (Ctrl+Shift+F)"
      >
        🎛️
      </button>
      
      {/* Control Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[9999] w-80 rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Preview Flags - Batch 1.5
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            {/* Batch 1.5 Master Toggle */}
            <FlagToggle
              label="Enable Batch 1.5"
              enabled={flags.batch1_5}
              onChange={(checked) => updateFlags({ batch1_5: checked })}
              description="Master switch for all Batch 1.5 features"
            />
            
            <div className="my-2 border-t border-gray-700" />
            
            {/* Individual Flags */}
            <FlagToggle
              label="Single CTA"
              enabled={flags.single_cta}
              onChange={(checked) => updateFlags({ single_cta: checked })}
              description="Simplified single action button"
              disabled={!flags.batch1_5}
            />
            
            <FlagToggle
              label="Near Difficulty"
              enabled={flags.near_difficulty}
              onChange={(checked) => updateFlags({ near_difficulty: checked })}
              description="Smart question difficulty matching"
              disabled={!flags.batch1_5}
            />
            
            <FlagToggle
              label="Batch API"
              enabled={flags.batch_api}
              onChange={(checked) => updateFlags({ batch_api: checked })}
              description="Parallel API request processing"
              disabled={!flags.batch1_5}
            />
            
            <FlagToggle
              label="Sampler Performance"
              enabled={flags.sampler_perf}
              onChange={(checked) => updateFlags({ sampler_perf: checked })}
              description="Optimized question sampling"
              disabled={!flags.batch1_5}
            />
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={resetFlags}
              className="flex-1 rounded bg-gray-700 px-3 py-1.5 text-xs text-white hover:bg-gray-600"
            >
              Reset to Defaults
            </button>
            <button
              onClick={logPreviewFlags}
              className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
            >
              Log to Console
            </button>
          </div>
          
          <p className="mt-3 text-xs text-gray-400">
            Flags persist in session. Refresh page to apply.
          </p>
        </div>
      )}
    </>
  )
}

function FlagToggle({
  label,
  enabled,
  onChange,
  description,
  disabled = false,
}: {
  label: string
  enabled: boolean
  onChange: (checked: boolean) => void
  description?: string
  disabled?: boolean
}) {
  return (
    <label className={`flex items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1">
        <div className="text-sm text-white">{label}</div>
        {description && (
          <div className="text-xs text-gray-400">{description}</div>
        )}
      </div>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-5 w-5 cursor-pointer"
      />
    </label>
  )
}

