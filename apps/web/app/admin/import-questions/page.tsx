'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type SourceType = 'GSAT' | 'AST' | 'OTHER' | 'NATIONAL_MOCK' | 'NORTHERN_MOCK'

interface ImportResult {
  success: boolean
  imported?: number
  total?: number
  errors?: number
  errorDetails?: Array<{ row: number; error: string } | { question_number: string; error: string }>
  error?: string
}

export default function ImportQuestionsPage() {
  // 文字輸入狀態
  const [explanationText, setExplanationText] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [sourceType, setSourceType] = useState<SourceType>('GSAT')
  const [sourceYear, setSourceYear] = useState<string>(new Date().getFullYear().toString())
  const [paperNumber, setPaperNumber] = useState<string>('1')

  useEffect(() => {
    // Catch any initialization errors
    try {
      // Page loaded successfully
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('[ImportQuestionsPage] Error:', err)
    }
  }, [])

  const handleImport = useCallback(async () => {
    // 檢查文字內容
    if (!explanationText || explanationText.trim().length === 0) {
      setResult({
        success: false,
        error: '請輸入試題詳解文字內容',
      })
      return
    }

    setIsImporting(true)
    setResult(null)

    try {
      // 將文字內容轉換為 Blob，模擬檔案上傳
      const textBlob = new Blob([explanationText], { type: 'text/plain' })
      const textFile = new File([textBlob], 'explanation.txt', { type: 'text/plain' })

      console.log('[Import] Creating File object:', {
        name: textFile.name,
        type: textFile.type,
        size: textFile.size,
      })

      const formData = new FormData()
      formData.append('explanationFile', textFile)
      formData.append('sourceType', sourceType)
      formData.append('sourceYear', sourceYear)
      formData.append('paperNumber', paperNumber)

      console.log('[Import] FormData created, sending request...')

      const response = await fetch('/api/internal/seed-questions/import', {
        method: 'POST',
        body: formData,
      })

      console.log('[Import] Response status:', response.status, response.statusText)

      // 處理錯誤響應（可能不是 JSON）
      if (!response.ok) {
        let errorMessage = '匯入失敗'
        let errorData: any = null

        try {
          // 嘗試解析 JSON 錯誤響應
          errorData = await response.json()
          
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error
            } else if (errorData.error.message) {
              errorMessage = errorData.error.message
            } else if (errorData.error.code) {
              errorMessage = `${errorData.error.code}: ${errorData.error.message || 'Unknown error'}`
            }
          }

          // 處理特定狀態碼
          if (response.status === 403) {
            errorMessage = '權限不足。請確認您已登入且具有管理員權限。'
          } else if (response.status === 401) {
            errorMessage = '未授權。請先登入。'
          }

          // 顯示詳細錯誤訊息
          if (errorData.details) {
            errorMessage += `\n\n詳細資訊：${errorData.details}`
          }
          if (errorData.textPreview) {
            console.error('[Import] Text preview:', errorData.textPreview)
          }
        } catch (parseError) {
          // 如果無法解析 JSON，使用狀態文本
          const statusText = response.statusText || 'Unknown error'
          if (response.status === 403) {
            errorMessage = `權限不足 (403 Forbidden)。請確認您已登入且具有管理員權限。`
          } else if (response.status === 401) {
            errorMessage = `未授權 (401 Unauthorized)。請先登入。`
          } else {
            errorMessage = `HTTP ${response.status} ${statusText}`
          }
          console.error('[Import] Failed to parse error response:', parseError)
        }

        setResult({
          success: false,
          error: errorMessage,
          errorDetails: errorData?.errorDetails,
        })
        return
      }

      const data = await response.json()

      setResult(data)
      // 成功後清空輸入框
      setExplanationText('')
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '匯入失敗',
      })
    } finally {
      setIsImporting(false)
    }
  }, [explanationText, sourceType, sourceYear, paperNumber])

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h2 className="text-lg font-semibold text-destructive mb-2">頁面載入錯誤</h2>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">匯入歷屆試題</h1>
        <p className="text-sm text-muted-foreground">
          直接貼上試題詳解文字內容，系統會自動解析並匯入題目
        </p>
      </div>

      {/* 基本資訊 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">基本資訊</CardTitle>
          <CardDescription className="text-xs">
            設定考試類型與年份（用於題目分類）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>考試類型</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GSAT">學測</SelectItem>
                  <SelectItem value="AST">指考</SelectItem>
                  <SelectItem value="NATIONAL_MOCK">全國模考</SelectItem>
                  <SelectItem value="NORTHERN_MOCK">北部模考</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>年份</Label>
              <Input
                type="number"
                value={sourceYear}
                onChange={(e) => setSourceYear(e.target.value)}
                placeholder="2024"
              />
            </div>

            <div className="space-y-2">
              <Label>考卷編號</Label>
              <Input
                type="number"
                value={paperNumber}
                onChange={(e) => setPaperNumber(e.target.value)}
                placeholder="1"
                min="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 文字輸入 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">試題詳解文字</CardTitle>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>貼上試題詳解文字內容，系統會自動解析題目、選項、答案、難度、標籤和詳解。</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-primary hover:underline">點擊查看詳細格式說明</summary>
              <div className="mt-2 p-3 bg-muted rounded text-xs space-y-2">
                <p className="font-semibold">標準格式範例：</p>
                <pre className="whitespace-pre-wrap text-[10px] bg-background p-2 rounded border max-h-48 overflow-y-auto">
{`📝 題目 1
1. Mangoes are a _____ fruit that grows in tropical regions.
(A) mature
(B) usual
(C) seasonal
(D) particular

答案：C 難度：3 標籤：英文-詞彙題, 英文-自然/季節

🧠 詳解
核心考點：形容詞詞義辨析
題幹翻譯：芒果是一種生長在熱帶地區的_____水果。
判斷詞義：seasonal 表示季節性的，符合題意。
結論：答案為 (C) seasonal。`}
                </pre>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      window.open('/example-explanation-format.txt', '_blank')
                    }}
                    className="text-xs h-6"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    下載範例檔案
                  </Button>
                  <span className="text-muted-foreground text-[10px]">
                    完整格式說明：<code className="bg-background px-1 rounded">EXPLANATION_FILE_FORMAT.md</code>
                  </span>
                </div>
              </div>
            </details>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            value={explanationText}
            onChange={(e) => setExplanationText(e.target.value)}
            placeholder={`請貼上試題詳解文字內容...

例如：
📝 題目 1
1. Mangoes are a _____ fruit that grows in tropical regions.
(A) mature
(B) usual
(C) seasonal
(D) particular

答案：C 難度：3 標籤：英文-詞彙題, 英文-自然/季節

🧠 詳解
核心考點：形容詞詞義辨析
題幹翻譯：芒果是一種生長在熱帶地區的_____水果。
判斷詞義：seasonal 表示季節性的，符合題意。
結論：答案為 (C) seasonal。

📝 題目 2
...`}
            className="min-h-[500px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            文字長度：{explanationText.length} 字元
          </p>
        </CardContent>
      </Card>

      {/* Import Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleImport}
          disabled={isImporting || !explanationText.trim()}
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
                    成功匯入 {result.imported} / {result.total} 筆題目
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
                      {result.errorDetails.map((err, idx) => (
                        <p key={idx}>
                          {'row' in err ? `第 ${err.row} 行` : `題目 ${err.question_number}`}：{err.error}
                        </p>
                      ))}
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
