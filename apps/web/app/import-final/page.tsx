'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2, CheckCircle2, XCircle, Trash2, Image as ImageIcon } from 'lucide-react'

interface ImageFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'processing' | 'success' | 'error'
  departmentCount?: number
  error?: string
}

export default function ImportFinalPage() {
  const [internalApiKey] = useState('dev-internal-api-key-1762922305')
  const [universityName, setUniversityName] = useState('')
  const [images, setImages] = useState<ImageFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [totalImported, setTotalImported] = useState(0)

  const handleAddImages = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newImages: ImageFile[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const preview = URL.createObjectURL(file)
      newImages.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview,
        status: 'pending',
      })
    }

    setImages((prev) => [...prev, ...newImages])
  }

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id)
      if (image) URL.revokeObjectURL(image.preview)
      return prev.filter((img) => img.id !== id)
    })
  }

  const handleProcessAll = async () => {
    if (!universityName.trim()) {
      alert('請輸入大學名稱')
      return
    }

    if (images.length === 0) {
      alert('請至少上傳一張圖片')
      return
    }

    setIsProcessing(true)
    setTotalImported(0)

    // 處理每張圖片
    for (const image of images) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, status: 'processing' } : img
        )
      )

      try {
        // Step 1: 後端 OCR 辨識
        const formData1 = new FormData()
        formData1.append('file', image.file)

        const ocrResponse = await fetch('/api/internal/departments/ocr-smart', {
          method: 'POST',
          headers: {
            'x-internal-api-key': internalApiKey,
          },
          body: formData1,
        })

        if (!ocrResponse.ok) {
          const errorData = await ocrResponse.json()
          throw new Error(errorData.error || `OCR 失敗: ${ocrResponse.status}`)
        }

        const ocrData = await ocrResponse.json()

        if (!ocrData.success || !ocrData.data?.departments) {
          throw new Error(ocrData.error || '未辨識到任何科系')
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

        // Step 3: 匯入資料庫
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const csvFile = new File([blob], 'departments.csv', { type: 'text/csv' })

        const formData2 = new FormData()
        formData2.append('file', csvFile)

        const importResponse = await fetch('/api/internal/departments/import', {
          method: 'POST',
          headers: {
            'x-internal-api-key': internalApiKey,
          },
          body: formData2,
        })

        if (!importResponse.ok) {
          const errorData = await importResponse.json()
          throw new Error(errorData.error || `匯入失敗: ${importResponse.status}`)
        }

        const importData = await importResponse.json()

        if (!importData.success) {
          throw new Error(importData.error || '匯入失敗')
        }

        // 更新狀態
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: 'success',
                  departmentCount: importData.imported || 0,
                }
              : img
          )
        )

        setTotalImported((prev) => prev + (importData.imported || 0))
      } catch (error) {
        console.error(`[Import] Error processing ${image.file.name}:`, error)
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

      // 每張圖片處理後稍微延遲,避免 API 過載
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    setIsProcessing(false)
  }

  const successCount = images.filter((img) => img.status === 'success').length
  const errorCount = images.filter((img) => img.status === 'error').length
  const pendingCount = images.filter((img) => img.status === 'pending').length
  const processingCount = images.filter((img) => img.status === 'processing').length

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">🎓 校系標準批次匯入</h1>
        <p className="text-muted-foreground">同一所大學的多張圖片一次處理</p>
      </div>

      {/* 大學名稱 */}
      <Card>
        <CardHeader>
          <CardTitle>大學名稱</CardTitle>
          <CardDescription>所有圖片將使用此大學名稱</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="例如: 國立台灣大學"
            value={universityName}
            onChange={(e) => setUniversityName(e.target.value)}
            className="text-lg"
          />
        </CardContent>
      </Card>

      {/* 上傳區 */}
      <Card>
        <CardHeader>
          <CardTitle>上傳圖片</CardTitle>
          <CardDescription>選擇一張或多張校系標準表格圖片</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              支援 JPG、PNG 等圖片格式
            </p>
            <Button
              onClick={() => document.getElementById('file-input')?.click()}
              variant="outline"
              size="lg"
            >
              <Upload className="h-5 w-5 mr-2" />
              選擇圖片 (可多選)
            </Button>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleAddImages(e.target.files)}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* 圖片列表 */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>圖片列表 ({images.length})</CardTitle>
                <CardDescription>
                  {pendingCount > 0 && `待處理: ${pendingCount} | `}
                  {processingCount > 0 && `處理中: ${processingCount} | `}
                  {successCount > 0 && `成功: ${successCount} | `}
                  {errorCount > 0 && `失敗: ${errorCount}`}
                </CardDescription>
              </div>
              {totalImported > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{totalImported}</p>
                  <p className="text-xs text-muted-foreground">總科系數</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`relative border-2 rounded-lg overflow-hidden transition-all ${
                    image.status === 'success'
                      ? 'border-green-500 shadow-green-100 shadow-lg'
                      : image.status === 'error'
                      ? 'border-red-500 shadow-red-100 shadow-lg'
                      : image.status === 'processing'
                      ? 'border-blue-500 shadow-blue-100 shadow-lg animate-pulse'
                      : 'border-gray-200'
                  }`}
                >
                  {/* 圖片預覽 */}
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={image.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 狀態覆蓋層 */}
                  {image.status === 'processing' && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    </div>
                  )}

                  {image.status === 'success' && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}

                  {image.status === 'error' && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full">
                      <XCircle className="h-5 w-5" />
                    </div>
                  )}

                  {/* 資訊區 */}
                  <div className="p-3 bg-white">
                    <p className="text-xs truncate font-medium mb-1">
                      {image.file.name}
                    </p>
                    {image.status === 'pending' && (
                      <p className="text-xs text-gray-500">待處理</p>
                    )}
                    {image.status === 'processing' && (
                      <p className="text-xs text-blue-600 font-medium">處理中...</p>
                    )}
                    {image.status === 'success' && (
                      <p className="text-xs text-green-600 font-medium">
                        ✅ {image.departmentCount} 個科系
                      </p>
                    )}
                    {image.status === 'error' && (
                      <p className="text-xs text-red-600 font-medium" title={image.error}>
                        ❌ {image.error}
                      </p>
                    )}
                  </div>

                  {/* 刪除按鈕 */}
                  {image.status === 'pending' && (
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 處理按鈕 */}
      {images.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={handleProcessAll}
            disabled={isProcessing || !universityName.trim() || images.length === 0}
            size="lg"
            className="w-full max-w-md h-14 text-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                處理中... ({successCount + errorCount}/{images.length})
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                開始處理全部圖片
              </>
            )}
          </Button>
        </div>
      )}

      {/* 使用提示 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2 text-blue-900">💡 使用提示</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. 輸入大學名稱 (例如: 國立台灣大學)</li>
            <li>2. 點擊上傳區選擇多張圖片</li>
            <li>3. 點擊「開始處理全部圖片」</li>
            <li>4. 系統會逐張辨識並自動匯入資料庫</li>
            <li className="mt-2 text-green-700">✨ 系統會自動將「頂標」、「前標」等級距轉換為實際級分</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
