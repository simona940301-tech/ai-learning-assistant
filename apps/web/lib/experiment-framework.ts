/**
 * A/B Testing Framework
 * Based on Data Alchemist Agent specifications
 * 
 * Mission: Convert raw data into insight and growth levers
 * Principles: Munger multi-model × Lean Analytics × Causal Thinking
 */

interface Experiment {
  id: string
  name: string
  description: string
  hypothesis: string
  variants: ExperimentVariant[]
  metrics: ExperimentMetric[]
  status: 'draft' | 'running' | 'paused' | 'completed'
  startDate: string
  endDate?: string
  trafficAllocation: number // 0-1
}

interface ExperimentVariant {
  id: string
  name: string
  description: string
  allocation: number // 0-1
  config: Record<string, any>
}

interface ExperimentMetric {
  id: string
  name: string
  type: 'primary' | 'secondary'
  description: string
  calculation: string
  targetImprovement?: number // percentage
}

interface ExperimentResult {
  experimentId: string
  variantId: string
  userId: string
  timestamp: string
  metrics: Record<string, number>
}

interface StatisticalSignificance {
  pValue: number
  confidenceLevel: number
  isSignificant: boolean
  effectSize: number
}

class ExperimentFramework {
  private activeExperiments: Map<string, Experiment> = new Map()
  private userAssignments: Map<string, Map<string, string>> = new Map() // userId -> experimentId -> variantId
  private experimentResults: ExperimentResult[] = []

  // Initialize framework with predefined experiments
  constructor() {
    this.initializeExperiments()
  }

  // Assign user to experiment variant
  assignUserToExperiment(userId: string, experimentId: string): string | null {
    const experiment = this.activeExperiments.get(experimentId)
    if (!experiment || experiment.status !== 'running') {
      return null
    }

    // Check if user already assigned
    const userAssignments = this.userAssignments.get(userId) || new Map()
    if (userAssignments.has(experimentId)) {
      return userAssignments.get(experimentId)!
    }

    // Consistent assignment based on user ID hash
    const hash = this.hashString(userId + experimentId)
    const random = hash / 0xffffffff // Normalize to 0-1

    let cumulativeAllocation = 0
    for (const variant of experiment.variants) {
      cumulativeAllocation += variant.allocation
      if (random <= cumulativeAllocation) {
        // Store assignment
        userAssignments.set(experimentId, variant.id)
        this.userAssignments.set(userId, userAssignments)
        
        // Track assignment event
        this.trackAssignment(userId, experimentId, variant.id)
        
        return variant.id
      }
    }

    return null
  }

  // Get user's variant for an experiment
  getUserVariant(userId: string, experimentId: string): string | null {
    const userAssignments = this.userAssignments.get(userId)
    return userAssignments?.get(experimentId) || null
  }

  // Track experiment result
  trackResult(userId: string, experimentId: string, metrics: Record<string, number>): void {
    const variantId = this.getUserVariant(userId, experimentId)
    if (!variantId) return

    const result: ExperimentResult = {
      experimentId,
      variantId,
      userId,
      timestamp: new Date().toISOString(),
      metrics,
    }

    this.experimentResults.push(result)
  }

