'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Grid3x3, Upload, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AvatarSelector, AvatarDisplay } from '@/components/avatar/AvatarSelector'
import { getDefaultAvatar, type AvatarPreset } from '@/lib/avatar/presets'
import { useAuth } from '@/lib/auth-context'

interface ProfileEditModalV2Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAvatarPreset?: string
  onAvatarUpdate?: (presetId: string) => void
}

/**
 * 🎨 Profile Edit Modal V2 - Redesigned
 *
 * New Features:
 * - Tab-based interface (Presets | Upload)
 * - Real-time preview
 * - Better error handling
 * - Simplified UX
 *
 * Design: Apple Settings + Discord Profile Customization
 */
export function ProfileEditModalV2({
  open,
  onOpenChange,
  currentAvatarPreset,
  onAvatarUpdate,
}: ProfileEditModalV2Props) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'preset' | 'upload'>('preset')
  const [selectedPreset, setSelectedPreset] = useState<AvatarPreset>(() => {
    if (currentAvatarPreset) {
      const preset = AVATAR_PRESETS.find(p => p.id === currentAvatarPreset)
      return preset || getDefaultAvatar()
    }
    return getDefaultAvatar()
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSavePreset = async () => {
    if (!user || !selectedPreset) return

    setSaving(true)
    setError(null)

    try {
      // ✅ 使用安全的 API 端點替代直接數據庫訪問
      const response = await fetch('/api/profile/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId: selectedPreset.id,
          avatarTier: 1,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '更新頭像失敗')
      }

      // Notify parent
      onAvatarUpdate?.(selectedPreset.id)

      // Success feedback
      setTimeout(() => {
        onOpenChange(false)
        setSaving(false)
      }, 300)
    } catch (err) {
      console.error('[ProfileEditModalV2] Save error:', err)
      setError(err instanceof Error ? err.message : '儲存失敗')
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setError(null)
    onOpenChange(false)
  }

  const hasChanges = selectedPreset.id !== currentAvatarPreset

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">編輯頭像</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="flex justify-center py-4">
            <AvatarDisplay preset={selectedPreset} size="xl" />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preset' | 'upload')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preset" className="flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" />
                預設頭像
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                上傳照片
              </TabsTrigger>
            </TabsList>

            {/* Preset Selection */}
            <TabsContent value="preset" className="mt-6">
              <AvatarSelector selectedId={selectedPreset.id} onSelect={setSelectedPreset} size="md" />
            </TabsContent>

            {/* Photo Upload */}
            <TabsContent value="upload" className="mt-6">
              <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-8 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">照片上傳功能即將推出</h3>
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                  我們正在開發 AI 像素藝術生成功能
                  <br />
                  目前請先使用預設頭像
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('preset')}
                  className="bg-white dark:bg-gray-800"
                >
                  返回預設頭像
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={saving}>
              取消
            </Button>
            <Button
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleSavePreset}
              disabled={!hasChanges || saving || activeTab === 'upload'}
            >
              {saving ? '儲存中...' : '確認更新'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Import at component level to avoid issues
import { AVATAR_PRESETS } from '@/lib/avatar/presets'
