'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Target, Zap, BookOpen } from 'lucide-react'

interface PredictionData {
    currentScore: number
    predictions: {
        '7days': {
            examScore: number
            improvement: number
            confidence: number
            message: string
        }
        '14days': {
            examScore: number
            improvement: number
            confidence: number
            message: string
        }
    }
    recommendations: Array<{
        type: string
        concept?: string
        reason: string
        action: string
        link?: string
        target?: number
        current?: number
        unit?: string
    }>
}

export default function DashboardPage() {
    const [prediction, setPrediction] = useState<PredictionData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchPrediction()
    }, [])

    const fetchPrediction = async () => {
        try {
            const response = await fetch('/api/dashboard/prediction')
            if (!response.ok) {
                throw new Error('Failed to fetch prediction')
            }
            const data = await response.json()
            setPrediction(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FFFBF0]">
                <div className="text-center">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#FFB01A] border-t-transparent mx-auto" />
                    <p className="text-gray-600">分析學習數據中...</p>
                </div>
            </div>
        )
    }

    if (error || !prediction) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FFFBF0]">
                <div className="text-center">
                    <p className="text-red-600 mb-4">無法載入預測數據</p>
                    <button
                        onClick={fetchPrediction}
                        className="px-6 py-2 bg-[#FFB01A] text-white rounded-lg hover:bg-[#FF9500] transition-colors"
                    >
                        重試
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FFFBF0] p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">學習預測</h1>
                    <p className="text-gray-600">基於你的學習數據,為你預測未來進步</p>
                </motion.div>

                {/* Current Score */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 mb-2">當前程度</p>
                            <p className="text-5xl font-bold text-[#FFB01A]">{prediction.currentScore}</p>
                            <p className="text-gray-500 mt-1">級分 / 15</p>
                        </div>
                        <div className="h-24 w-24 rounded-full bg-[#FFF5E6] flex items-center justify-center">
                            <Target className="h-12 w-12 text-[#FFB01A]" />
                        </div>
                    </div>
                </motion.div>

                {/* Predictions */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* 7 Days */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="h-5 w-5 text-[#FFB01A]" />
                            <h3 className="font-semibold text-gray-800">7 天後預測</h3>
                        </div>

                        <div className="mb-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-gray-800">
                                    {prediction.predictions['7days'].examScore}
                                </span>
                                <span className="text-green-600 font-medium">
                                    +{prediction.predictions['7days'].improvement.toFixed(1)}
                                </span>
                            </div>
                            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#FFB01A] transition-all duration-500"
                                    style={{ width: `${(prediction.predictions['7days'].confidence * 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                信心度: {(prediction.predictions['7days'].confidence * 100).toFixed(0)}%
                            </p>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed">
                            {prediction.predictions['7days'].message}
                        </p>
                    </motion.div>

                    {/* 14 Days */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="h-5 w-5 text-[#FFB01A]" />
                            <h3 className="font-semibold text-gray-800">14 天後預測</h3>
                        </div>

                        <div className="mb-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-gray-800">
                                    {prediction.predictions['14days'].examScore}
                                </span>
                                <span className="text-green-600 font-medium">
                                    +{prediction.predictions['14days'].improvement.toFixed(1)}
                                </span>
                            </div>
                            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#FFB01A] transition-all duration-500"
                                    style={{ width: `${(prediction.predictions['14days'].confidence * 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                信心度: {(prediction.predictions['14days'].confidence * 100).toFixed(0)}%
                            </p>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed">
                            {prediction.predictions['14days'].message}
                        </p>
                    </motion.div>
                </div>

                {/* Recommendations */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <BookOpen className="h-5 w-5 text-[#FFB01A]" />
                        <h3 className="font-semibold text-gray-800">學習建議</h3>
                    </div>

                    <div className="space-y-4">
                        {prediction.recommendations.map((rec, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                className="p-4 bg-[#FFF5E6] rounded-xl"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-800 mb-1">
                                            {rec.type === 'focus_concept' ? '🎯 加強概念' : '📈 增加練習'}
                                            {rec.concept && `: ${rec.concept}`}
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
                                        {rec.target && rec.current && (
                                            <p className="text-xs text-gray-500">
                                                目標: {rec.current} → {rec.target} {rec.unit}
                                            </p>
                                        )}
                                    </div>
                                    {rec.link && (
                                        <a
                                            href={rec.link}
                                            className="ml-4 px-4 py-2 bg-[#FFB01A] text-white text-sm rounded-lg hover:bg-[#FF9500] transition-colors whitespace-nowrap"
                                        >
                                            {rec.action}
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Disclaimer */}
                <p className="text-center text-xs text-gray-500">
                    預測基於統計模型,實際結果因人而異。持續練習是進步的關鍵。
                </p>
            </div>
        </div>
    )
}
