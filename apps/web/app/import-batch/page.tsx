'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2, CheckCircle2, XCircle, Trash2, Image as ImageIcon } from 'lucide-react'

interface ImageUpload {
  id: string
  file: File
  universityName: string
  status: 'pending' | 'processing' | 'success' | 'error'
  result?: any
  error?: string
}

export default function ImportBatchPage() {
  const [apiKey, setApiKey] = useState('dev-internal-api-key-1762922305')
  const [images, setImages] = useState<ImageUpload[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAddImage = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newImages: ImageUpload[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      universityName: '',
      status: 'pending',
    }))

    setImages((prev) => [...prev, ...newImages])
  }

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const handleUpdateUniversity = (id: string, universityName: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, universityName } : img))
    )
  }

  const handleProcessAll = async () => {
    if (!apiKey.trim()) {
      alert('請輸入 INTERNAL_API_KEY')
      return
    }

    const pendingImages = images.filter((img) => img.universityName.trim())
    if (pendingImages.length === 0) {
      alert('請至少新增一張圖片並填寫大學名稱')
      return
    }

    setIsProcessing(true)

    // 逐張處理圖片
    for (const image of pendingImages) {
      // 更新狀態為處理中
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, status: 'processing' } : img
        )
      )

      try {
        // Step 1: OCR 辨識
        const formData1 = new FormData()
        formData1.append('file', image.file)

        const ocrResponse = await fetch('/api/admin/departments/ocr-smart', {
          method: 'POST',
          headers: {
            'x-internal-api-key': apiKey,
          },
          body: formData1,
        })

        const ocrData = await ocrResponse.json()

        if (!ocrData.success) {
          throw new Error(`OCR 失敗: ${ocrData.error}`)
        }

        // Step 2: 建立 CSV
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

        ocrData.data.departments.forEach((dept: any) => {
          const row = [
            `"${image.universityName}"`,
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

        // Step 3: 匯入資料庫
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const csvFile = new File([blob], 'departments.csv', { type: 'text/csv' })

        const formData2 = new FormData()
        formData2.append('file', csvFile)

        const importResponse = await fetch('/api/internal/departments/import', {
          method: 'POST',
          headers: {
            'x-internal-api-key': apiKey,
          },
          body: formData2,
        })

        const importData = await importResponse.json()

        // 更新狀態為成功
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: 'success',
                  result: {
                    ocrResult: ocrData,
                    importResult: importData,
                  },
                }
              : img
          )
        )
      } catch (error) {
        // 更新狀態為失敗
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: 'error',
                  error: error instanceof Error ? error.message : '處理失敗',
                }
              : img
          )
        )
      }
    }

    setIsProcessing(false)
  }

  const successCount = images.filter((img) => img.status === 'success').length
  const errorCount = images.filter((img) => img.status === 'error').length
  const totalDepartments = images
    .filter((img) => img.status === 'success')
    .reduce((sum, img) => sum + (img.result?.importResult?.imported || 0), 0)

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">批次匯入校系標準</h1>
        <p className="text-muted-foreground">支援多張圖片同時匯入</p>
      </div>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle>API Key 設定</CardTitle>
          <CardDescription>從 .env.local 取得 INTERNAL_API_KEY</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="INTERNAL_API_KEY"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-green-600 mt-2">
            ✅ 已預設為: dev-internal-api-key-1762922305
          </p>
        </CardContent>
      </Card>

      {/* 上傳區 */}
      <Card>
        <CardHeader>
          <CardTitle>上傳圖片</CardTitle>
          <CardDescription>選擇一張或多張校系標準表格圖片</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              點擊選擇圖片或拖拽到此處
            </p>
            <Button
              onClick={() => document.getElementById('file-input')?.click()}
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              選擇圖片
            </Button>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleAddImage(e.target.files)}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* 圖片列表 */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>圖片列表 ({images.length})</CardTitle>
            <CardDescription>為每張圖片填寫對應的大學名稱</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {images.map((image) => (
              <div
                key={image.id}
                className={`border rounded-lg p-4 ${
                  image.status === 'success'
                    ? 'border-green-500 bg-green-50'
                    : image.status === 'error'
                    ? 'border-red-500 bg-red-50'
                    : image.status === 'processing'
                    ? 'border-blue-500 bg-blue-50'
                    : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      {image.status === 'success' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      {image.status === 'error' && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      {image.status === 'processing' && (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      )}
                      <p className="font-medium">{image.file.name}</p>
                      <span className="text-xs text-muted-foreground">
                        ({(image.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    {image.status === 'pending' && (
                      <Input
                        placeholder="輸入大學名稱 (例如: 國立台灣大學)"
                        value={image.universityName}
                        onChange={(e) =>
                          handleUpdateUniversity(image.id, e.target.value)
                        }
                      />
                    )}

                    {image.status === 'success' && image.result && (
                      <div className="text-sm space-y-1">
                        <p className="text-green-600">
                          ✅ 成功匯入 {image.result.importResult.imported} 個科系
                        </p>
                        <p className="text-muted-foreground">
                          大學: {image.universityName}
                        </p>
                      </div>
                    )}

                    {image.status === 'error' && (
                      <p className="text-sm text-red-600">{image.error}</p>
                    )}

                    {image.status === 'processing' && (
                      <p className="text-sm text-blue-600">正在處理中...</p>
                    )}
                  </div>

                  {image.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 處理按鈕 */}
      {images.length > 0 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {successCount > 0 && (
              <span className="text-green-600">
                成功: {successCount} | 總科系數: {totalDepartments}
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-600 ml-4">失敗: {errorCount}</span>
            )}
          </div>
          <Button
            onClick={handleProcessAll}
            disabled={
              isProcessing ||
              images.filter((img) => img.universityName.trim()).length === 0
            }
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                開始批次匯入
              </>
            )}
          </Button>
        </div>
      )}

      {/* 使用說明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用說明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. ✅ API Key 已預設,無需修改</p>
          <p>2. 點擊「選擇圖片」上傳一張或多張校系標準表格</p>
          <p>3. 為每張圖片填寫對應的大學名稱</p>
          <p>4. 點擊「開始批次匯入」</p>
          <p className="text-blue-600 mt-4">
            💡 系統會自動將「頂標」、「前標」等級距轉換為實際級分
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
