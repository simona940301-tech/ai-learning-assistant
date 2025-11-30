'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, Image as ImageIcon, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ImportResult {
  success: boolean
  imported?: number
  total?: number
  errors?: number
  errorDetails?: Array<{ row: number; error: string }>
  error?: string
}

export default function ImportDepartmentsPage() {
  // 檔案相關狀態
  const [file, setFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [ocrText, setOcrText] = useState<string>('')
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)

  // UI 狀態
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImageDragging, setIsImageDragging] = useState(false)

  // 表單狀態
  const [universityName, setUniversityName] = useState<string>('')
  const [departmentName, setDepartmentName] = useState<string>('')

  // CSV 檔案處理
  const handleFileSelect = useCallback((files: FileList) => {
    if (files.length > 0) {
      const selectedFile = files[0]
      if (!selectedFile.name.endsWith('.csv')) {
        setResult({
          success: false,
          error: '請上傳 CSV 檔案',
        })
        return
      }
      setFile(selectedFile)
      setImageFile(null) // 清除圖片檔案
      setOcrText('')
      setResult(null)
    }
  }, [])

  // 圖片檔案處理和 OCR
  const handleImageSelect = useCallback(async (files: FileList) => {
    if (files.length > 0) {
      const selectedFile = files[0]
      if (!selectedFile.type.startsWith('image/')) {
        setResult({
          success: false,
          error: '請上傳圖片檔案',
        })
        return
      }

      setIsOcrProcessing(true)
      setResult(null)

      try {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const response = await fetch('/api/internal/ocr', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (data.success) {
          setOcrText(data.text)
          setImageFile(selectedFile)
          setFile(null) // 清除 CSV 檔案
        } else {
          setResult({
            success: false,
            error: data.error || 'OCR 處理失敗',
          })
        }
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : 'OCR 處理失敗',
        })
      } finally {
        setIsOcrProcessing(false)
      }
    }
  }, [])

  // CSV 拖拽處理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  // 圖片拖拽處理
  const handleImageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsImageDragging(true)
  }, [])

  const handleImageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsImageDragging(false)
  }, [])

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsImageDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleImageSelect(e.dataTransfer.files)
    }
  }, [handleImageSelect])

  const handleImport = useCallback(async () => {
    // 檢查是否有檔案或 OCR 文字
    if (!file && !ocrText.trim()) {
      setResult({
        success: false,
        error: '請先上傳 CSV 檔案或圖片進行 OCR 辨識',
      })
      return
    }

    // 如果有 OCR 文字但沒有填寫必要資訊，則要求填寫
    if (ocrText.trim() && (!universityName.trim() || !departmentName.trim())) {
      setResult({
        success: false,
        error: '使用 OCR 時必須填寫大學名稱和科系名稱',
      })
      return
    }

    setIsImporting(true)
    setResult(null)

    try {
      let csvContent = ''

      if (ocrText) {
        // 從 OCR 文字和表單資料建立 CSV
        csvContent = `university_name,department_name,department_code,admission_quota,gender_requirement,requirement_chinese,requirement_english,requirement_math_a,requirement_math_b,requirement_social,requirement_natural,requirement_english_listening,score_chinese,score_english,score_math_a,score_math_b,score_social,score_natural,score_english_listening\n`
        csvContent += `"${universityName.replace(/"/g, '""')}","${departmentName.replace(/"/g, '""')}","","","","","","","","","","","","","","","","","",""\n`
      } else if (file) {
        // 使用上傳的 CSV 檔案
        const text = await file.text()
        csvContent = text
      }

      // 建立 CSV blob 並上傳
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const csvFile = new File([blob], 'departments.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', csvFile)

      const response = await fetch('/api/internal/departments/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '匯入失敗',
      })
    } finally {
      setIsImporting(false)
    }
  }, [file, ocrText, universityName, departmentName])

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">匯入校系資料</h1>
        <p className="text-muted-foreground">
          上傳科系招生標準圖片進行 OCR 辨識，或直接上傳 CSV 檔案匯入資料
        </p>
      </div>

      {/* 科系基本資訊 - 當使用 OCR 時需要 */}
      <Card>
        <CardHeader>
          <CardTitle>科系基本資訊</CardTitle>
          <CardDescription>使用 OCR 辨識時需要填寫這些基本資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>大學名稱 *</Label>
              <Input
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                placeholder="例如：國立台灣大學"
              />
            </div>
            <div className="space-y-2">
              <Label>科系名稱 *</Label>
              <Input
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="例如：電機工程學系"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle>CSV 檔案格式說明</CardTitle>
          <CardDescription>請確保 CSV 檔案包含以下欄位</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">必填欄位：</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li><code className="bg-muted px-1 rounded">university_name</code> - 大學名稱</li>
              <li><code className="bg-muted px-1 rounded">department_name</code> - 科系名稱</li>
            </ul>
            <p className="font-semibold mt-4">選填欄位：</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li><code className="bg-muted px-1 rounded">department_code</code> - 校系代碼</li>
              <li><code className="bg-muted px-1 rounded">admission_quota</code> - 招生名額</li>
              <li><code className="bg-muted px-1 rounded">gender_requirement</code> - 性別要求（無/男/女）</li>
              <li><code className="bg-muted px-1 rounded">requirement_chinese</code> - 國文檢定標準</li>
              <li><code className="bg-muted px-1 rounded">requirement_english</code> - 英文檢定標準</li>
              <li><code className="bg-muted px-1 rounded">requirement_math_a</code> - 數學A檢定標準</li>
              <li><code className="bg-muted px-1 rounded">requirement_math_b</code> - 數學B檢定標準</li>
              <li><code className="bg-muted px-1 rounded">requirement_social</code> - 社會檢定標準</li>
              <li><code className="bg-muted px-1 rounded">requirement_natural</code> - 自然檢定標準</li>
              <li><code className="bg-muted px-1 rounded">requirement_english_listening</code> - 英聽檢定標準</li>
              <li><code className="bg-muted px-1 rounded">score_chinese</code> - 國文分數</li>
              <li><code className="bg-muted px-1 rounded">score_english</code> - 英文分數</li>
              <li><code className="bg-muted px-1 rounded">score_math_a</code> - 數學A分數</li>
              <li><code className="bg-muted px-1 rounded">score_math_b</code> - 數學B分數</li>
              <li><code className="bg-muted px-1 rounded">score_social</code> - 社會分數</li>
              <li><code className="bg-muted px-1 rounded">score_natural</code> - 自然分數</li>
              <li><code className="bg-muted px-1 rounded">score_english_listening</code> - 英聽分數</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Image Upload for OCR */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isImageDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleImageDragOver}
        onDragLeave={handleImageDragLeave}
        onDrop={handleImageDrop}
      >
        <CardHeader>
          <CardTitle>上傳招生標準圖片 (OCR)</CardTitle>
          <CardDescription>上傳科系招生標準的圖片，系統會自動辨識文字內容</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="rounded-full bg-muted p-4">
              {isOcrProcessing ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                拖放圖片或點擊選擇
              </p>
              <Button
                onClick={() => document.getElementById('image-input')?.click()}
                disabled={isOcrProcessing}
                variant="outline"
              >
                {isOcrProcessing ? '處理中...' : '選擇圖片'}
              </Button>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageSelect(e.target.files)
                  }
                }}
                className="hidden"
                disabled={isOcrProcessing}
              />
            </div>
            {ocrText && (
              <div className="mt-4 w-full space-y-2">
                <Label>OCR 辨識結果</Label>
                <textarea
                  readOnly
                  value={ocrText}
                  className="w-full min-h-[200px] p-3 border rounded-lg bg-muted/50 text-sm resize-none"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardHeader>
          <CardTitle>上傳 CSV 檔案</CardTitle>
          <CardDescription>拖放檔案或點擊選擇 CSV 檔案</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                拖放 CSV 檔案或點擊選擇
              </p>
              <Button
                onClick={() => document.getElementById('csv-input')?.click()}
                disabled={isImporting}
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                選擇 CSV 檔案
              </Button>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files)
                  }
                }}
                className="hidden"
                disabled={isImporting}
              />
            </div>
            {file && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">已選擇檔案：</p>
                <p className="text-sm text-muted-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleImport}
          disabled={isImporting || (!file && !ocrText.trim())}
          size="lg"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              匯入中...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              開始匯入
            </>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="pt-6">
            {result.success ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-semibold">匯入成功！</p>
                  <p className="text-sm">
                    成功匯入 {result.imported} / {result.total} 筆校系資料
                    {result.errors && result.errors > 0 && `，${result.errors} 筆錯誤`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">匯入失敗</p>
                  <p className="text-sm">{result.error}</p>
                  {result.errorDetails && result.errorDetails.length > 0 && (
                    <div className="mt-2 text-xs space-y-1">
                      {result.errorDetails.slice(0, 10).map((err, idx) => (
                        <p key={idx}>第 {err.row} 行：{err.error}</p>
                      ))}
                      {result.errorDetails.length > 10 && (
                        <p className="text-muted-foreground">
                          還有 {result.errorDetails.length - 10} 個錯誤...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

