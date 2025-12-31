'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Upload, Plus, Trash2, Save } from 'lucide-react'
import { motion } from 'framer-motion'

interface QuestionForm {
    question_text: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: 'A' | 'B' | 'C' | 'D'
    explanation: string
    difficulty: number
    subject: string
}

export default function QuestionUploadPage() {
    const router = useRouter()
    const [questions, setQuestions] = useState<QuestionForm[]>([{
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        explanation: '',
        difficulty: 3,
        subject: 'math'
    }])
    const [uploading, setUploading] = useState(false)

    const addQuestion = () => {
        setQuestions([...questions, {
            question_text: '',
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            correct_answer: 'A',
            explanation: '',
            difficulty: 3,
            subject: 'math'
        }])
    }

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index))
    }

    const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
        const updated = [...questions]
        updated[index] = { ...updated[index], [field]: value }
        setQuestions(updated)
    }

    const handleSubmit = async () => {
        setUploading(true)
        try {
            const res = await fetch('/api/admin/questions/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions })
            })

            const data = await res.json()
            if (data.success) {
                alert(`成功上傳 ${data.count} 題！`)
                router.push('/play')
            } else {
                alert('上傳失敗：' + data.error)
            }
        } catch (error) {
            alert('上傳失敗')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">題目上傳</h1>
                    <p className="text-white/60">為無限練習模式新增題目</p>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                    {questions.map((q, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">題目 {index + 1}</h3>
                                {questions.length > 1 && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeQuestion(index)}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {/* Question Text */}
                                <div>
                                    <label className="text-sm text-white/60 mb-2 block">題幹</label>
                                    <textarea
                                        value={q.question_text}
                                        onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white resize-none"
                                        rows={3}
                                        placeholder="輸入題目..."
                                    />
                                </div>

                                {/* Options */}
                                <div className="grid grid-cols-2 gap-3">
                                    {['A', 'B', 'C', 'D'].map((opt) => (
                                        <div key={opt}>
                                            <label className="text-sm text-white/60 mb-2 block">選項 {opt}</label>
                                            <input
                                                type="text"
                                                value={q[`option_${opt.toLowerCase()}` as keyof QuestionForm] as string}
                                                onChange={(e) => updateQuestion(index, `option_${opt.toLowerCase()}` as keyof QuestionForm, e.target.value)}
                                                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
                                                placeholder={`選項 ${opt}`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Correct Answer & Difficulty */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-sm text-white/60 mb-2 block">正確答案</label>
                                        <select
                                            value={q.correct_answer}
                                            onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
                                        >
                                            {['A', 'B', 'C', 'D'].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm text-white/60 mb-2 block">難度</label>
                                        <select
                                            value={q.difficulty}
                                            onChange={(e) => updateQuestion(index, 'difficulty', parseInt(e.target.value))}
                                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
                                        >
                                            {[1, 2, 3, 4, 5].map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm text-white/60 mb-2 block">科目</label>
                                        <select
                                            value={q.subject}
                                            onChange={(e) => updateQuestion(index, 'subject', e.target.value)}
                                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
                                        >
                                            <option value="math">數學</option>
                                            <option value="chinese">國文</option>
                                            <option value="english">英文</option>
                                            <option value="science">自然</option>
                                            <option value="social">社會</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Explanation */}
                                <div>
                                    <label className="text-sm text-white/60 mb-2 block">詳解</label>
                                    <textarea
                                        value={q.explanation}
                                        onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white resize-none"
                                        rows={2}
                                        placeholder="輸入詳解..."
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <Button
                        onClick={addQuestion}
                        variant="outline"
                        className="flex-1"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        新增題目
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        disabled={uploading || questions.some(q => !q.question_text)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                        {uploading ? (
                            <>上傳中...</>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                上傳 {questions.length} 題
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
