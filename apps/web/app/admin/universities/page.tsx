'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { Plus, Trash2, Save, Upload, Download, Building2, GraduationCap, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { universities, type University, type Department } from '@/lib/taiwan-universities'

/**
 * 大學和科系管理頁面
 * 用於匯入和管理大學科系資料
 */
export default function AdminUniversitiesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [localUniversities, setLocalUniversities] = useState<University[]>([])
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [newUniversityName, setNewUniversityName] = useState('')
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [saving, setSaving] = useState(false)
  const [exportData, setExportData] = useState<string>('')
  
  // OCR 相關狀態
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [ocrText, setOcrText] = useState<string>('')
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrPreview, setOcrPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // 載入現有的大學資料（排除"其他"）
    setLocalUniversities(universities.filter(u => u.id !== 'other'))
  }, [])

  const handleAddUniversity = () => {
    if (!newUniversityName.trim()) return

    const newId = `uni_${Date.now()}`
    const newUniversity: University = {
      id: newId,
      name: newUniversityName.trim(),
      departments: [],
    }

    setLocalUniversities([...localUniversities, newUniversity])
    setNewUniversityName('')
  }

  const handleDeleteUniversity = (universityId: string) => {
    if (confirm('確定要刪除這所大學嗎？這將同時刪除所有相關科系。')) {
      setLocalUniversities(localUniversities.filter(u => u.id !== universityId))
      if (selectedUniversity?.id === universityId) {
        setSelectedUniversity(null)
      }
    }
  }

  const handleAddDepartment = () => {
    if (!selectedUniversity || !newDepartmentName.trim()) return

    const newId = `dept_${Date.now()}`
    const newDepartment: Department = {
      id: newId,
      name: newDepartmentName.trim(),
    }

    const updatedUniversities = localUniversities.map(uni =>
      uni.id === selectedUniversity.id
        ? { ...uni, departments: [...uni.departments, newDepartment] }
        : uni
    )

    setLocalUniversities(updatedUniversities)
    setSelectedUniversity(updatedUniversities.find(u => u.id === selectedUniversity.id) || null)
    setNewDepartmentName('')
  }

  const handleDeleteDepartment = (departmentId: string) => {
    if (!selectedUniversity) return
    if (confirm('確定要刪除這個科系嗎？')) {
      const updatedUniversities = localUniversities.map(uni =>
        uni.id === selectedUniversity.id
          ? { ...uni, departments: uni.departments.filter(d => d.id !== departmentId) }
          : uni
      )

      setLocalUniversities(updatedUniversities)
      setSelectedUniversity(updatedUniversities.find(u => u.id === selectedUniversity.id) || null)
    }
  }

  const handleExport = () => {
    const data = JSON.stringify(localUniversities, null, 2)
    setExportData(data)
    
    // 下載檔案
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `universities_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as University[]
        if (Array.isArray(imported)) {
          setLocalUniversities(imported)
          alert('匯入成功！')
        } else {
          alert('匯入失敗：檔案格式不正確')
        }
      } catch (error) {
        alert('匯入失敗：無法解析檔案')
      }
    }
    reader.readAsText(file)
  }

  // 處理圖片上傳和 OCR
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setOcrError('請上傳圖片檔案')
      return
    }

    setImageFile(file)
    setOcrText('')
    setOcrError(null)
    setIsOcrProcessing(true)

    // 預覽圖片
    const reader = new FileReader()
    reader.onload = (e) => {
      setOcrPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/universities/ocr', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setOcrText(data.text || '')
        
        // 如果有解析結果，自動填入資料
        if (data.parsed) {
          const parsed = data.parsed
          
          // 處理大學和科系資料
          if (parsed.universities && Array.isArray(parsed.universities)) {
            const newUniversities: University[] = []
            let hasUpdatedExisting = false
            
            // 先處理現有大學的科系更新
            const updatedUniversities = localUniversities.map(uni => {
              const matchedUni = parsed.universities.find((p: any) => p.name === uni.name)
              if (matchedUni && matchedUni.departments && matchedUni.departments.length > 0) {
                const existingDeptNames = uni.departments.map(d => d.name)
                const newDepartments = matchedUni.departments
                  .filter((deptName: string) => !existingDeptNames.includes(deptName))
                  .map((deptName: string) => ({
                    id: `dept_${Date.now()}_${Math.random()}`,
                    name: deptName,
                  }))
                
                if (newDepartments.length > 0) {
                  hasUpdatedExisting = true
                  return { ...uni, departments: [...uni.departments, ...newDepartments] }
                }
              }
              return uni
            })
            
            // 處理新大學
            parsed.universities.forEach((uni: any) => {
              if (uni.name && !localUniversities.find(u => u.name === uni.name)) {
                const departments = (uni.departments || []).map((deptName: string) => ({
                  id: `dept_${Date.now()}_${Math.random()}`,
                  name: deptName,
                }))
                
                newUniversities.push({
                  id: `uni_${Date.now()}_${Math.random()}`,
                  name: uni.name,
                  departments,
                })
              }
            })
            
            // 處理獨立的科系列表（沒有對應大學）
            if (parsed.departments && Array.isArray(parsed.departments) && parsed.departments.length > 0) {
              // 如果沒有選中的大學，提示用戶選擇
              if (!selectedUniversity) {
                alert('偵測到科系列表，請先選擇一所大學，或手動新增大學後再處理科系。')
              } else {
                // 將科系加入選中的大學
                const existingDeptNames = selectedUniversity.departments.map(d => d.name)
                const newDepartments = parsed.departments
                  .filter((deptName: string) => !existingDeptNames.includes(deptName))
                  .map((deptName: string) => ({
                    id: `dept_${Date.now()}_${Math.random()}`,
                    name: deptName,
                  }))
                
                if (newDepartments.length > 0) {
                  const finalUpdated = updatedUniversities.map(uni =>
                    uni.id === selectedUniversity.id
                      ? { ...uni, departments: [...uni.departments, ...newDepartments] }
                      : uni
                  )
                  setLocalUniversities(finalUpdated)
                  setSelectedUniversity(finalUpdated.find(u => u.id === selectedUniversity.id) || null)
                  alert(`成功新增 ${newDepartments.length} 個科系到 ${selectedUniversity.name}！`)
                  return
                }
              }
            }
            
            // 更新大學列表
            if (newUniversities.length > 0 || hasUpdatedExisting) {
              const finalList = [...updatedUniversities, ...newUniversities]
              setLocalUniversities(finalList)
              
              if (newUniversities.length > 0 && hasUpdatedExisting) {
                alert(`成功從 OCR 識別出 ${newUniversities.length} 所新大學，並更新了現有大學的科系資料！`)
              } else if (newUniversities.length > 0) {
                alert(`成功從 OCR 識別出 ${newUniversities.length} 所大學！`)
              } else if (hasUpdatedExisting) {
                alert('已更新現有大學的科系資料！')
              }
            }
          }
        }
      } else {
        setOcrError(data.error || 'OCR 處理失敗')
      }
    } catch (error) {
      console.error('OCR error:', error)
      setOcrError(error instanceof Error ? error.message : 'OCR 處理失敗')
    } finally {
      setIsOcrProcessing(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 這裡應該調用API來保存資料
      // 目前只是顯示提示
      alert('資料已準備好匯出。請使用「匯出JSON」功能下載資料，然後手動更新 taiwan-universities.ts 檔案。')
    } catch (error) {
      console.error('Save error:', error)
      alert('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-6 text-6xl">⏳</div>
          <p className="text-lg text-muted-foreground">載入中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0A0B0E] px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[32px] font-semibold text-white mb-2">大學和科系管理</h1>
              <p className="text-white/40">管理大學和科系資料，支援匯入和匯出</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isOcrProcessing}
                />
                <Button
                  variant="outline"
                  className="bg-[#111317] border-white/10 text-white hover:bg-[#1A1D24]"
                  disabled={isOcrProcessing}
                >
                  {isOcrProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      OCR處理中...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      上傳截圖OCR
                    </>
                  )}
                </Button>
              </label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="bg-[#111317] border-white/10 text-white hover:bg-[#1A1D24]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  匯入JSON
                </Button>
              </label>
              <Button
                onClick={handleExport}
                className="bg-[#4A8BFF] hover:bg-[#3A7BEF] text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                匯出JSON
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#4A8BFF] hover:bg-[#3A7BEF] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? '儲存中...' : '儲存'}
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：大學列表 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#111317] rounded-2xl border border-white/10 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#4A8BFF]" />
                大學列表 ({localUniversities.length})
              </h2>
            </div>

            {/* 新增大學 */}
            <div className="flex gap-2 mb-4">
              <Input
                type="text"
                placeholder="輸入大學名稱..."
                value={newUniversityName}
                onChange={(e) => setNewUniversityName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddUniversity()}
                className="bg-[#1A1D24] border-white/10 text-white placeholder:text-white/30"
              />
              <Button
                onClick={handleAddUniversity}
                className="bg-[#4A8BFF] hover:bg-[#3A7BEF] text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* 大學列表 */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {localUniversities.map((uni) => (
                <button
                  key={uni.id}
                  onClick={() => setSelectedUniversity(uni)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedUniversity?.id === uni.id
                      ? 'bg-[#4A8BFF]/20 border-[#4A8BFF] text-white'
                      : 'bg-[#1A1D24] border-white/10 text-white/90 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{uni.name}</p>
                      <p className="text-sm text-white/40 mt-1">
                        {uni.departments.length} 個科系
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteUniversity(uni.id)
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* 右側：科系管理 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#111317] rounded-2xl border border-white/10 p-6"
          >
            {selectedUniversity ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-[#4A8BFF]" />
                    {selectedUniversity.name} - 科系管理
                  </h2>
                </div>

                {/* 新增科系 */}
                <div className="flex gap-2 mb-4">
                  <Input
                    type="text"
                    placeholder="輸入科系名稱..."
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
                    className="bg-[#1A1D24] border-white/10 text-white placeholder:text-white/30"
                  />
                  <Button
                    onClick={handleAddDepartment}
                    className="bg-[#4A8BFF] hover:bg-[#3A7BEF] text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* 科系列表 */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {selectedUniversity.departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-4 bg-[#1A1D24] rounded-xl border border-white/10"
                    >
                      <p className="text-white/90">{dept.name}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDepartment(dept.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {selectedUniversity.departments.length === 0 && (
                    <p className="text-center text-white/40 py-8">尚無科系資料</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <p className="text-white/40">請選擇一所大學來管理科系</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* OCR 結果顯示 */}
        {(ocrPreview || ocrText || ocrError) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-[#111317] rounded-2xl border border-white/10 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">OCR 識別結果</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOcrPreview(null)
                  setOcrText('')
                  setOcrError(null)
                  setImageFile(null)
                }}
                className="text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {ocrError && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{ocrError}</p>
              </div>
            )}
            
            {ocrPreview && (
              <div className="mb-4">
                <img
                  src={ocrPreview}
                  alt="OCR preview"
                  className="max-w-full h-auto rounded-xl border border-white/10"
                />
              </div>
            )}
            
            {ocrText && (
              <div>
                <Label className="text-white/60 mb-2 block">識別文字</Label>
                <pre className="bg-[#1A1D24] rounded-xl p-4 overflow-auto text-sm text-white/80 font-mono max-h-64">
                  {ocrText}
                </pre>
              </div>
            )}
          </motion.div>
        )}

        {/* 匯出資料預覽 */}
        {exportData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-[#111317] rounded-2xl border border-white/10 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">匯出資料預覽</h3>
            <pre className="bg-[#1A1D24] rounded-xl p-4 overflow-auto text-sm text-white/80 font-mono">
              {exportData}
            </pre>
          </motion.div>
        )}
      </div>
    </div>
  )
}

