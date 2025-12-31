'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2, CheckCircle2, XCircle, Trash2, Image as ImageIcon } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface ImageFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'processing' | 'success' | 'error'
  departments?: any[]
  error?: string
}

export default function ImportSimplePage() {
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [internalApiKey, setInternalApiKey] = useState('dev-internal-api-key-1762922305')
  const [universityName, setUniversityName] = useState('')
  const [images, setImages] = useState<ImageFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [totalImported, setTotalImported] = useState(0)

  const handleAddImages = async (files: FileList | null) => {
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

  const processImageWithGemini = async (file: File): Promise<any> => {
    // 讀取圖片為 base64
    const buffer = await file.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({
      model: 'models/gemini-2.0-flash-exp'
    })

    const prompt = `
你是一個專業的台灣大學入學考試資料分析專家。請仔細分析這張圖片中的「校系代碼檢定標準表」。

**圖片格式說明:**
- 這是一個表格,包含多個校系(科系)的入學檢定標準
- 每一列代表一個科系
- 欄位包含: 校系代碼、性別要求、校系名稱、招生名額、國文、英文、數學A、數學B、社會、自然、英聽

**檢定標準的格式:**
- 可能是文字: "頂標"、"前標"、"均標"、"後標"、"底標"
- 可能是符號: "--" 表示不要求
- 英聽可能是: "A"、"B"、"C" 或 "--"

**你的任務:**
1. 辨識表格中的**每一列**(每個科系)
2. 提取以下欄位資訊:
   - department_code: 校系代碼 (例如: "004012")
   - department_name: 校系名稱 (例如: "中國文學系")
   - gender_requirement: 性別要求 ("無"、"男"、"女")
   - admission_quota: 招生名額 (數字)
   - requirement_chinese: 國文檢定標準
   - requirement_english: 英文檢定標準
   - requirement_math_a: 數學A檢定標準
   - requirement_math_b: 數學B檢定標準
   - requirement_social: 社會檢定標準
   - requirement_natural: 自然檢定標準
   - requirement_english_listening: 英聽檢定標準

3. 將 "--" 或空白欄位轉換為 null
4. 確保數字欄位(招生名額)是整數

**輸出格式 (純 JSON,不要任何額外文字):**
{
  "departments": [
    {
      "department_code": "004012",
      "department_name": "中國文學系",
      "gender_requirement": "無",
      "admission_quota": 8,
      "requirement_chinese": "頂標",
      "requirement_english": "均標",
      "requirement_math_a": null,
      "requirement_math_b": null,
      "requirement_social": "前標",
      "requirement_natural": null,
      "requirement_english_listening": null
    }
  ]
}

**重要提醒:**
- 只輸出 JSON,不要任何其他文字或解釋
- 確保 JSON 格式正確,可以直接被程式解析
- 如果某個欄位看不清楚,設為 null
- 仔細檢查每個科系的每個欄位
`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64,
        },
      },
    ])

    const responseText = result.response.text()
    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    return JSON.parse(cleanedText)
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
        // Step 1: 使用 Gemini OCR 辨識
        const ocrData = await processImageWithGemini(image.file)

        if (!ocrData.departments || ocrData.departments.length === 0) {
          throw new Error('未辨識到任何科系')
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

        ocrData.departments.forEach((dept: any) => {
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

        const formData = new FormData()
        formData.append('file', csvFile)

        const importResponse = await fetch('/api/internal/departments/import', {
          method: 'POST',
          headers: {
            'x-internal-api-key': internalApiKey,
          },
          body: formData,
        })

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
                departments: ocrData.departments,
              }
              : img
          )
        )

        setTotalImported((prev) => prev + (importData.imported || 0))
      } catch (error) {
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

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🚀 簡易批次匯入</h1>
        <p className="text-muted-foreground">同一所大學的多張圖片一次處理</p>
      </div>

      {/* 設定 */}
      <Card>
        <CardHeader>
          <CardTitle>基本設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Gemini API Key *</Label>
            <Input
              type="text"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
            <p className="text-xs text-green-600 mt-1">✅ 已預設</p>
          </div>

          <div>
            <Label>Internal API Key *</Label>
            <Input
              type="text"
              value={internalApiKey}
              onChange={(e) => setInternalApiKey(e.target.value)}
            />
            <p className="text-xs text-green-600 mt-1">✅ 已預設</p>
          </div>

          <div>
            <Label>大學名稱 *</Label>
            <Input
              placeholder="例如: 國立台灣大學"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 上傳區 */}
      <Card>
        <CardHeader>
          <CardTitle>上傳圖片</CardTitle>
          <CardDescription>選擇多張同一所大學的校系標準表格</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <Button
              onClick={() => document.getElementById('file-input')?.click()}
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
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

      {/* 圖片預覽 */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>圖片列表 ({images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`relative border rounded-lg overflow-hidden ${image.status === 'success'
                      ? 'border-green-500'
                      : image.status === 'error'
                        ? 'border-red-500'
                        : image.status === 'processing'
                          ? 'border-blue-500'
                          : ''
                    }`}
                >
                  <img
                    src={image.preview}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-2 bg-white">
                    <p className="text-xs truncate">{image.file.name}</p>
                    {image.status === 'success' && (
                      <p className="text-xs text-green-600">
                        ✅ {image.departments?.length || 0} 個科系
                      </p>
                    )}
                    {image.status === 'error' && (
                      <p className="text-xs text-red-600">❌ {image.error}</p>
                    )}
                    {image.status === 'processing' && (
                      <p className="text-xs text-blue-600">⏳ 處理中...</p>
                    )}
                  </div>
                  {image.status === 'pending' && (
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded"
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
        <div className="flex justify-between items-center">
          <div className="text-sm">
            {successCount > 0 && (
              <span className="text-green-600">
                ✅ 成功: {successCount} | 總科系: {totalImported}
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-600 ml-4">❌ 失敗: {errorCount}</span>
            )}
          </div>
          <Button
            onClick={handleProcessAll}
            disabled={isProcessing || !universityName.trim()}
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                處理中 ({successCount + errorCount}/{images.length})
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                開始處理全部
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
