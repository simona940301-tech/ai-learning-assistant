'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { AVATAR_PRESETS, AVATAR_CATEGORIES, type AvatarPreset } from '@/lib/avatar/presets'

interface AvatarSelectorProps {
  selectedId?: string
  onSelect: (preset: AvatarPreset) => void
  size?: 'sm' | 'md' | 'lg'
  hideNames?: boolean
}

/**
 * 🎨 Avatar Preset Selector
 *
 * Beautiful grid selector for preset avatars
 * Inspired by iOS Memoji picker and Discord avatar customization
 *
 * Features:
 * - Category tabs for organization
 * - Smooth animations
 * - Visual feedback on selection
 * - Responsive grid layout
 */
export function AvatarSelector({ selectedId, onSelect, size = 'md', hideNames = false }: AvatarSelectorProps) {
  // 只顯示fairy分類的頭像
  const filteredAvatars = AVATAR_PRESETS

  const sizeClasses = {
    sm: 'h-12 w-12 text-2xl',
    md: 'h-16 w-16 text-3xl',
    lg: 'h-20 w-20 text-4xl',
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">選擇你的精靈頭像</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">魔幻精靈風格</p>
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {filteredAvatars.map((avatar) => {
            const isSelected = selectedId === avatar.id

            return (
              <button
                key={avatar.id}
                onClick={() => onSelect(avatar)}
                className="group relative"
                title={avatar.description}
              >
                {/* Avatar Container */}
                <motion.div
                  className={`relative flex ${sizeClasses[size]} items-center justify-center overflow-hidden rounded-2xl border-3 transition-all ${
                    isSelected
                      ? 'border-[#FED168] shadow-lg shadow-[#FED168]/30'
                      : 'border-[#E0D0B8] hover:border-[#FED168] hover:shadow-md'
                  }`}
                  style={{
                    borderColor: isSelected ? '#FED168' : undefined,
                    backgroundColor: 'transparent',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Avatar Image with emoji fallback */}
                  <div className="flex h-full w-full items-center justify-center">
                    <img
                      src={avatar.imageUrl}
                      alt={avatar.name}
                      className="h-full w-full object-contain rounded-xl"
                      onError={(e) => {
                        // Fallback to emoji if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.emoji-fallback');
                        if (fallback) {
                          (fallback as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                    <div className="emoji-fallback absolute inset-0 flex items-center justify-center text-2xl md:text-3xl lg:text-4xl" style={{ display: 'none' }}>
                      {avatar.emoji}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg dark:border-gray-900"
                        style={{ backgroundColor: avatar.color }}
                      >
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hover Overlay */}
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-10"
                    style={{ backgroundColor: avatar.color }}
                  />
                </motion.div>

                {/* Avatar Name (on hover) - hidden if hideNames is true */}
                {!hideNames && (
                  <div className="absolute -bottom-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
                    {avatar.name}
                  </div>
                )}
              </button>
            )
          })}
      </div>

    </div>
  )
}

/**
 * 🎭 Selected Avatar Display
 *
 * Shows the currently selected avatar with name and description
 */
interface AvatarDisplayProps {
  preset: AvatarPreset
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function AvatarDisplay({ preset, size = 'lg' }: AvatarDisplayProps) {
  const sizeClasses = {
    sm: 'h-12 w-12 text-2xl',
    md: 'h-16 w-16 text-3xl',
    lg: 'h-24 w-24 text-5xl',
    xl: 'h-32 w-32 text-6xl',
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar */}
      <motion.div
        className={`flex ${sizeClasses[size]} items-center justify-center overflow-hidden rounded-2xl border-4 shadow-lg`}
        style={{
          borderColor: preset.color,
          background: `linear-gradient(135deg, ${preset.color}20, ${preset.color}10)`,
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <img
          src={preset.imageUrl}
          alt={preset.name}
          className="h-full w-full object-contain rounded-xl"
          onError={(e) => {
            // Fallback to emoji if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.parentElement?.querySelector('.emoji-fallback');
            if (fallback) {
              (fallback as HTMLElement).style.display = 'flex';
            }
          }}
        />
        <div className="emoji-fallback absolute inset-0 flex items-center justify-center" style={{ display: 'none' }}>
          <span className="text-2xl md:text-3xl lg:text-5xl xl:text-6xl">{preset.emoji}</span>
        </div>
      </motion.div>

      {/* Info */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{preset.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{preset.description}</p>
      </div>
    </div>
  )
}
