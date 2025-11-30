'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AvatarSelector } from '@/components/avatar/AvatarSelector'
import { getAvatarPreset } from '@/lib/avatar/presets'

interface ProfileAvatarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAvatarUpdate?: (avatarUrl: string) => void
  currentPresetId?: string
}

/**
 * 🎨 Profile Avatar Modal (Enhanced)
 *
 * Choose from presets or upload custom photo
 * Clean and focused UX
 */
export function ProfileAvatarModal({
  open,
  onOpenChange,
  onAvatarUpdate,
  currentPresetId,
}: ProfileAvatarModalProps) {
  const handleSuccess = (avatarUrl: string) => {
    onAvatarUpdate?.(avatarUrl)
    // Close modal after short delay
    setTimeout(() => {
      onOpenChange(false)
    }, 500)
  }

  const handlePresetSelect = async (preset: any) => {
    try {
      // Update profile with preset avatar
      const response = await fetch('/api/profile/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          presetId: preset.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          onAvatarUpdate?.(preset.imageUrl)
          // Close modal after short delay
          setTimeout(() => {
            onOpenChange(false)
          }, 500)
        }
      }
    } catch (error) {
      console.error('[ProfileAvatarModal] Failed to update preset avatar:', error)
    }
  }

  const handleError = (error: string) => {
    console.error('[ProfileAvatarModal] Error:', error)
    // Could show toast notification here
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl">更新頭像</DialogTitle>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          <AvatarSelector
            selectedId={currentPresetId}
            onSelect={handlePresetSelect}
            size="md"
          />
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
            選擇一個精靈頭像來代表你
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
