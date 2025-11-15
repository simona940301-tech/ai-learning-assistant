'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Search, GraduationCap, ChevronRight } from 'lucide-react'
import { universities, searchUniversities, searchDepartments, type University, type Department } from '@/lib/taiwan-universities'
import { supabaseBrowserClient } from '@/lib/supabase'

export default function OnboardingGoalPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [universitySearch, setUniversitySearch] = useState('')
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [customUniversity, setCustomUniversity] = useState('')
  const [customDepartment, setCustomDepartment] = useState('')
  const [saving, setSaving] = useState(false)
  const [skipLoading, setSkipLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<any>(null)
  const [loadingRequirements, setLoadingRequirements] = useState(false)

  // If not logged in, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/onboarding')
    }
  }, [user, authLoading, router])

  const filteredUniversities = useMemo(
    () => (universitySearch ? searchUniversities(universitySearch) : universities),
    [universitySearch],
  )

  const filteredDepartments = useMemo(() => {
    if (!selectedUniversity) {
      return []
    }

    return departmentSearch
      ? searchDepartments(selectedUniversity.id, departmentSearch)
      : selectedUniversity.departments
  }, [selectedUniversity, departmentSearch])

  const handleUniversitySelect = (university: University) => {
    setSelectedUniversity(university)
    setSelectedDepartment(null)
    setDepartmentSearch('')
    setCustomUniversity('')
    setCustomDepartment('')
    setFormError(null)
  }

  const handleDepartmentSelect = (department: Department) => {
    setSelectedDepartment(department)
    setCustomDepartment('')
    setFormError(null)
  }

  const handleCustomUniversity = () => {
    if (customUniversity.trim()) {
      setSelectedUniversity({
        id: 'custom',
        name: customUniversity.trim(),
        departments: [{ id: 'custom', name: '自訂科系' }],
      })
      setSelectedDepartment(null)
      setDepartmentSearch('')
      setCustomDepartment('')
      setFormError(null)
    }
  }

  const handleCustomDepartment = () => {
    if (customDepartment.trim() && selectedUniversity) {
      setSelectedDepartment({
        id: 'custom',
        name: customDepartment.trim(),
      })
      setFormError(null)
    }
  }

  const handleContinue = async () => {
    if (!user) {
      setFormError('請先登入')
      router.push('/onboarding')
      return
    }

    if (!selectedUniversity) {
      setFormError('請選擇或輸入大學名稱')
      return
    }

    const finalUniversity = (customUniversity.trim() || selectedUniversity.name).trim()
    if (!finalUniversity) {
      setFormError('請輸入大學名稱')
      return
    }

    const needsCustomDepartment = selectedUniversity.id === 'other' || selectedUniversity.id === 'custom'
    const finalDepartment = needsCustomDepartment
      ? customDepartment.trim()
      : customDepartment.trim() || selectedDepartment?.name || ''

    if (!finalDepartment) {
      setFormError('請選擇或輸入科系')
      return
    }

    setSaving(true)
    setFormError(null)

    const { error } = await supabaseBrowserClient
      .from('profiles')
      .update({
        target_university: finalUniversity,
        target_department: finalDepartment,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('[OnboardingGoal] Failed to update profile:', error)
      setFormError('儲存失敗，請稍後再試')
    } else {
      router.push('/play')
      router.refresh()
    }

    setSaving(false)
  }

  const handleSkip = async () => {
    if (!user) {
      return
    }

    setSkipLoading(true)
    setFormError(null)

    const { error } = await supabaseBrowserClient
      .from('profiles')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('[OnboardingGoal] Failed to skip onboarding:', error)
      setFormError('暫時無法跳過，請稍後再試')
    } else {
      router.push('/play')
      router.refresh()
    }

    setSkipLoading(false)
  }

  const canContinue = useMemo(() => {
    if (!selectedUniversity) {
      return false
    }

    if (selectedUniversity.id === 'other' || selectedUniversity.id === 'custom') {
      return Boolean(customDepartment.trim())
    }

    return Boolean(selectedDepartment || customDepartment.trim())
  }, [selectedUniversity, selectedDepartment, customDepartment])

  // 當選擇科系後，查詢門檻
  useEffect(() => {
    const fetchRequirements = async () => {
      if (!selectedUniversity || !selectedDepartment) {
        setRequirements(null)
        return
      }

      // 只查詢資料庫中的科系（不查詢自訂科系）
      if (selectedUniversity.id === 'other' || selectedUniversity.id === 'custom' || selectedDepartment.id === 'custom') {
        setRequirements(null)
        return
      }

      setLoadingRequirements(true)
      try {
        const response = await fetch(
          `/api/departments/requirements?university_name=${encodeURIComponent(selectedUniversity.name)}&department_name=${encodeURIComponent(selectedDepartment.name)}`
        )
        const { data } = await response.json()
        setRequirements(data)
      } catch (error) {
        console.error('Failed to fetch requirements:', error)
        setRequirements(null)
      } finally {
        setLoadingRequirements(false)
      }
    }

    fetchRequirements()
  }, [selectedUniversity, selectedDepartment])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-spin">⏳</div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-2/3 relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <span className="text-2xl font-bold">PLMS</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-md"
            >
              <h1 className="text-5xl font-bold mb-4 leading-tight">
                設定你的目標
              </h1>
              <p className="text-xl opacity-90 leading-relaxed">
                告訴我們你想就讀的大學和科系，我們會為你量身打造學習計劃
              </p>
            </motion.div>
          </div>

          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white/30" />
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">選擇你的目標</h2>
            <p className="text-muted-foreground">
              選擇或輸入你想就讀的大學和科系
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {['登入', '設定目標', '開始練習'].map((label, index) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      index <= 1 ? 'bg-foreground' : 'bg-muted'
                    }`}
                  />
                  <span className={index === 1 ? 'text-foreground font-semibold' : ''}>
                    {label}
                  </span>
                  {index < 2 && <div className="hidden sm:block w-8 h-px bg-border" />}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {/* 大學選擇 */}
            <div className="space-y-3">
              <Label htmlFor="university" className="text-lg font-semibold">
                大學名稱
              </Label>
              
              {/* 搜尋輸入 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="university"
                  type="text"
                  placeholder="搜尋大學名稱..."
                  value={universitySearch}
                  onChange={(e) => setUniversitySearch(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>

              {/* 自訂大學輸入 */}
              {!selectedUniversity && (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="或輸入自訂大學名稱"
                    value={customUniversity}
                    onChange={(e) => setCustomUniversity(e.target.value)}
                    className="h-11"
                  />
                  <Button
                    onClick={handleCustomUniversity}
                    disabled={!customUniversity.trim()}
                    className="h-11"
                  >
                    確認
                  </Button>
                </div>
              )}

              {/* 大學列表 */}
              {!selectedUniversity && (
                <Card className="max-h-64 overflow-y-auto p-2">
                  <div className="space-y-1">
                    {filteredUniversities.map((uni) => (
                      <button
                        key={uni.id}
                        onClick={() => handleUniversitySelect(uni)}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <GraduationCap className="h-5 w-5 text-muted-foreground" />
                          <span>{uni.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* 已選擇的大學 */}
              {selectedUniversity && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <span className="font-medium">{selectedUniversity.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUniversity(null)
                        setSelectedDepartment(null)
                        setUniversitySearch('')
                        setDepartmentSearch('')
                      }}
                    >
                      重新選擇
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* 科系選擇 */}
            {selectedUniversity && selectedUniversity.id !== 'other' && (
              <div className="space-y-3">
                <Label htmlFor="department" className="text-lg font-semibold">
                  科系名稱
                </Label>

                {/* 搜尋輸入 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="department"
                    type="text"
                    placeholder="搜尋科系名稱..."
                    value={departmentSearch}
                    onChange={(e) => setDepartmentSearch(e.target.value)}
                    className="h-11 pl-10"
                  />
                </div>

                {/* 自訂科系輸入 */}
                {!selectedDepartment && (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="或輸入自訂科系名稱"
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      className="h-11"
                    />
                    <Button
                      onClick={handleCustomDepartment}
                      disabled={!customDepartment.trim()}
                      className="h-11"
                    >
                      確認
                    </Button>
                  </div>
                )}

                {/* 科系列表 */}
                {!selectedDepartment && !customDepartment && (
                  <Card className="max-h-64 overflow-y-auto p-2">
                    <div className="space-y-1">
                      {filteredDepartments.map((dept) => (
                        <button
                          key={dept.id}
                          onClick={() => handleDepartmentSelect(dept)}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors flex items-center justify-between"
                        >
                          <span>{dept.name}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </Card>
                )}

                {/* 已選擇的科系 */}
                {(selectedDepartment || customDepartment) && (
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {customDepartment || selectedDepartment?.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDepartment(null)
                          setCustomDepartment('')
                          setDepartmentSearch('')
                        }}
                      >
                        重新選擇
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* 其他大學的自訂科系 */}
            {selectedUniversity?.id === 'other' && (
              <div className="space-y-3">
                <Label htmlFor="custom-dept" className="text-lg font-semibold">
                  科系名稱
                </Label>
                <Input
                  id="custom-dept"
                  type="text"
                  placeholder="輸入科系名稱"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            {/* 顯示門檻資訊 */}
            {selectedDepartment && selectedDepartment.id !== 'custom' && (
              <div className="mt-6">
                {loadingRequirements ? (
                  <Card className="p-4">
                    <div className="text-center text-muted-foreground">載入門檻資訊中...</div>
                  </Card>
                ) : requirements ? (
                  <Card className="p-4 border-primary/20">
                    <h3 className="font-semibold mb-3 text-lg">入學門檻</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {requirements.score_chinese && (
                        <div>
                          <span className="text-muted-foreground">國文：</span>
                          <span className="font-medium">{requirements.requirement_chinese} ({requirements.score_chinese}級分)</span>
                        </div>
                      )}
                      {requirements.score_english && (
                        <div>
                          <span className="text-muted-foreground">英文：</span>
                          <span className="font-medium">{requirements.requirement_english} ({requirements.score_english}級分)</span>
                        </div>
                      )}
                      {requirements.score_math_a && (
                        <div>
                          <span className="text-muted-foreground">數學A：</span>
                          <span className="font-medium">{requirements.requirement_math_a} ({requirements.score_math_a}級分)</span>
                        </div>
                      )}
                      {requirements.score_math_b && (
                        <div>
                          <span className="text-muted-foreground">數學B：</span>
                          <span className="font-medium">{requirements.requirement_math_b} ({requirements.score_math_b}級分)</span>
                        </div>
                      )}
                      {requirements.score_social && (
                        <div>
                          <span className="text-muted-foreground">社會：</span>
                          <span className="font-medium">{requirements.requirement_social} ({requirements.score_social}級分)</span>
                        </div>
                      )}
                      {requirements.score_natural && (
                        <div>
                          <span className="text-muted-foreground">自然：</span>
                          <span className="font-medium">{requirements.requirement_natural} ({requirements.score_natural}級分)</span>
                        </div>
                      )}
                      {requirements.score_english_listening && (
                        <div>
                          <span className="text-muted-foreground">英聽：</span>
                          <span className="font-medium">{requirements.score_english_listening}</span>
                        </div>
                      )}
                      {requirements.admission_quota && (
                        <div className="col-span-2 pt-2 border-t">
                          <span className="text-muted-foreground">招生名額：</span>
                          <span className="font-medium">{requirements.admission_quota} 人</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : null}
              </div>
            )}

            {/* 繼續按鈕 */}
            <div className="pt-4 space-y-3">
              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}
              <Button
                onClick={handleContinue}
                disabled={!canContinue || saving}
                className="w-full h-11 bg-black text-white hover:bg-black/90"
              >
                {saving ? '儲存中...' : '繼續'}
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={saving || skipLoading}
                className="w-full h-11 text-muted-foreground hover:text-foreground"
              >
                {skipLoading ? '處理中...' : '稍後再設定'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
