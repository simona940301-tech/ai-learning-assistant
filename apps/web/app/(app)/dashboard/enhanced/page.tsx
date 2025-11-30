'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Target, Brain, Zap, BookOpen, BarChart3 } from 'lucide-react'
import ProficiencyChart from '@/components/dashboard/ProficiencyChart'
import ConceptMasteryRadar from '@/components/dashboard/ConceptMasteryRadar'
import PredictionGauge from '@/components/dashboard/PredictionGauge'

interface ProficiencyData {
  overall_proficiency: number
  accuracy_rate: number
  consistency_score: number
  calculated_at: string
}

interface ConceptProficiency {
  id: string
  mastery_level: number
  concept_tags: {
    tag_name: string
    category: string
  }
}

interface PredictionData {
  currentScore: number
  predictions: {
    '7days': {
      examScore: number
      improvement: number
      confidence: number
    }
    '14days': {
      examScore: number
      improvement: number
      confidence: number
    }
  }
  recommendations: Array<{
    type: string
    concept?: string
    reason: string
    action: string
  }>
}

export default function EnhancedDashboardPage() {
  const [proficiency, setProficiency] = useState<ProficiencyData | null>(null)
  const [concepts, setConcepts] = useState<ConceptProficiency[]>([])
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'concepts' | 'predictions'>('overview')

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)

      // Fetch all data in parallel
      const [proficiencyRes, conceptsRes, predictionRes] = await Promise.all([
        fetch('/api/proficiency/calculate'),
        fetch('/api/proficiency/concepts'),
        fetch('/api/dashboard/prediction')
      ])

      const [proficiencyData, conceptsData, predictionData] = await Promise.all([
        proficiencyRes.json(),
        conceptsRes.json(),
        predictionRes.json()
      ])

      if (proficiencyData.proficiency) {
        setProficiency(proficiencyData.proficiency[0] || proficiencyData.proficiency)
      }

      if (conceptsData.concepts) {
        setConcepts(conceptsData.concepts)
      }

      if (predictionData) {
        setPrediction(predictionData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFBF0]">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#FFB01A] border-t-transparent mx-auto" />
          <p className="text-gray-600">載入學習數據中...</p>
        </div>
      </div>
    )
  }

  // Transform data for charts
  const proficiencyChartData = proficiency ? [
    {
      date: new Date(proficiency.calculated_at).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
      proficiency: proficiency.overall_proficiency,
      accuracy: proficiency.accuracy_rate
    }
  ] : []

  const conceptRadarData = concepts.slice(0, 8).map(c => ({
    concept: c.concept_tags.tag_name.split('-').join(' '),
    mastery: c.mastery_level,
    fullMark: 100
  }))

  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-gray-800 mb-2">學習儀表板</h1>
            <p className="text-gray-600">深度分析你的學習數據與進度</p>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#FFB01A] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                總覽
              </div>
            </button>
            <button
              onClick={() => setActiveTab('concepts')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'concepts'
                  ? 'bg-[#FFB01A] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                概念分析
              </div>
            </button>
            <button
              onClick={() => setActiveTab('predictions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'predictions'
                  ? 'bg-[#FFB01A] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                成績預測
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-500">總體熟練度</span>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {proficiency?.overall_proficiency.toFixed(1) || 0}
                  <span className="text-lg text-gray-500 ml-1">/ 100</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-500">正確率</span>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {proficiency?.accuracy_rate.toFixed(1) || 0}
                  <span className="text-lg text-gray-500 ml-1">%</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-500">穩定性</span>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {proficiency?.consistency_score.toFixed(1) || 0}
                  <span className="text-lg text-gray-500 ml-1">/ 100</span>
                </div>
              </div>
            </div>

            {/* Proficiency Chart */}
            {proficiencyChartData.length > 0 && (
              <ProficiencyChart data={proficiencyChartData} />
            )}

            {/* Recommendations */}
            {prediction && prediction.recommendations && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="h-5 w-5 text-[#FFB01A]" />
                  <h3 className="font-semibold text-gray-800">個人化學習建議</h3>
                </div>

                <div className="space-y-4">
                  {prediction.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-4 bg-[#FFF5E6] rounded-xl"
                    >
                      <h4 className="font-medium text-gray-800 mb-1">
                        {rec.type === 'focus_concept' ? '🎯 加強概念' : '📈 增加練習'}
                        {rec.concept && `: ${rec.concept}`}
                      </h4>
                      <p className="text-sm text-gray-600">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Concepts Tab */}
        {activeTab === 'concepts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Concept Radar */}
            {conceptRadarData.length > 0 && (
              <ConceptMasteryRadar data={conceptRadarData} />
            )}

            {/* Concept List */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-6">所有概念詳情</h3>

              <div className="space-y-4">
                {concepts.slice(0, 10).map((concept) => (
                  <div key={concept.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">
                          {concept.concept_tags.tag_name}
                        </span>
                        <span className="text-sm font-medium text-gray-600">
                          {concept.mastery_level.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${concept.mastery_level}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Predictions Tab */}
        {activeTab === 'predictions' && prediction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Prediction Gauge */}
            <PredictionGauge
              currentScore={prediction.currentScore}
              predictedScore={prediction.predictions['14days'].examScore}
              targetScore={15}
              daysRemaining={14}
            />

            {/* Detailed Predictions */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* 7 Days */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-[#FFB01A]" />
                  <h3 className="font-semibold text-gray-800">7 天後預測</h3>
                </div>

                <div className="text-4xl font-bold text-gray-800 mb-4">
                  {prediction.predictions['7days'].examScore}
                  <span className="text-lg text-green-600 ml-2">
                    +{prediction.predictions['7days'].improvement.toFixed(1)}
                  </span>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#FFB01A] transition-all duration-500"
                    style={{ width: `${prediction.predictions['7days'].confidence * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  信心度: {(prediction.predictions['7days'].confidence * 100).toFixed(0)}%
                </p>
              </div>

              {/* 14 Days */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-[#FFB01A]" />
                  <h3 className="font-semibold text-gray-800">14 天後預測</h3>
                </div>

                <div className="text-4xl font-bold text-gray-800 mb-4">
                  {prediction.predictions['14days'].examScore}
                  <span className="text-lg text-green-600 ml-2">
                    +{prediction.predictions['14days'].improvement.toFixed(1)}
                  </span>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#FFB01A] transition-all duration-500"
                    style={{ width: `${prediction.predictions['14days'].confidence * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  信心度: {(prediction.predictions['14days'].confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
