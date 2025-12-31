'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function ImportTestPage() {
  const [universityName, setUniversityName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [apiKey, setApiKey] = useState('')

  const handleSubmit = async () => {
    if (!universityName.trim()) {
      alert('請輸入大學名稱')
      return
    }

    if (!file) {
      alert('請選擇圖片檔案')
      return
    }

    if (!apiKey.trim()) {
      alert('請輸入 INTERNAL_API_KEY')
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      // Step 1: OCR 辨識
      const formData1 = new FormData()
      formData1.append('file', file)

      const ocrResponse = await fetch('/api/admin/departments/ocr-smart', {
        method: 'POST',
        headers: {
          'x-internal-api-key': apiKey,
        },
        body: formData1,
      })

      const ocrData = await ocrResponse.json()

      if (!ocrData.success) {
        setResult({
          success: false,
          error: `OCR 失敗: ${ocrData.error}`,
        })
        return
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
          'x-internal-api-key': apiKey,
        },
        body: formData2,
      })

      const importData = await importResponse.json()

      setResult({
        success: importData.success,
        ocrResult: ocrData,
        importResult: importData,
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '處理失敗',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">校系標準匯入工具</h1>
        <p className="text-muted-foreground">簡化版 - 測試用</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: 基本資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>INTERNAL_API_KEY *</Label>
            <Input
              type="password"
              placeholder="從 .env.local 取得"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div>
            <Label>大學名稱 *</Label>
            <Input
              placeholder="例如: 國立台灣大學"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
            />
          </div>

          <div>
            <Label>校系標準圖片 *</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                已選擇: {file.name}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={isProcessing || !universityName || !file || !apiKey}
        size="lg"
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            處理中...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            開始匯入
          </>
        )}
      </Button>

      {result && (
        <Card>
          <CardContent className="pt-6">
            {result.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">匯入成功!</p>
                    <p className="text-sm">
                      辨識到 {result.ocrResult.totalDepartments} 個科系
                    </p>
                    <p className="text-sm">
                      成功匯入 {result.importResult.imported} / {result.importResult.total} 筆
                    </p>
                  </div>
                </div>

                {/* 顯示辨識的科系 */}
                <div className="mt-4 max-h-96 overflow-y-auto border rounded p-4">
                  <p className="font-semibold mb-2">辨識結果:</p>
                  <ul className="space-y-1 text-sm">
                    {result.ocrResult.data.departments.map((dept: any, idx: number) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <span>{dept.department_name}</span>
                        {dept.requirement_english && (
                          <span className="text-blue-600">
                            (英文: {dept.requirement_english})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">處理失敗</p>
                  <p className="text-sm">{result.error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>使用說明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. 從 <code className="bg-muted px-1">apps/web/.env.local</code> 取得 INTERNAL_API_KEY</p>
          <p>2. 輸入大學名稱 (例如: 國立台灣大學)</p>
          <p>3. 上傳校系標準表格圖片</p>
          <p>4. 點擊「開始匯入」</p>
          <p className="text-yellow-600 mt-4">
            ⚠️ 此頁面會繞過所有認證,僅供測試使用
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