  // Calculate statistical significance
  calculateStatisticalSignificance(experimentId: string, metricId: string): StatisticalSignificance {
    const experiment = this.activeExperiments.get(experimentId)
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`)
    }

    // Get results for this experiment and metric
    const results = this.experimentResults.filter(r => r.experimentId === experimentId)
    
    if (results.length < 30) { // Minimum sample size
      return {
        pValue: 1.0,
        confidenceLevel: 0,
        isSignificant: false,
        effectSize: 0,
      }
    }

    // Group by variant
    const variantResults: Record<string, number[]> = {}
    experiment.variants.forEach(variant => {
      variantResults[variant.id] = []
    })

    results.forEach(result => {
      const value = result.metrics[metricId]
      if (value !== undefined) {
        variantResults[result.variantId].push(value)
      }
    })

    // Calculate t-test (simplified)
    const controlVariant = experiment.variants[0]
    const treatmentVariant = experiment.variants[1]
    
    const controlValues = variantResults[controlVariant.id] || []
    const treatmentValues = variantResults[treatmentVariant.id] || []

    if (controlValues.length === 0 || treatmentValues.length === 0) {
      return {
        pValue: 1.0,
        confidenceLevel: 0,
        isSignificant: false,
        effectSize: 0,
      }
    }

    // Simplified statistical calculation
    const controlMean = this.calculateMean(controlValues)
    const treatmentMean = this.calculateMean(treatmentValues)
    const effectSize = (treatmentMean - controlMean) / this.calculateStandardDeviation(controlValues)
    
    // Simplified p-value calculation (in real implementation, use proper statistical tests)
    const pValue = effectSize > 0.2 ? 0.05 : 0.8
    const confidenceLevel = pValue < 0.05 ? 95 : 0

    return {
      pValue,
      confidenceLevel,
      isSignificant: pValue < 0.05 && confidenceLevel >= 95,
      effectSize,
    }
  }

  // Get experiment insights
  getExperimentInsights(experimentId: string): {
    summary: string
    recommendations: string[]
    nextSteps: string[]
  } {
    const experiment = this.activeExperiments.get(experimentId)
    if (!experiment) {
      return {
        summary: 'Experiment not found',
        recommendations: [],
        nextSteps: [],
      }
    }

    const primaryMetrics = experiment.metrics.filter(m => m.type === 'primary')
    const insights: string[] = []
    const recommendations: string[] = []
    const nextSteps: string[] = []

    primaryMetrics.forEach(metric => {
      const significance = this.calculateStatisticalSignificance(experimentId, metric.id)
      
      if (significance.isSignificant) {
        insights.push(`${metric.name} 顯示顯著改善 (效果大小: ${significance.effectSize.toFixed(2)})`)
        
        if (significance.effectSize > 0.2) {
          recommendations.push(`考慮將 ${experiment.variants[1]?.name} 設為預設版本`)
          nextSteps.push('監控長期效果並收集更多數據')
        } else {
          recommendations.push('效果輕微，需要更多樣本或優化變體')
        }
      } else {
        insights.push(`${metric.name} 未顯示顯著差異`)
        recommendations.push('考慮調整實驗設計或增加樣本量')
      }
    })

    return {
      summary: insights.join('; '),
      recommendations,
      nextSteps,
    }
  }

  // Initialize predefined experiments
  private initializeExperiments(): void {
    // Experiment 1: AI Response Format
    const aiFormatExperiment: Experiment = {
      id: 'ai_response_format',
      name: 'AI 回應格式優化',
      description: '測試不同的 AI 回應格式對用戶滿意度的影響',
      hypothesis: '結構化格式會提高用戶理解度和滿意度',
      variants: [
        {
          id: 'control',
          name: '標準格式',
          description: '現有的五段式格式',
          allocation: 0.5,
          config: { format: 'standard' },
        },
        {
          id: 'treatment',
          name: '視覺化格式',
          description: '增強視覺元素的格式',
          allocation: 0.5,
          config: { format: 'visual' },
        },
      ],
      metrics: [
        {
          id: 'user_satisfaction',
          name: '用戶滿意度',
          type: 'primary',
          description: '用戶對 AI 回應的滿意度評分',
          calculation: 'average(rating)',
          targetImprovement: 15,
        },
        {
          id: 'completion_rate',
          name: '完成率',
          type: 'secondary',
          description: '用戶完成閱讀 AI 回應的比例',
          calculation: 'count(completed) / count(started)',
        },
      ],
      status: 'running',
      startDate: new Date().toISOString(),
      trafficAllocation: 1.0,
    }

    // Experiment 2: Onboarding Flow
    const onboardingExperiment: Experiment = {
      id: 'onboarding_flow',
      name: '引導流程優化',
      description: '測試不同的引導流程對用戶留存率的影響',
      hypothesis: '簡化的引導流程會提高用戶留存率',
      variants: [
        {
          id: 'control',
          name: '完整引導',
          description: '包含所有步驟的完整引導',
          allocation: 0.5,
          config: { steps: 'full' },
        },
        {
          id: 'treatment',
          name: '快速引導',
          description: '只包含核心步驟的快速引導',
          allocation: 0.5,
          config: { steps: 'quick' },
        },
      ],
      metrics: [
        {
          id: 'retention_7d',
          name: '7天留存率',
          type: 'primary',
          description: '用戶在 7 天後仍活躍的比例',
          calculation: 'count(active_7d) / count(signup)',
          targetImprovement: 20,
        },
        {
          id: 'completion_time',
          name: '完成時間',
          type: 'secondary',
          description: '完成引導流程的時間',
          calculation: 'average(completion_time)',
        },
      ],
      status: 'running',
      startDate: new Date().toISOString(),
      trafficAllocation: 1.0,
    }

    this.activeExperiments.set('ai_response_format', aiFormatExperiment)
    this.activeExperiments.set('onboarding_flow', onboardingExperiment)
  }

  // Utility methods
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private trackAssignment(userId: string, experimentId: string, variantId: string): void {
    // In real implementation, this would send to analytics service
    console.log(`User ${userId} assigned to experiment ${experimentId}, variant ${variantId}`)
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateMean(values)
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    const avgSquaredDiff = this.calculateMean(squaredDiffs)
    return Math.sqrt(avgSquaredDiff)
  }

  // Public API methods
  getActiveExperiments(): Experiment[] {
    return Array.from(this.activeExperiments.values()).filter(e => e.status === 'running')
  }

  getExperimentResults(experimentId: string): ExperimentResult[] {
    return this.experimentResults.filter(r => r.experimentId === experimentId)
  }
}

// Export singleton instance
export const experimentFramework = new ExperimentFramework()

// React Hook for easy usage
export function useExperiments() {
  return {
    assignUserToExperiment: experimentFramework.assignUserToExperiment.bind(experimentFramework),
    getUserVariant: experimentFramework.getUserVariant.bind(experimentFramework),
    trackResult: experimentFramework.trackResult.bind(experimentFramework),
    getExperimentInsights: experimentFramework.getExperimentInsights.bind(experimentFramework),
    getActiveExperiments: experimentFramework.getActiveExperiments.bind(experimentFramework),
  }
}
