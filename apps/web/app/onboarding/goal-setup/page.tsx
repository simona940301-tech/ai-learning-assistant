'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, CheckCircle2 } from 'lucide-react'
import { universities, type University, type Department } from '@/lib/taiwan-universities'
import { supabaseBrowserClient } from '@/lib/supabase'

/**
 * STEP 4 — 選擇夢想學校與科系（Goal Priming）
 * Warm Yellow Theme
 */

// Generate years from current year to 2050
const currentYear = new Date().getFullYear()
const EXAM_YEARS = Array.from(
  { length: 2050 - currentYear + 1 },
  (_, i) => (currentYear + i).toString()
)

export default function OnboardingGoalSetupPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // Goal setup fields
  const [examYear, setExamYear] = useState<string>(EXAM_YEARS[1] || '2027')
  const [error, setError] = useState<string | null>(null)

  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('')
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [isExploring, setIsExploring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/onboarding')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchSession() {
      if (!user) return

      const { data: session } = await supabaseBrowserClient
        .from('onboarding_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        setSessionId(session.id)
      }
    }

    if (user && !authLoading) {
      fetchSession()
    }
  }, [user, authLoading])

  // 大學選項（排除"其他"）
  const universityOptions = useMemo(
    () => universities
      .filter(u => u.id !== 'other')
      .map(u => ({ value: u.id, label: u.name })),
    []
  )

  // 科系選項（根據選擇的大學）
  const departmentOptions = useMemo(() => {
    if (!selectedUniversity) return []
    return selectedUniversity.departments.map(d => ({
      value: d.id,
      label: d.name
    }))
  }, [selectedUniversity])

  const handleUniversitySelect = (universityId: string) => {
    const university = universities.find(u => u.id === universityId)
    if (university) {
      setSelectedUniversityId(universityId)
      setSelectedUniversity(university)
      setSelectedDepartmentId('')
      setSelectedDepartment(null)
      setIsExploring(false)
    }
  }

  const handleDepartmentSelect = (departmentId: string) => {
    if (!selectedUniversity) return
    const department = selectedUniversity.departments.find(d => d.id === departmentId)
    if (department) {
      setSelectedDepartmentId(departmentId)
      setSelectedDepartment(department)
    }
  }

  const handleContinue = async () => {
    if (!user) {
      router.push('/onboarding')
      return
    }

    setSaving(true)

    try {
      if (sessionId) {
        await supabaseBrowserClient
          .from('onboarding_sessions')
          .update({
            current_step: 2,
            exam_year: parseInt(examYear),
            target_university: isExploring ? null : selectedUniversity?.name,
            target_department: isExploring ? null : selectedDepartment?.name,
            is_exploring: isExploring,
          })
          .eq('id', sessionId)
      }

      router.push('/onboarding/intro')
    } catch (error) {
      console.error('[OnboardingGoalSetup] Failed to save:', error)
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFBF0]">
        <div className="text-center">
          <div className="mb-6 text-6xl">⏳</div>
          <p className="text-lg text-[#57534E]">載入中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Placeholder data for the new UI structure.
  const UNIVERSITIES = universityOptions.map(u => ({
    id: u.value,
    name: u.label,
    icon: '🎓'
  }));
  const DEPARTMENTS = departmentOptions.map(d => ({
    id: d.value,
    name: d.label
  }));

  const selectedUni = selectedUniversityId;
  const setSelectedUni = handleUniversitySelect;
  const selectedDept = selectedDepartmentId;
  const setSelectedDept = handleDepartmentSelect;

  return (
    <div className="min-h-screen bg-[#FFFBF0] px-4 py-6 overflow-hidden flex flex-col font-sans">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 mt-4"
        >
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-[#F5F5F4] shadow-sm">
            <GraduationCap className="h-8 w-8 text-[#FFB01A]" strokeWidth={1.5} />
          </div>
          <h1 className="text-[32px] leading-tight font-semibold text-[#1C1917] tracking-tight font-display">
            你的目標學校
          </h1>
          <p className="mt-3 text-[16px] text-[#57534E] font-normal">
            選擇你想考取的大學與科系，我們會為你分析錄取機率
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border border-[#F5F5F4] p-6 md:p-8 shadow-sm space-y-6"
        >
          {/* University Selection */}
          <div className="space-y-4">
            <Label className="text-[12px] uppercase tracking-[0.2em] text-[#A8A29E] font-medium">目標大學</Label>
            <div className="grid grid-cols-1 gap-3">
              {UNIVERSITIES.map((uni) => (
                <button
                  key={uni.id}
                  onClick={() => setSelectedUni(uni.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 ${selectedUni === uni.id
                      ? 'bg-[#FFFBF0] border-[#FFB01A] shadow-[0_0_20px_rgba(255,176,26,0.1)]'
                      : 'bg-[#FAFAF9] border-[#F5F5F4] hover:border-[#E7E5E4] hover:bg-[#F5F5F4]'
                    }`}
                >
                  <div className={`text-2xl p-2 rounded-xl ${selectedUni === uni.id ? 'bg-[#FFB01A]/10' : 'bg-white'
                    }`}>
                    {uni.icon}
                  </div>
                  <span className={`text-[16px] font-bold ${selectedUni === uni.id ? 'text-[#1C1917]' : 'text-[#57534E]'
                    }`}>
                    {uni.name}
                  </span>
                  {selectedUni === uni.id && (
                    <div className="ml-auto text-[#FFB01A]">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Department Selection */}
          {selectedUni && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4 border-t border-[#F5F5F4]"
            >
              <Label className="text-[12px] uppercase tracking-[0.2em] text-[#A8A29E] font-medium">目標科系</Label>
              <div className="grid grid-cols-2 gap-3">
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDept(dept.id)}
                    className={`p-3 rounded-xl border text-center transition-all duration-300 ${selectedDept === dept.id
                        ? 'bg-[#FFB01A] text-white border-[#FFB01A] shadow-md'
                        : 'bg-[#FAFAF9] border-[#F5F5F4] text-[#57534E] hover:bg-[#F5F5F4]'
                      }`}
                  >
                    <span className="text-[14px] font-medium">{dept.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <Button
            onClick={handleContinue}
            disabled={!selectedUni || !selectedDept || saving}
            className="w-full h-14 text-[16px] font-bold bg-[#FFB01A] hover:bg-[#E69500] text-white rounded-xl shadow-[0_4px_14px_rgba(255,176,26,0.4)] hover:shadow-[0_6px_20px_rgba(255,176,26,0.6)] transition-all duration-300 disabled:opacity-50"
          >
            {saving ? '儲存中...' : '下一步'}
          </Button>

          {/* Progress Indicator */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#E7E5E4]" />
            <div className="h-1.5 w-1.5 rounded-full bg-[#E7E5E4]" />
            <div className="h-1.5 w-6 rounded-full bg-[#FFB01A]" />
            <div className="h-1.5 w-1.5 rounded-full bg-[#E7E5E4]" />
          </div>
          <p className="mt-3 text-[12px] text-center text-[#A8A29E]">
            Step 3/4 · 目標學校
          </p>
        </motion.div>
      </div>
    </div>
  )
}
