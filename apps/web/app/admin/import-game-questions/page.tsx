'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Upload, FileText, Loader2, CheckCircle2, XCircle, Brain, FileEdit, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type SourceType = 'GSAT' | 'AST' | 'OTHER' | 'NATIONAL_MOCK' | 'NORTHERN_MOCK' | 'SYSTEM'
type GameMode = 'practice' | 'editor' | 'detective'

interface ImportResult {
    success: boolean
    imported?: number
    total?: number
    errors?: number
    errorDetails?: Array<{ row: number; error: string } | { question_number: string; error: string }>
    error?: string
}

const GAME_MODES = [
    {
        id: 'practice' as GameMode,
        label: '無限練習',
        description: 'TikTok 式刷題，標準四選一格式',
        icon: Brain,
        color: 'from-cyan-500 to-blue-500',
    },
    {
        id: 'editor' as GameMode,
        label: '實習編輯',
        description: '克漏字、拖放式填空',
        icon: FileEdit,
        color: 'from-purple-500 to-indigo-500',
    },
    {
        id: 'detective' as GameMode,
        label: '偵探檔案',
        description: '碎片閱讀、證據判讀、邏輯推理',
        icon: Search,
        color: 'from-slate-600 to-slate-800',
    },
]

const EXAMPLE_FORMATS = {
    practice: `2024 學測英文試題

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
結論：答案為 (C) seasonal。`,

    editor: `2024 學測英文 - Editor Mode

📝 題目 1
主題：環境保護

文章：
Climate change is one of the most {1:pressing} issues of our time. Scientists have been {2:warning} us about its effects for decades.

空格 1: pressing
選項: pressing (正確), urgent (高干擾), important (中干擾), serious (低干擾)
難度: 3
標籤: 英文-詞彙題

空格 2: warning
選項: warning (正確), telling (高干擾), informing (中干擾), saying (低干擾)
難度: 2
標籤: 英文-動詞用法`,

    detective: `2024 學測國文 - Detective Mode

📝 案件 1
案件名稱：失落的古詩真跡

背景故事：
某博物館收藏了一幅據稱是唐代詩人李白的真跡，但近期有學者質疑其真實性。

證據 A：書法風格分析
文字內容：此作品筆觸流暢，氣勢磅礴，與李白豪放的詩風相符。
重要性：高
類型：專家鑑定

推理題目：
根據以上證據，這幅作品最可能是：
(A) 李白真跡
(B) 唐代仿作
(C) 宋代臨摹
(D) 現代偽作

答案：C 難度：4 標籤：國文-古詩詞, 邏輯推理`,
}

