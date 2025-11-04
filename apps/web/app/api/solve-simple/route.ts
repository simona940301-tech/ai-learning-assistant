import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Subject } from '@/lib/contract-v2'

const SolveRequestSchema = z
  .object({
    session_id: z.string().optional(),
    question_id: z.string().uuid().optional(),
    prompt: z.string().min(1).optional(),
    subject: z.string().optional(),
    keypoint_code: z.string().optional(),
    mode: z.enum(['step', 'fast']).default('step')
  })
  .refine(
    (data) => data.session_id || data.question_id || data.prompt,
    'Either session_id, question_id, or prompt must be provided'
  )

// Mock keypoint data
const mockKeypoints: Record<string, any> = {
  'TRIG_COS_LAW': {
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
  'VEC_DOT': {
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
  'STAT_REGRESSION_LINE': {
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
  }
}

function buildSummary(keypoint: any, mode: 'step' | 'fast') {
  const description = keypoint.description ?? keypoint.name
  const firstCheck = keypoint.strategy_template?.checks?.[0]
  const firstStep = keypoint.strategy_template?.steps?.[0]

  if (mode === 'fast') {
    if (firstCheck) return `${description}，關鍵是在${firstCheck}。`
    if (firstStep) return `${description}，採用：${firstStep}。`
    return description
  }

  const segments = [description]
  if (firstStep) segments.push(firstStep)
  if (firstCheck) segments.push(firstCheck)
  return segments.filter(Boolean).join('；')
}

function buildSteps(keypoint: any, mode: 'step' | 'fast'): string[] {
  if (mode === 'fast') return []
  return keypoint.strategy_template?.steps || []
}

function buildChecks(keypoint: any): string[] {
  return keypoint.strategy_template?.checks || []
}

function buildErrorHints(keypoint: any): string[] {
  const patterns = keypoint.error_patterns || []
  if (patterns.length === 0) return []

  return patterns.map(({ pattern, note }: any) => {
    if (note) {
      return `常見錯法：${pattern}。提示：${note}`
    }
    return `常見錯法：${pattern}`
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { session_id, question_id, prompt: promptInput, subject: subjectInput, keypoint_code, mode } =
      SolveRequestSchema.parse(body)

    const subjectName = subjectInput || 'MathA'

    // Determine primary keypoint
    let primaryKeypoint = mockKeypoints[keypoint_code || 'TRIG_COS_LAW'] // fallback

    if (session_id) {
      // Mock session data - in real implementation, this would come from database
      primaryKeypoint = mockKeypoints['TRIG_COS_LAW']
    }

    if (promptInput) {
      // Simple text matching to determine keypoint
      const promptLower = promptInput.toLowerCase()
      if (promptLower.includes('向量') || promptLower.includes('內積')) {
        primaryKeypoint = mockKeypoints['VEC_DOT']
      } else if (promptLower.includes('迴歸') || promptLower.includes('相關')) {
        primaryKeypoint = mockKeypoints['STAT_REGRESSION_LINE']
      } else if (promptLower.includes('餘弦') || promptLower.includes('三角形')) {
        primaryKeypoint = mockKeypoints['TRIG_COS_LAW']
      }
    }

    const steps = buildSteps(primaryKeypoint, mode)
    const checks = buildChecks(primaryKeypoint)
    const errorHints = buildErrorHints(primaryKeypoint)
    const summary = buildSummary(primaryKeypoint, mode)

    // Mock extensions
    const extensions = ['相關概念1', '相關概念2']

    // Create Contract v2 response
    const { createSolveResponse } = await import('@/lib/contract-v2')
    const { trackAPICall, trackError } = await import('@/lib/heartbeat')

    const contractResponse = createSolveResponse(
      session_id || `session_${Date.now()}`,
      subjectName as Subject,
      {
        id: primaryKeypoint.id,
        code: primaryKeypoint.code,
        name: primaryKeypoint.name,
        category: primaryKeypoint.category
      },
      {
        summary,
        steps,
        checks,
        error_hints: errorHints,
        extensions
      },
      {
        telemetry: {
          latency_ms: Date.now() - startTime,
          model_used: 'mock'
        }
      }
    )

    const latency = Date.now() - startTime
    trackAPICall('/api/solve-simple', latency, true, contractResponse)

    return NextResponse.json(contractResponse)

  } catch (error) {
    const { trackAPICall, trackError } = await import('@/lib/heartbeat')
    const latency = Date.now() - startTime
    trackAPICall('/api/solve-simple', latency, false)

    console.error('Solve API error:', error)

    if (error instanceof z.ZodError) {
      trackError('Validation error in /api/solve-simple')
      return NextResponse.json(
        {
          error: 'invalid_request',
          details: error.issues
        },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    trackError(`Solve error: ${errorMessage}`)

    return NextResponse.json(
      {
        error: 'internal_error',
        message: errorMessage
      },
      { status: 500 }
    )
  }
}
