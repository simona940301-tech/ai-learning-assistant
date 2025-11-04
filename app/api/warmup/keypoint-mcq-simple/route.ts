// HARD-KILL: Legacy warmup API has been deprecated
// All flows must use /api/solve instead
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Warmup flow has been deprecated. Use /api/solve instead.' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Warmup flow has been deprecated. Use /api/solve instead.' },
    { status: 410 }
  );
}

/* ARCHIVED CODE BELOW - DO NOT USE

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Subject } from '@/lib/contract-v2'

const KeypointMCQRequestSchema = z.object({
  prompt: z.string().min(1),
  subject: z.string().optional(),
  detected_keypoint: z.string().optional()
})

// Mock data for testing - SUBJECT-SPECIFIC
const ARCHIVED_mockKeypointsBySubject: Record<string, any[]> = {
  'english': [
    {
      id: 'eng1',
      code: 'VOCAB_CONTEXT',
      name: '語境選詞',
      description: '根據上下文選擇最合適的詞彙',
      category: '字彙',
      strategy_template: {
        steps: ['理解句意', '辨識語境線索', '排除不符選項'],
        checks: ['詞性是否符合', '語意是否通順']
      },
      error_patterns: [
        { pattern: '只看中譯', note: '需注意詞性與搭配' }
      ]
    },
    {
      id: 'eng2',
      code: 'GRAMMAR_CLAUSE',
      name: '子句辨析',
      description: '區分關係子句、名詞子句、副詞子句',
      category: '文法',
      strategy_template: {
        steps: ['找出連接詞', '判斷子句類型', '檢查句型結構'],
        checks: ['主詞動詞完整', '先行詞明確']
      },
      error_patterns: [
        { pattern: '混淆 that/which', note: '限定與非限定用法' }
      ]
    },
    {
      id: 'eng3',
      code: 'IDIOM_COLLOCATION',
      name: '固定搭配',
      description: '常用片語與慣用語',
      category: '片語',
      strategy_template: {
        steps: ['辨識核心詞', '回想固定用法', '驗證語意'],
        checks: ['介系詞正確', '動詞時態一致']
      },
      error_patterns: [
        { pattern: '逐字翻譯', note: '需整體理解' }
      ]
    },
    {
      id: 'eng4',
      code: 'READING_INFERENCE',
      name: '推論理解',
      description: '從文本推導隱含意義',
      category: '閱讀',
      strategy_template: {
        steps: ['找關鍵句', '連結上下文', '排除過度推論'],
        checks: ['證據充分', '邏輯合理']
      },
      error_patterns: [
        { pattern: '過度解讀', note: '要有明確文本支持' }
      ]
    }
  ],
  'matha': [
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
  ],
  'chinese': [
    {
      id: 'chi1',
      code: 'CONTEXT_FILL',
      name: '文意選填',
      description: '根據文意選擇合適詞語',
      category: '閱讀理解',
      strategy_template: {
        steps: ['通讀全文', '理解段落關係', '選擇最符合詞語'],
        checks: ['詞性正確', '語意通順']
      },
      error_patterns: [
        { pattern: '忽略前後文', note: '需整體把握' }
      ]
    },
    {
      id: 'chi2',
      code: 'RHETORIC',
      name: '修辭技巧',
      description: '辨識比喻、擬人、對偶等修辭',
      category: '國學常識',
      strategy_template: {
        steps: ['找修辭特徵', '分析表達效果', '判斷修辭類型'],
        checks: ['定義符合', '例句正確']
      },
      error_patterns: [
        { pattern: '混淆類似修辭', note: '注意定義差異' }
      ]
    },
    {
      id: 'chi3',
      code: 'CLASSICAL_CHINESE',
      name: '文言文理解',
      description: '翻譯與理解文言文',
      category: '古文',
      strategy_template: {
        steps: ['斷句', '解釋實詞虛詞', '直譯加意譯'],
        checks: ['語法結構', '文意合理']
      },
      error_patterns: [
        { pattern: '現代詞義誤用', note: '需查古義' }
      ]
    },
    {
      id: 'chi4',
      code: 'THEME_ANALYSIS',
      name: '主旨分析',
      description: '歸納文章中心思想',
      category: '閱讀理解',
      strategy_template: {
        steps: ['找主題句', '歸納段落大意', '總結中心思想'],
        checks: ['涵蓋全文', '簡明扼要']
      },
      error_patterns: [
        { pattern: '以偏概全', note: '需全面把握' }
      ]
    }
  ]
}

// Get keypoints for a specific subject, fallback to Math if not found
function getKeypointsForSubject(subject: string): any[] {
  const normalized = subject.toLowerCase()
  return mockKeypointsBySubject[normalized] || mockKeypointsBySubject['matha']
}

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

    // Subject detection with logging
    let subjectName = subjectInput || 'MathA'
    let detectionConfidence = 0.8
    
    console.log('[warmup-mcq] Subject input:', subjectInput, '→ Using:', subjectName)

    // Get subject-specific keypoints
    const mockKeypoints = getKeypointsForSubject(subjectName)
    console.log('[warmup-mcq] Loaded', mockKeypoints.length, 'keypoints for subject:', subjectName)

    // Find primary keypoint based on prompt or detected keypoint
    let primaryKeypoint = mockKeypoints.find(kp => kp.code === detected_keypoint)

    if (!primaryKeypoint) {
      // Simple text matching
      const promptLower = prompt.toLowerCase()
      primaryKeypoint = mockKeypoints.find(kp =>
        promptLower.includes(kp.name.toLowerCase()) ||
        promptLower.includes(kp.description?.toLowerCase() || '')
      ) || mockKeypoints[0] // fallback to first keypoint of this subject
    }
    
    console.log('[warmup-mcq] Selected keypoint:', primaryKeypoint.name, '(', primaryKeypoint.code, ')')

    // Get distractors (other keypoints from same subject)
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

*/
