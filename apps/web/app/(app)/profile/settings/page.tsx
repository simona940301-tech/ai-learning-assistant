'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AppBar } from '@/components/layout/app-bar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonProfile } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { supabaseBrowserClient } from '@/lib/supabase'
import { ProfileAvatarModal } from '@/components/profile/ProfileAvatarModal'
import { universities } from '@/lib/taiwan-universities'

interface ProfileRow {
  username: string | null
  display_name: string | null
  full_name: string | null
  avatar_url: string | null
  target_university: string | null
  target_department: string | null
  bio: string | null
  email_notifications: boolean | null
  push_notifications: boolean | null
}

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { user: authUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('')

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)

  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!authUser?.id) return

    const load = async () => {
      try {
        const { data, error } = await supabaseBrowserClient
          .from('profiles')
          .select('username, display_name, full_name, avatar_url, target_university, target_department, bio, email_notifications, push_notifications')
          .eq('id', authUser.id)
          .maybeSingle()

        if (error) {
          console.error('[ProfileSettings] Failed to fetch profile:', error)
          setError('載入設定時發生錯誤，請稍後再試。')
          return
        }

        const row = (data || {}) as ProfileRow

        // Username is always the email (non-editable)
        setUsername(authUser.email || '')
        setDisplayName(row.display_name || '')
        setFullName(row.full_name || '')
        setBio(row.bio || '')
        setAvatarUrl(row.avatar_url ?? null)
        setEmailNotifications(row.email_notifications ?? true)
        setPushNotifications(row.push_notifications ?? true)

        if (row.target_university) {
          const uni = universities.find(u => u.name === row.target_university)
          if (uni) {
            setSelectedUniversityId(uni.id)
            if (row.target_department) {
              const dept = uni.departments.find(d => d.name === row.target_department)
              if (dept) {
                setSelectedDepartmentId(dept.id)
              }
            }
          }
        }
      } catch (err) {
        console.error('[ProfileSettings] Unexpected error:', err)
        setError('載入設定時發生錯誤，請稍後再試。')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authUser?.id, authUser?.email])

  const handleSave = async () => {
    if (!authUser?.id) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const trimmedDisplayName = displayName.trim()
      const trimmedFullName = fullName.trim()
      const trimmedBio = bio.trim()

      const uni = universities.find(u => u.id === selectedUniversityId)
      const dept =
        uni && selectedDepartmentId
          ? uni.departments.find(d => d.id === selectedDepartmentId)
          : null

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
      }

      // Username (email) is not editable, so we don't update it

      if (trimmedDisplayName) {
        updatePayload.display_name = trimmedDisplayName
      }

      if (trimmedFullName) {
        updatePayload.full_name = trimmedFullName
      }

      if (trimmedBio) {
        updatePayload.bio = trimmedBio
      }

      if (uni) {
        updatePayload.target_university = uni.name
      }

      if (dept) {
        updatePayload.target_department = dept.name
      } else if (!uni) {
        // 如果未選擇大學，清空目標設定
        updatePayload.target_university = null
        updatePayload.target_department = null
      }

      const { error } = await supabaseBrowserClient
        .from('profiles')
        .update(updatePayload)
        .eq('id', authUser.id)

      if (error) {
        console.error('[ProfileSettings] Save error:', error)
        setError('儲存失敗，請稍後再試。')
        setSaving(false)
        return
      }

      setSuccessMessage('設定已成功儲存！')
      setSaving(false)

      // 延遲後返回 home 頁面
      setTimeout(() => {
        router.push('/home')
      }, 1500)
    } catch (err) {
      console.error('[ProfileSettings] Save error:', err)
      setError('儲存失敗，請稍後再試。')
      setSaving(false)
    }
  }

  const handleAvatarUpdate = (url: string) => {
    setAvatarUrl(url)
  }

  const selectedUniversity = universities.find(u => u.id === selectedUniversityId) || null
  const departments = selectedUniversity?.departments ?? []

  return (
    <>
      <AppBar
        title="設定"
        rightAction={
          <Link href="/home">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
              返回
            </Button>
          </Link>
        }
      />

      <main className="mx-auto max-w-lg px-7 pt-4 pb-20 bg-[#FFFBF0] min-h-screen">
        {loading ? (
          <SkeletonProfile />
        ) : (
          <div className="space-y-6">
            {/* Avatar & Basic Info */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white/90 border border-[#4A3728]/8 p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 shadow">
                  <AvatarImage src={avatarUrl || undefined} alt={username || 'User'} />
                  <AvatarFallback className="bg-white text-[#4A3728]">
                    {username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-xs text-[#7A6A57] mb-1">頭像與名稱</p>
                  <p className="text-sm text-[#4A3728] mb-2">
                    使用者名稱會顯示在排行榜與對戰中。
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs bg-[#F5F0E8] border-[#4A3728]/20 text-[#4A3728]"
                    onClick={() => setAvatarModalOpen(true)}
                  >
                    更換頭像
                  </Button>
                </div>
              </div>
            </motion.section>

            {/* Personal Info */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl bg-white/90 border border-[#4A3728]/8 p-4 shadow-sm space-y-4"
            >
              <div>
                <p className="text-xs text-[#7A6A57] mb-1">名稱</p>
                <p className="text-xs text-[#A1968A] mb-3">
                  這是其他使用者會看到的名稱，會顯示在排行榜與對戰中。
                </p>
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="輸入名稱（例如：小明、Alex）"
                  className="h-9 text-sm bg-[#FFFBF5] border-[#4A3728]/15"
                />
              </div>

              <div>
                <p className="text-xs text-[#7A6A57] mb-1">帳號 (Email)</p>
                <p className="text-xs text-[#A1968A] mb-3">
                  您的登入帳號，無法修改。
                </p>
                <Input
                  value={username}
                  disabled
                  className="h-9 text-sm bg-[#F5F0E8] border-[#4A3728]/10 text-[#7A6A57] cursor-not-allowed"
                />
              </div>

              <div>
                <p className="text-xs text-[#7A6A57] mb-1">個人簡介</p>
                <p className="text-xs text-[#A1968A] mb-3">
                  簡單介紹一下自己吧！
                </p>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="熱愛學習的高中生 📚"
                  className="w-full h-20 rounded-lg border border-[#4A3728]/15 bg-[#FFFBF5] px-3 py-2 text-sm text-[#4A3728] resize-none"
                  maxLength={200}
                />
                <p className="text-xs text-[#A1968A] text-right mt-1">
                  {bio.length}/200
                </p>
              </div>
            </motion.section>

            {/* Dream School Target */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-white/90 border border-[#4A3728]/8 p-4 shadow-sm space-y-3"
            >
              <p className="text-xs text-[#7A6A57] mb-1">目標學校與科系</p>
              <p className="text-xs text-[#A1968A]">
                這些資訊會用於 Dream School Ready 的計算與回饋，不會公開顯示給其他學生。
              </p>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4A3728]">
                    理想大學
                  </label>
                  <select
                    value={selectedUniversityId}
                    onChange={e => {
                      setSelectedUniversityId(e.target.value)
                      setSelectedDepartmentId('')
                    }}
                    className="w-full h-9 rounded-lg border border-[#4A3728]/15 bg-[#FFFBF5] px-3 text-sm text-[#4A3728]"
                  >
                    <option value="">尚未設定</option>
                    {universities.map(uni => (
                      <option key={uni.id} value={uni.id}>
                        {uni.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4A3728]">
                    目標科系
                  </label>
                  <select
                    value={selectedDepartmentId}
                    onChange={e => setSelectedDepartmentId(e.target.value)}
                    disabled={!selectedUniversity}
                    className="w-full h-9 rounded-lg border border-[#4A3728]/15 bg-[#FFFBF5] px-3 text-sm text-[#4A3728] disabled:opacity-50"
                  >
                    <option value="">尚未設定</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.section>

            {/* Notification Preferences */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl bg-white/90 border border-[#4A3728]/8 p-4 shadow-sm space-y-3"
            >
              <p className="text-xs text-[#7A6A57] mb-1">通知設定</p>
              <p className="text-xs text-[#A1968A] mb-3">
                管理您接收學習提醒與更新通知的方式。
              </p>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm text-[#4A3728] font-medium">Email 通知</p>
                    <p className="text-xs text-[#A1968A]">接收學習進度與成就通知</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={e => setEmailNotifications(e.target.checked)}
                    className="h-5 w-5 rounded border-[#4A3728]/30 text-[#4A3728] focus:ring-[#4A3728]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm text-[#4A3728] font-medium">推播通知</p>
                    <p className="text-xs text-[#A1968A]">接收即時學習提醒</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={e => setPushNotifications(e.target.checked)}
                    className="h-5 w-5 rounded border-[#4A3728]/30 text-[#4A3728] focus:ring-[#4A3728]"
                  />
                </label>
              </div>
            </motion.section>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
              >
                {error}
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
              >
                ✓ {successMessage}
              </motion.div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-10 rounded-xl bg-[#4A3728] text-sm text-[#FFF7E6] hover:bg-[#3D2D20] disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存設定'}
            </Button>
          </div>
        )}
      </main>

      <ProfileAvatarModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        onAvatarUpdate={handleAvatarUpdate}
      />
    </>
  )
}

