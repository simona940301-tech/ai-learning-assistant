import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Subject } from '@/lib/contract-v2'

const KeypointMCQRequestSchema = z.object({
  prompt: z.string().min(1),
  subject: z.string().optional(),
  detected_keypoint: z.string().optional()
})

// Mock data for testing
const mockKeypoints = [
  {
    id: 'kp1',
    code: 'TRIG_COS_LAW',
    name: '餘弦定理',
    description: 'c^2=a^2+b^2-2ab cos C',
    category: '三角',
    strategy_template: {
      steps: ['辨識三邊或兩邊夾角', '代公式', '檢查鈍角'],
      checks: ['單位與範圍']
    },
    error_patterns: [
      { pattern: '夾角誤判', note: '畫圖輔助' }
    ]
  },
  {
    id: 'kp2',
    code: 'VEC_DOT',
    name: '向量內積',
    description: 'u·v=|u||v|cosθ 或 分量相乘相加',
    category: '平面/空間向量',
    strategy_template: {
      steps: ['座標化', '計算內積', '幾何驗證'],
      checks: ['垂直⇔內積0']
    },
    error_patterns: [
      { pattern: '把內積當外積', note: '與面積/法向量無關' }
    ]
  },
  {
    id: 'kp3',
    code: 'STAT_REGRESSION_LINE',
    name: '迴歸直線',
    description: 'y=ax+b，用最適線做預測與解釋',
    category: '數據分析',
    strategy_template: {
      steps: ['確定x,y角色', '估/求 a,b', '殘差合理性檢核'],
      checks: ['r 與 a 號向一致']
    },
    error_patterns: [
      { pattern: '把自變與應變對調', note: '閱讀題敘定義' }
    ]
  },
  {
    id: 'kp4',
    code: 'PROB_BAYES',
    name: '貝氏定理',
    description: 'P(A|B)=P(B|A)P(A)/P(B)',
    category: '機率',
    strategy_template: {
      steps: ['畫全機率樹/表', '列式計算', '檢核邊界'],
      checks: ['條件事件定義清楚']
    },
    error_patterns: [
      { pattern: '條件倒置', note: 'P(A|B)≠P(B|A)' }
    ]
  }
]

function createStem(primaryKeypoint: any) {
  return `下列哪一個描述最符合「${primaryKeypoint.name}」？`
}

function createCorrectStatement(keypoint: any) {
  return keypoint.description || `${keypoint.name} 的核心做法。`
}

function createDistractorStatement(distractor: any) {
  const pattern = distractor.error_patterns?.[0]?.pattern
  const note = distractor.error_patterns?.[0]?.note
  if (pattern && note) {
    return `常見誤解：「${pattern}」，忽略了 ${note}`
  }
  if (pattern) {
    return `常見誤解：「${pattern}」`
  }
  return `${distractor.name}：容易和主考點混淆`
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { prompt, subject: subjectInput, detected_keypoint } = KeypointMCQRequestSchema.parse(body)

    // Simple subject detection
    let subjectName = subjectInput || 'MathA'
    let detectionConfidence = 0.8

    // Find primary keypoint based on prompt or detected keypoint
    let primaryKeypoint = mockKeypoints.find(kp => kp.code === detected_keypoint)

    if (!primaryKeypoint) {
      // Simple text matching
      const promptLower = prompt.toLowerCase()
      primaryKeypoint = mockKeypoints.find(kp =>
        promptLower.includes(kp.name.toLowerCase()) ||
        promptLower.includes(kp.description?.toLowerCase() || '')
      ) || mockKeypoints[0] // fallback
    }

    // Get distractors (other keypoints)
    const distractors = mockKeypoints.filter(kp => kp.id !== primaryKeypoint.id).slice(0, 3)

    const options = [
      {
        label: createCorrectStatement(primaryKeypoint),
        keypoint_code: primaryKeypoint.code,
        is_correct: true
      },
      ...distractors.map((kp) => ({
        label: createDistractorStatement(kp),
        keypoint_code: kp.code,
        is_correct: false
      }))
    ]

    const shuffled = shuffleArray(options)
    const answerIndex = shuffled.findIndex((opt) => opt.is_correct)

    // Mock session ID
    const sessionId = `session_${Date.now()}`

    const responseOptions = shuffled.map((option, index) => ({
      id: `opt_${index}`,
      label: option.label,
      is_correct: option.is_correct
    }))

    // Create Contract v2 response
    const { createWarmupResponse } = await import('@/lib/contract-v2')
    const { trackAPICall, trackError } = await import('@/lib/heartbeat')

    const contractResponse = createWarmupResponse(
      sessionId,
      subjectName as Subject,
      {
        id: primaryKeypoint.id,
        code: primaryKeypoint.code,
        name: primaryKeypoint.name,
        category: primaryKeypoint.category
      },
      {
        stem: createStem(primaryKeypoint),
        options: responseOptions
      },
      {
        confidence: detectionConfidence,
        telemetry: {
          latency_ms: Date.now() - startTime,
          model_used: 'mock'
        }
      }
    )

    const latency = Date.now() - startTime
    trackAPICall('/api/warmup/keypoint-mcq-simple', latency, true, contractResponse)

    return NextResponse.json(contractResponse)

  } catch (error) {
    const { trackAPICall, trackError } = await import('@/lib/heartbeat')
    const latency = Date.now() - startTime
    trackAPICall('/api/warmup/keypoint-mcq-simple', latency, false)

    console.error('Keypoint MCQ API error:', error)

    if (error instanceof z.ZodError) {
      trackError('Validation error in /api/warmup/keypoint-mcq-simple')
      return NextResponse.json(
        {
          error: 'invalid_request',
          details: error.issues
        },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    trackError(`Warmup error: ${errorMessage}`)

    return NextResponse.json(
      {
        error: 'internal_error',
        message: errorMessage
      },
      { status: 500 }
    )
  }
}