export default function ImportGameQuestionsPage() {
    const [activeMode, setActiveMode] = useState<GameMode>('practice')
    const [questionText, setQuestionText] = useState('')
    const [isImporting, setIsImporting] = useState(false)
    const [result, setResult] = useState<ImportResult | null>(null)

    // Form fields
    const [sourceType, setSourceType] = useState<SourceType>('GSAT')
    const [sourceYear, setSourceYear] = useState(new Date().getFullYear().toString())
    const [paperNumber, setPaperNumber] = useState('1')

    const handleImport = async () => {
        if (!questionText.trim()) {
            setResult({
                success: false,
                error: '請輸入題目內容',
            })
            return
        }

        setIsImporting(true)
        setResult(null)

        try {
            const textBlob = new Blob([questionText], { type: 'text/plain' })
            const textFile = new File([textBlob], `${activeMode}_questions.txt`, { type: 'text/plain' })

            const formData = new FormData()
            formData.append('explanationFile', textFile)
            formData.append('sourceType', sourceType)
            formData.append('sourceYear', sourceYear)
            formData.append('paperNumber', paperNumber)
            formData.append('gameMode', activeMode) // 新增遊戲模式標識

            const response = await fetch('/api/internal/seed-questions/import', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                setResult({
                    success: false,
                    error: errorData.error || `HTTP ${response.status} ${response.statusText}`,
                    errorDetails: errorData.errorDetails,
                })
                return
            }

            const data = await response.json()
            setResult(data)
            if (data.success) {
                setQuestionText('')
            }
        } catch (error) {
            setResult({
                success: false,
                error: error instanceof Error ? error.message : '匯入失敗',
            })
        } finally {
            setIsImporting(false)
        }
    }

    const loadExample = () => {
        setQuestionText(EXAMPLE_FORMATS[activeMode])
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto max-w-6xl px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                遊戲題目匯入系統
                            </h1>
                            <p className="mt-1 text-sm text-slate-600">
                                為 Detective's Log、Editor Mode 和 Infinite Practice 匯入題目
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => window.open('/GAME_QUESTIONS_FORMAT.md', '_blank')}
                            className="gap-2"
                        >
                            <FileText className="h-4 w-4" />
                            格式說明
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto max-w-6xl px-6 py-8">
                <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as GameMode)} className="space-y-6">
                    {/* Game Mode Tabs */}
                    <TabsList className="grid w-full grid-cols-3 bg-white/80 p-1 backdrop-blur-sm">
                        {GAME_MODES.map((mode) => (
                            <TabsTrigger
                                key={mode.id}
                                value={mode.id}
                                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-700 data-[state=active]:text-white"
                            >
                                <mode.icon className="mr-2 h-4 w-4" />
                                {mode.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Tab Content */}
                    {GAME_MODES.map((mode) => (
                        <TabsContent key={mode.id} value={mode.id} className="space-y-6">
                            {/* Mode Description Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className={`border-0 bg-gradient-to-r ${mode.color} text-white shadow-xl`}>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                                                <mode.icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl">{mode.label}</CardTitle>
                                                <CardDescription className="text-white/80">
                                                    {mode.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </motion.div>

                            {/* Basic Info Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                            >
                                <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">基本資訊</CardTitle>
                                        <CardDescription>設定題目來源與分類資訊</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
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
                                                        <SelectItem value="SYSTEM">系統自創</SelectItem>
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
                                                <Label>試卷編號</Label>
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
                            </motion.div>

                            {/* Question Input Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                            >
                                <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg">題目內容</CardTitle>
                                                <CardDescription>貼上格式化的題目文字，系統會自動解析</CardDescription>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={loadExample}>
                                                載入範例
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Textarea
                                            value={questionText}
                                            onChange={(e) => setQuestionText(e.target.value)}
                                            placeholder={`請貼上 ${mode.label} 的題目內容...\n\n點擊「載入範例」查看標準格式`}
                                            className="min-h-[500px] font-mono text-sm"
                                        />
                                        <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                                            <span>文字長度：{questionText.length} 字元</span>
                                            <span>遊戲模式：{mode.label}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Action Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.3 }}
                                className="flex justify-end gap-3"
                            >
                                <Button
                                    variant="outline"
                                    onClick={() => setQuestionText('')}
                                    disabled={!questionText.trim()}
                                >
                                    清空
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={isImporting || !questionText.trim()}
                                    size="lg"
                                    className={`bg-gradient-to-r ${mode.color} text-white shadow-lg hover:shadow-xl`}
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            匯入中...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            開始匯入
                                        </>
                                    )}
                                </Button>
                            </motion.div>

                            {/* Result Card */}
                            <AnimatePresence>
                                {result && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Card className={`border-0 shadow-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <CardContent className="pt-6">
                                                {result.success ? (
                                                    <div className="flex items-start gap-3 text-green-700">
                                                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <p className="font-semibold">匯入成功！</p>
                                                            <p className="mt-1 text-sm">
                                                                成功匯入 {result.imported} / {result.total} 筆題目
                                                                {result.errors && result.errors > 0 && `，${result.errors} 筆錯誤`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-3 text-red-700">
                                                        <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <p className="font-semibold">匯入失敗</p>
                                                            <p className="mt-1 text-sm">{result.error}</p>
                                                            {result.errorDetails && result.errorDetails.length > 0 && (
                                                                <div className="mt-3 space-y-1 rounded-lg bg-red-100 p-3 text-xs">
                                                                    <p className="font-semibold">錯誤詳情：</p>
                                                                    {result.errorDetails.map((err, idx) => (
                                                                        <p key={idx}>
                                                                            {'row' in err ? `第 ${err.row} 行` : `題目 ${err.question_number}`}：
                                                                            {err.error}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    )
}
