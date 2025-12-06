'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, ImageIcon, Loader2, CheckCircle2, XCircle, Download } from 'lucide-react'

interface DepartmentData {
  department_code?: string
  department_name: string
  gender_requirement?: string
  admission_quota?: number
  requirement_chinese?: string
  requirement_english?: string
  requirement_math_a?: string
  requirement_math_b?: string
  requirement_social?: string
  requirement_natural?: string
  requirement_english_listening?: string
}

interface OCRResult {
  success: boolean
  data?: {
    university_name: string | null
    departments: DepartmentData[]
  }
  totalDepartments?: number
  error?: string
}

interface ImportResult {
  success: boolean
  imported?: number
  total?: number
  errors?: number
  error?: string
}

export default function ImportDepartmentsSmartPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 圖片上傳 + OCR 辨識
  const handleImageSelect = useCallback(async (files: FileList) => {
    if (files.length === 0) return

    const selectedFile = files[0]
    if (!selectedFile.type.startsWith('image/')) {
      setOcrResult({
        success: false,
        error: '請上傳圖片檔案',
      })
      return
    }

    setFile(selectedFile)
    setIsOcrProcessing(true)
    setOcrResult(null)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/admin/departments/ocr-smart', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      setOcrResult(data)
    } catch (error) {
      setOcrResult({
        success: false,
        error: error instanceof Error ? error.message : 'OCR 處理失敗',
      })
    } finally {
      setIsOcrProcessing(false)
    }
  }, [])

  // 匯入到資料庫
  const handleImport = useCallback(async () => {
    if (!ocrResult?.data?.departments) {
      alert('沒有可匯入的資料')
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const universityName = ocrResult.data.university_name || '未知大學'

      // 建立 CSV 格式
      const headers = [
        'university_name',
        'department_name',
        'department_code',
        'admission_quota',
        'gender_requirement',
        'requirement_chinese',
        'requirement_english',
        'requirement_math_a',
        'requirement_math_b',
        'requirement_social',
        'requirement_natural',
        'requirement_english_listening',
      ]

      let csvContent = headers.join(',') + '\n'

      ocrResult.data.departments.forEach((dept) => {
        const row = [
          `"${universityName}"`,
          `"${dept.department_name}"`,
          dept.department_code || '',
          dept.admission_quota || '',
          dept.gender_requirement || '',
          dept.requirement_chinese || '',
          dept.requirement_english || '',
          dept.requirement_math_a || '',
          dept.requirement_math_b || '',
          dept.requirement_social || '',
          dept.requirement_natural || '',
          dept.requirement_english_listening || '',
        ]
        csvContent += row.join(',') + '\n'
      })

      // 上傳到 import API
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const csvFile = new File([blob], 'departments.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', csvFile)

      const response = await fetch('/api/internal/departments/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      setImportResult(data)
    } catch (error) {
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : '匯入失敗',
      })
    } finally {
      setIsImporting(false)
    }
  }, [ocrResult])

  // 拖拽處理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        handleImageSelect(e.dataTransfer.files)
      }
    },
    [handleImageSelect]
  )

  // 下載 CSV 範本
  const downloadSample = () => {
    const sampleData = `大學名稱,科系名稱,校系代碼,招生名額,性別要求,國文,英文,數學A,數學B,社會,自然,英聽
國立台灣大學,電機工程學系,004102,63,無,均標,均標,前標,--,--,前標,--
國立台灣大學,資訊工程學系,004092,18,無,均標,均標,前標,--,--,前標,--
國立台灣大學,機械工程學系,004112,11,無,均標,頂標,前標,--,--,前標,A`

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'sample_departments.csv'
    link.click()
  }

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">智慧匯入校系標準</h1>
        <p className="text-muted-foreground">
          上傳校系標準表格圖片,AI 會自動辨識並轉換為可用的資料格式
        </p>
      </div>

      {/* 下載範本 */}
      <Card>
        <CardHeader>
          <CardTitle>CSV 範本下載</CardTitle>
          <CardDescription>如果要手動編輯,可以下載此範本</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadSample} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            下載 CSV 範本
          </Button>
        </CardContent>
      </Card>

      {/* 圖片上傳區 */}
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
          <CardTitle>步驟 1: 上傳校系標準圖片</CardTitle>
          <CardDescription>支援 JPG、PNG 等常見圖片格式</CardDescription>
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
                {file ? `已選擇: ${file.name}` : '拖放圖片或點擊選擇'}
              </p>
              <Button
                onClick={() => document.getElementById('image-input')?.click()}
                disabled={isOcrProcessing}
              >
                {isOcrProcessing ? 'AI 辨識中...' : '選擇圖片'}
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
          </div>
        </CardContent>
      </Card>

      {/* OCR 結果 */}
      {ocrResult && (
        <Card>
          <CardHeader>
            <CardTitle>
              {ocrResult.success ? '✅ 辨識完成' : '❌ 辨識失敗'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ocrResult.success && ocrResult.data ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    大學名稱: <span className="font-semibold">{ocrResult.data.university_name || '未識別'}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    辨識到 <span className="font-semibold">{ocrResult.totalDepartments}</span> 個科系
                  </p>
                </div>

                {/* 辨識結果表格 */}
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">科系</th>
                        <th className="p-2 text-left">代碼</th>
                        <th className="p-2 text-left">名額</th>
                        <th className="p-2 text-left">國</th>
                        <th className="p-2 text-left">英</th>
                        <th className="p-2 text-left">數A</th>
                        <th className="p-2 text-left">數B</th>
                        <th className="p-2 text-left">社</th>
                        <th className="p-2 text-left">自</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocrResult.data.departments.map((dept, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{dept.department_name}</td>
                          <td className="p-2">{dept.department_code || '-'}</td>
                          <td className="p-2">{dept.admission_quota || '-'}</td>
                          <td className="p-2">{dept.requirement_chinese || '-'}</td>
                          <td className="p-2">{dept.requirement_english || '-'}</td>
                          <td className="p-2">{dept.requirement_math_a || '-'}</td>
                          <td className="p-2">{dept.requirement_math_b || '-'}</td>
                          <td className="p-2">{dept.requirement_social || '-'}</td>
                          <td className="p-2">{dept.requirement_natural || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-destructive">
                <p className="font-semibold">錯誤訊息:</p>
                <p className="text-sm">{ocrResult.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 匯入按鈕 */}
      {ocrResult?.success && (
        <div className="flex justify-end">
          <Button onClick={handleImport} disabled={isImporting} size="lg">
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                匯入中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                步驟 2: 匯入到資料庫
              </>
            )}
          </Button>
        </div>
      )}

      {/* 匯入結果 */}
      {importResult && (
        <Card>
          <CardContent className="pt-6">
            {importResult.success ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-semibold">匯入成功！</p>
                  <p className="text-sm">
                    成功匯入 {importResult.imported} / {importResult.total} 筆校系資料
                  </p>
                  <p className="text-xs mt-2 text-muted-foreground">
                    ✅ 系統已自動將「頂標」、「前標」等級距轉換為實際級分
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">匯入失敗</p>
                  <p className="text-sm">{importResult.error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
