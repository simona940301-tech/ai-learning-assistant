/**
 * 🎯 EWA Battle Interface
 * 展示基於預期勝率的動態配比對戰界面
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface EWAQuestion {
  id: string
  question_text: string
  options: string[]
  correct_answer: string
  position: number
  purpose: 'warmup' | 'new_learning' | 'error_review' | 'challenge' | 'finale'
  expected_correctness: number
  is_from_error_book: boolean
  is_mutated: boolean
  time_limit: number
}

interface EWAAnalysis {
  total_questions: number
  expected_overall_accuracy: number
  error_book_questions: number
  new_questions: number
  mutated_questions: number
  purpose_distribution: Record<string, number>
}

interface Props {
  onStartBattle: (config: any) => Promise<{ questions: EWAQuestion[], analysis: EWAAnalysis, message: string }>
  onAnswerSubmit: (questionId: string, answer: string, timeTaken: number) => Promise<void>
}

export function EWABattleInterface({ onStartBattle, onAnswerSubmit }: Props) {
  const [gameState, setGameState] = useState<'config' | 'battle' | 'results'>('config')
  const [questions, setQuestions] = useState<EWAQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [analysis, setAnalysis] = useState<EWAAnalysis | null>(null)
  const [strategyMessage, setStrategyMessage] = useState('')
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isAnswering, setIsAnswering] = useState(false)

  // EWA 配置
  const [targetAccuracy, setTargetAccuracy] = useState(0.75)
  const [sessionType, setSessionType] = useState<'standard' | 'confidence_build' | 'challenge'>('standard')

  const currentQuestion = questions[currentQuestionIndex]

  /**
   * 🎯 開始 EWA 戰鬥
   */
  const handleStartBattle = async () => {
    try {
      const result = await onStartBattle({
        target_accuracy: targetAccuracy,
        session_type: sessionType,
        total_questions: 10
      })

      setQuestions(result.questions)
      setAnalysis(result.analysis)
      setStrategyMessage(result.message)
      setGameState('battle')
      setCurrentQuestionIndex(0)
      setUserAnswers([])
      
      // 開始第一題計時
      if (result.questions[0]) {
        setTimeRemaining(result.questions[0].time_limit)
      }
    } catch (error) {
      console.error('Failed to start EWA battle:', error)
    }
  }

  /**
   * ⏰ 計時器效果
   */
  useEffect(() => {
    if (gameState === 'battle' && timeRemaining > 0 && !isAnswering) {
      const timer = setTimeout(() => {
        setTimeRemaining(time => time - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0 && gameState === 'battle' && !isAnswering) {
      // 時間到自動提交空答案
      handleAnswer('')
    }
  }, [timeRemaining, gameState, isAnswering])

  /**
   * 📝 處理答題
   */
  const handleAnswer = async (selectedAnswer: string) => {
    if (isAnswering || !currentQuestion) return

    setIsAnswering(true)
    const timeTaken = (currentQuestion.time_limit - timeRemaining) * 1000

    try {
      await onAnswerSubmit(currentQuestion.id, selectedAnswer, timeTaken)
      
      const newAnswers = [...userAnswers, selectedAnswer]
      setUserAnswers(newAnswers)

      // 移動到下一題或結束
      if (currentQuestionIndex < questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1
        setCurrentQuestionIndex(nextIndex)
        setTimeRemaining(questions[nextIndex].time_limit)
        setIsAnswering(false)
      } else {
        // 戰鬥結束
        setGameState('results')
      }
    } catch (error) {
      console.error('Failed to submit answer:', error)
      setIsAnswering(false)
    }
  }

  /**
   * 🎨 獲取題目用途的樣式
   */
  const getPurposeStyle = (purpose: string) => {
    switch (purpose) {
      case 'warmup':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: '暖身啟動' }
      case 'new_learning':
        return { color: 'bg-blue-100 text-blue-800', icon: Brain, label: '新知探索' }
      case 'error_review':
        return { color: 'bg-orange-100 text-orange-800', icon: RotateCcw, label: '錯題重練' }
      case 'challenge':
        return { color: 'bg-red-100 text-red-800', icon: Target, label: '挑戰關卡' }
      case 'finale':
        return { color: 'bg-purple-100 text-purple-800', icon: Sparkles, label: '完美收官' }
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle, label: '一般題目' }
    }
  }

  /**
   * 🎮 配置界面
   */
  if (gameState === 'config') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎯 EWA 智能對戰系統
          </h1>
          <p className="text-gray-600">
            基於「預期勝率」的動態配比，為你量身打造最佳學習節奏
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                🎯 目標答對率：{Math.round(targetAccuracy * 100)}%
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0.5"
                  max="0.9"
                  step="0.05"
                  value={targetAccuracy}
                  onChange={(e) => setTargetAccuracy(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>50% (輕鬆)</span>
                  <span>75% (平衡)</span>
                  <span>90% (挑戰)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">🎮 戰鬥模式</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'confidence_build', label: '信心重建', desc: '多復習錯題' },
                  { value: 'standard', label: '平衡模式', desc: '新舊搭配' },
                  { value: 'challenge', label: '挑戰模式', desc: '高難新題' }
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setSessionType(mode.value as any)}
                    className={`p-3 rounded-lg border-2 transition-colors text-left ${
                      sessionType === mode.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{mode.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleStartBattle} className="w-full" size="lg">
            🚀 開始 EWA 智能戰鬥
          </Button>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            EWA 系統特色
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span>動態難度調整</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-600" />
              <span>智能錯題變異</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-red-600" />
              <span>精準勝率控制</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>心流狀態維持</span>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  /**
   * ⚔️ 戰鬥界面
   */
  if (gameState === 'battle' && currentQuestion) {
    const purposeStyle = getPurposeStyle(currentQuestion.purpose)
    const PurposeIcon = purposeStyle.icon

    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* 戰鬥狀態欄 */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={purposeStyle.color}>
                <PurposeIcon className="w-3 h-3 mr-1" />
                {purposeStyle.label}
              </Badge>
              
              {currentQuestion.is_from_error_book && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  錯題復習
                </Badge>
              )}
              
              {currentQuestion.is_mutated && (
                <Badge variant="outline" className="text-purple-600 border-purple-600">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI變異題
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                預期勝率: {Math.round(currentQuestion.expected_correctness * 100)}%
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className={`font-mono ${timeRemaining <= 5 ? 'text-red-600' : ''}`}>
                  {timeRemaining}s
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Progress 
              value={(currentQuestionIndex / questions.length) * 100} 
              className="h-2"
            />
            <div className="text-center text-sm text-gray-600 mt-1">
              第 {currentQuestion.position} 題 / 共 {questions.length} 題
            </div>
          </div>
        </Card>

        {/* 題目卡片 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4 leading-relaxed">
                {currentQuestion.question_text}
              </h2>

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index) // A, B, C, D
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(letter)}
                      disabled={isAnswering}
                      className="w-full p-4 text-left rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-medium">
                          {letter}
                        </div>
                        <div className="flex-1">{option}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* 策略提示 */}
        {analysis && (
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">🎯 AI 策略分析</h3>
                <p className="text-blue-800 text-sm mt-1">{strategyMessage}</p>
                <div className="flex gap-4 mt-2 text-xs text-blue-700">
                  <span>錯題復習: {analysis.error_book_questions}題</span>
                  <span>新題學習: {analysis.new_questions}題</span>
                  <span>預期勝率: {Math.round(analysis.expected_overall_accuracy * 100)}%</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    )
  }

  /**
   * 📊 結果界面
   */
  if (gameState === 'results') {
    const correctCount = userAnswers.filter((answer, index) => 
      answer === questions[index]?.correct_answer
    ).length
    const actualAccuracy = correctCount / questions.length
    const expectedAccuracy = analysis?.expected_overall_accuracy || 0

    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">🎉 戰鬥完成！</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-3xl font-bold text-blue-600">{correctCount}</div>
              <div className="text-sm text-gray-600">答對題數</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {Math.round(actualAccuracy * 100)}%
              </div>
              <div className="text-sm text-gray-600">實際勝率</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {Math.round(expectedAccuracy * 100)}%
              </div>
              <div className="text-sm text-gray-600">預期勝率</div>
            </div>
          </div>

          {/* EWA 系統分析 */}
          <div className="space-y-4">
            <h3 className="font-medium">🧠 EWA 系統表現分析</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>預測準確度:</span>
                  <span className={`font-medium ${
                    Math.abs(actualAccuracy - expectedAccuracy) < 0.1 
                      ? 'text-green-600' 
                      : 'text-orange-600'
                  }`}>
                    誤差 {Math.abs(actualAccuracy - expectedAccuracy) < 0.1 ? '< 10%' : '≥ 10%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>錯題變異效果:</span>
                  <span>待分析</span>
                </div>
                <div className="flex justify-between">
                  <span>心流狀態維持:</span>
                  <span className="text-green-600">良好</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={() => setGameState('config')} variant="outline" className="flex-1">
              重新配置
            </Button>
            <Button onClick={handleStartBattle} className="flex-1">
              再來一局
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return null
}