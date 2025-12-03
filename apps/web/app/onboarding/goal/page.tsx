'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Search, ChevronDown, X } from 'lucide-react'
import { universities, searchUniversities, searchDepartments, type University, type Department } from '@/lib/taiwan-universities'
import { supabaseBrowserClient } from '@/lib/supabase'

/**
 * STEP 1 — 目標設定 (極簡單頁表單)
 */

const GRADES = [
  { value: '高一', label: '高一' },
  { value: '高二', label: '高二' },
  { value: '高三', label: '高三' },
]

export default function OnboardingGoalPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // University & Department
  const [universitySearch, setUniversitySearch] = useState('')
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [customDepartment, setCustomDepartment] = useState('')
  const [isExploring, setIsExploring] = useState(false)
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(true)
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false)

  // Grade & Proficiency
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [mockExamLevel, setMockExamLevel] = useState(8)

  // UI State
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    // 🎯 修復：不等待 authLoading，允許匿名訪問
    // 如果已登入，檢查 session（但不阻塞頁面渲染）
    if (user && !authLoading) {
      const checkSession = async () => {
        const { data: sessionData, error: sessionError } = await supabaseBrowserClient.auth.getSession()
        if (sessionError || !sessionData?.session) {
          console.warn('[OnboardingGoal] No valid session, but allowing anonymous mode')
          // 不 redirect，允許匿名模式繼續
        }
      }
      checkSession()
    }
    // 如果未登入，允許匿名模式，不 redirect
  }, [user, authLoading, router])

  useEffect(() => {
    // 🎯 修復：只在有 user 且認證載入完成時才創建 session，但不阻塞頁面渲染
    async function fetchOrCreateSession() {
      if (!user) return
      try {
        const { data: existingSession } = await supabaseBrowserClient
          .from('onboarding_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingSession) {
          setSessionId(existingSession.id)
        } else {
          const { data: newSession } = await supabaseBrowserClient
            .from('onboarding_sessions')
            .insert({
              user_id: user.id,
              status: 'in_progress',
              current_step: 1,
            })
            .select('id')
            .single()

          if (newSession) {
            setSessionId(newSession.id)
          }
        }
      } catch (error) {
        console.error('[OnboardingGoal] Failed to fetch/create session:', error)
        // 🎯 允許匿名模式繼續，即使 session 創建失敗
      }
    }

    // 只在有 user 且認證載入完成時才創建 session，但不阻塞渲染
    if (user && !authLoading) {
      fetchOrCreateSession()
    }
    // 如果沒有 user，允許匿名模式繼續
  }, [user, authLoading])

  const filteredUniversities = useMemo(
    () => (universitySearch ? searchUniversities(universitySearch) : universities.slice(0, 10)),
    [universitySearch],
  )

  const filteredDepartments = useMemo(() => {
    if (!selectedUniversity) return []
    return departmentSearch
      ? searchDepartments(selectedUniversity.id, departmentSearch)
      : selectedUniversity.departments.slice(0, 10)
  }, [selectedUniversity, departmentSearch])

  const handleUniversitySelect = (university: University) => {
    setSelectedUniversity(university)
    setSelectedDepartment(null)
    setDepartmentSearch('')
    setCustomDepartment('')
    setIsExploring(false)
    setShowUniversityDropdown(false)
    setShowDepartmentDropdown(true)
    setFormError(null)
  }

  const handleDepartmentSelect = (department: Department) => {
    setSelectedDepartment(department)
    setCustomDepartment('')
    setShowDepartmentDropdown(false)
    setFormError(null)
  }

  const handleExploring = () => {
    setIsExploring(true)
    setSelectedUniversity(null)
    setSelectedDepartment(null)
    setShowUniversityDropdown(false)
    setShowDepartmentDropdown(false)
    setFormError(null)
  }

  const handleContinue = async () => {
    // 允許匿名模式：將資料儲存到 localStorage
    const goalData = {
      target_university: isExploring ? '摸索中' : (selectedUniversity?.name || ''),
      target_department: isExploring ? '摸索中' : (customDepartment.trim() || selectedDepartment?.name || ''),
      is_exploring: isExploring,
      current_grade: selectedGrade,
      mock_exam_level: mockExamLevel,
    }

    if (!user) {
      // 匿名模式：儲存到 localStorage
      const stored = localStorage.getItem('onboarding_anonymous_data')
      let anonymousData: any = {}
      
      if (stored) {
        try {
          anonymousData = JSON.parse(stored)
        } catch (e) {
          console.error('[OnboardingGoal] Failed to parse stored data:', e)
        }
      }
      
      anonymousData.goalData = goalData
      localStorage.setItem('onboarding_anonymous_data', JSON.stringify(anonymousData))
      
      // 匿名模式：導向 avatar 頁面
      router.push('/onboarding/avatar')
      return
    }

    if (!selectedGrade) {
      setFormError('請選擇年級')
      return
    }

    if (!isExploring && !selectedUniversity) {
      setFormError('請選擇大學或點選「我還在摸索方向」')
      return
    }
    if (!isExploring && !selectedDepartment && !customDepartment) {
      setFormError('請選擇或輸入科系')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      if (sessionId) {
        await supabaseBrowserClient
          .from('onboarding_sessions')
          .update({
            target_university: isExploring ? '摸索中' : (selectedUniversity?.name || ''),
            target_department: isExploring ? '摸索中' : (customDepartment.trim() || selectedDepartment?.name || ''),
            is_exploring: isExploring,
            current_grade: selectedGrade,
            mock_exam_level: mockExamLevel,
            current_step: 1,
          })
          .eq('id', sessionId)
      }

      await supabaseBrowserClient
        .from('profiles')
        .update({
          target_university: isExploring ? '摸索中' : (selectedUniversity?.name || ''),
          target_department: isExploring ? '摸索中' : (customDepartment.trim() || selectedDepartment?.name || ''),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      // 已登入模式：導向 avatar 頁面
      router.push('/onboarding/avatar')
    } catch (error) {
      console.error('[OnboardingGoal] Failed to save:', error)
      setFormError('儲存失敗,請稍後再試')
      setSaving(false)
    }
  }

  const getLevelLabel = (level: number): string => {
    if (level <= 4) return '基礎'
    if (level <= 9) return '中等'
    if (level <= 12) return '良好'
    return '優秀'
  }

  // 🎯 修復：onboarding 頁面不應該等待認證狀態，允許匿名訪問
  // 即使 authLoading 為 true，也顯示表單內容，讓用戶可以先開始填寫
  // if (authLoading) {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center bg-background">
  //       <div className="text-sm text-muted-foreground">載入中...</div>
  //     </div>
  //   )
  // }

  // 允許匿名訪問，不需要檢查 user

  const canContinue = selectedGrade && (isExploring || (selectedUniversity && (selectedDepartment || customDepartment)))

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="mb-2 text-2xl font-medium text-foreground">
            快速設定
          </h1>
          <p className="text-sm text-muted-foreground">
            30秒完成
          </p>
        </motion.div>

        {/* Form */}
        <div className="space-y-8">
          {/* 1. 目標 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">
              理想大學和科系
            </label>

            <div className="space-y-2">
              {/* University */}
              <div className="relative">
                <button
                  onClick={() => setShowUniversityDropdown(!showUniversityDropdown)}
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      {selectedUniversity?.name || '選擇大學'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showUniversityDropdown ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {showUniversityDropdown && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="搜尋..."
                          value={universitySearch}
                          onChange={(e) => setUniversitySearch(e.target.value)}
                          className="h-9 border-border pl-9 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredUniversities.map((uni) => (
                        <button
                          key={uni.id}
                          onClick={() => handleUniversitySelect(uni)}
                          className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          {uni.name}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border p-2">
                      <button
                        onClick={handleExploring}
                        className="w-full rounded px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
                      >
                        我還在摸索方向
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Department */}
              {selectedUniversity && (
                <div className="relative">
                  {!selectedDepartment && !customDepartment ? (
                    <>
                      <button
                        onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                        className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">選擇科系</span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showDepartmentDropdown ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {showDepartmentDropdown && (
                        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                          <div className="p-2">
                            <div className="relative mb-2">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="搜尋科系..."
                                value={departmentSearch}
                                onChange={(e) => setDepartmentSearch(e.target.value)}
                                className="h-9 border-border pl-9 text-sm"
                                autoFocus
                              />
                            </div>
                            <Input
                              type="text"
                              placeholder="或輸入自訂科系"
                              value={customDepartment}
                              onChange={(e) => {
                                setCustomDepartment(e.target.value)
                                if (e.target.value) setShowDepartmentDropdown(false)
                              }}
                              className="h-9 border-border text-sm"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredDepartments.map((dept) => (
                              <button
                                key={dept.id}
                                onClick={() => handleDepartmentSelect(dept)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                              >
                                {dept.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-4 py-3">
                      <span className="text-sm text-foreground">
                        {customDepartment || selectedDepartment?.name}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedDepartment(null)
                          setCustomDepartment('')
                          setShowDepartmentDropdown(true)
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. 年級 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">
              年級
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GRADES.map((grade) => (
                <button
                  key={grade.value}
                  onClick={() => setSelectedGrade(grade.value)}
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                    selectedGrade === grade.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-foreground hover:border-primary'
                  }`}
                >
                  {grade.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 模考程度 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">
              模考程度
            </label>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 text-center">
                <div className="text-4xl font-bold text-foreground">{mockExamLevel}</div>
                <div className="mt-1 text-sm text-muted-foreground">{getLevelLabel(mockExamLevel)}</div>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={mockExamLevel}
                onChange={(e) => setMockExamLevel(parseInt(e.target.value))}
                className="w-full"
                style={{
                  accentColor: 'hsl(var(--foreground))'
                }}
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>15</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {formError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleContinue}
            disabled={!canContinue || saving}
            className="h-12 w-full rounded-lg bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {saving ? '儲存中...' : '下一步'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            步驟 1 / 3
          </p>
        </div>
      </div>
    </div>
  )
}
