/**
 * Ethical Guardian System
 * Based on Ethical Guardian Agent specifications
 * 
 * Mission: Protect user well-being while optimizing performance
 * Principles: Transparency × Consent × Positive Psychology
 */

interface EthicalRisk {
  id: string
  category: 'privacy' | 'bias' | 'addiction' | 'fairness' | 'transparency'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  mitigation: string
  detectionCriteria: string[]
}

interface TrustMetric {
  id: string
  name: string
  description: string
  value: number // 0-100
  trend: 'improving' | 'stable' | 'declining'
  lastUpdated: string
}

interface SafeguardPolicy {
  id: string
  name: string
  description: string
  trigger: string
  action: string
  uxIntervention?: string
}

interface EthicalAudit {
  timestamp: string
  overallScore: number // 0-100
  risks: EthicalRisk[]
  recommendations: string[]
  complianceStatus: 'compliant' | 'needs_attention' | 'non_compliant'
}

class EthicalGuardian {
  private trustMetrics: Map<string, TrustMetric> = new Map()
  private activeSafeguards: Map<string, SafeguardPolicy> = new Map()
  private auditHistory: EthicalAudit[] = []

  constructor() {
    this.initializeTrustMetrics()
    this.initializeSafeguards()
  }

  // Review design/system for ethical risk
  auditSystem(): EthicalAudit {
    const risks = this.identifyRisks()
    const overallScore = this.calculateOverallScore(risks)
    const recommendations = this.generateRecommendations(risks)
    const complianceStatus = this.determineComplianceStatus(overallScore, risks)

    const audit: EthicalAudit = {
      timestamp: new Date().toISOString(),
      overallScore,
      risks,
      recommendations,
      complianceStatus,
    }

    this.auditHistory.push(audit)
    return audit
  }

  // Monitor AI interactions for bias
  monitorAIInteraction(prompt: string, response: string, userId: string): {
    biasDetected: boolean
    biasType?: string
    recommendations: string[]
  } {
    const biasChecks = [
      this.checkGenderBias(prompt, response),
      this.checkCulturalBias(prompt, response),
      this.checkAbilityBias(prompt, response),
      this.checkSocioeconomicBias(prompt, response),
    ]

    const detectedBiases = biasChecks.filter(check => check.detected)
    
    if (detectedBiases.length > 0) {
      // Update trust metrics
      this.updateTrustMetric('ai_fairness', -5)
      
      return {
        biasDetected: true,
        biasType: detectedBiases[0].type,
        recommendations: detectedBiases.map(bias => bias.recommendation),
      }
    }

    // No bias detected, improve trust
    this.updateTrustMetric('ai_fairness', 2)
    
    return {
      biasDetected: false,
      recommendations: [],
    }
  }

  // Monitor user engagement for addiction risk
  monitorEngagementPatterns(userId: string, sessionData: {
    duration: number
    frequency: number
    intensity: number
  }): {
    riskLevel: 'low' | 'medium' | 'high'
    interventions: string[]
    recommendations: string[]
  } {
    const { duration, frequency, intensity } = sessionData
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    const interventions: string[] = []
    const recommendations: string[] = []

    // Check for excessive usage patterns
    if (duration > 2 * 60 * 60 * 1000) { // More than 2 hours
      riskLevel = 'high'
      interventions.push('session_break_reminder')
      recommendations.push('Implement mandatory break after 2 hours')
    } else if (duration > 60 * 60 * 1000) { // More than 1 hour
      riskLevel = 'medium'
      interventions.push('gentle_break_suggestion')
      recommendations.push('Suggest breaks for extended sessions')
    }

    // Check for compulsive usage
    if (frequency > 20) { // More than 20 sessions per day
      riskLevel = 'high'
      interventions.push('usage_limit_warning')
      recommendations.push('Implement daily usage limits')
    } else if (frequency > 10) {
      riskLevel = 'medium'
      interventions.push('usage_awareness_reminder')
      recommendations.push('Monitor usage patterns closely')
    }

    // Check for high intensity usage
    if (intensity > 0.9) { // Very high engagement
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel
      interventions.push('balance_reminder')
      recommendations.push('Encourage balanced learning approach')
    }

    // Update trust metrics based on risk level
    if (riskLevel === 'high') {
      this.updateTrustMetric('user_wellbeing', -10)
    } else if (riskLevel === 'medium') {
      this.updateTrustMetric('user_wellbeing', -3)
    } else {
      this.updateTrustMetric('user_wellbeing', 1)
    }

    return { riskLevel, interventions, recommendations }
  }

  // Ensure data privacy compliance
  auditDataPrivacy(): {
    compliant: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check data collection practices
    const dataCollectionChecks = [
      {
        check: 'minimal_data_collection',
        passed: this.checkMinimalDataCollection(),
        issue: 'Collecting more data than necessary',
        recommendation: 'Implement data minimization principle',
      },
      {
        check: 'explicit_consent',
        passed: this.checkExplicitConsent(),
        issue: 'Missing explicit user consent',
        recommendation: 'Implement clear consent mechanisms',
      },
      {
        check: 'data_retention',
        passed: this.checkDataRetention(),
        issue: 'Data retention period unclear',
        recommendation: 'Define clear data retention policies',
      },
      {
        check: 'data_sharing',
        passed: this.checkDataSharing(),
        issue: 'Unclear data sharing practices',
        recommendation: 'Transparent data sharing policies',
      },
    ]

    dataCollectionChecks.forEach(check => {
      if (!check.passed) {
        issues.push(check.issue)
        recommendations.push(check.recommendation)
      }
    })

    const compliant = issues.length === 0
    
    if (compliant) {
      this.updateTrustMetric('data_privacy', 5)
    } else {
      this.updateTrustMetric('data_privacy', -10)
    }

    return { compliant, issues, recommendations }
  }

  // Generate trust metric suggestions
  getTrustMetrics(): TrustMetric[] {
    return Array.from(this.trustMetrics.values())
  }

  // Get safeguard recommendations
  getSafeguardRecommendations(): SafeguardPolicy[] {
    return Array.from(this.activeSafeguards.values())
  }

  // Private methods for risk identification
  private identifyRisks(): EthicalRisk[] {
    const risks: EthicalRisk[] = []

    // AI Bias Risk
    risks.push({
      id: 'ai_bias',
      category: 'bias',
      severity: 'medium',
      description: 'AI responses may contain unconscious bias',
      impact: 'Unequal learning experiences for different user groups',
      mitigation: 'Implement bias detection and mitigation systems',
      detectionCriteria: ['gender_terms', 'cultural_references', 'ability_assumptions'],
    })

    // Data Privacy Risk
    risks.push({
      id: 'data_privacy',
      category: 'privacy',
      severity: 'high',
      description: 'User data collection and storage practices',
      impact: 'Potential privacy violations and data breaches',
      mitigation: 'Implement privacy-by-design principles',
      detectionCriteria: ['data_minimization', 'consent_mechanisms', 'retention_policies'],
    })

    // Addiction Risk
    risks.push({
      id: 'addiction_risk',
      category: 'addiction',
      severity: 'medium',
      description: 'Excessive usage patterns leading to dependency',
      impact: 'Negative impact on user well-being and life balance',
      mitigation: 'Implement usage monitoring and break reminders',
      detectionCriteria: ['session_duration', 'frequency', 'compulsive_patterns'],
    })

    // Fairness Risk
    risks.push({
      id: 'accessibility_fairness',
      category: 'fairness',
      severity: 'high',
      description: 'Unequal access for users with different abilities',
      impact: 'Exclusion of users with disabilities or different learning needs',
      mitigation: 'Implement accessibility standards and inclusive design',
      detectionCriteria: ['accessibility_compliance', 'inclusive_features', 'alternative_formats'],
    })

    return risks
  }

  private calculateOverallScore(risks: EthicalRisk[]): number {
    const severityWeights = { low: 1, medium: 3, high: 5, critical: 10 }
    const totalWeight = risks.reduce((sum, risk) => sum + severityWeights[risk.severity], 0)
    const maxPossibleWeight = risks.length * 10
    return Math.max(0, 100 - (totalWeight / maxPossibleWeight) * 100)
  }

  private generateRecommendations(risks: EthicalRisk[]): string[] {
    return risks.map(risk => risk.mitigation)
  }

  private determineComplianceStatus(score: number, risks: EthicalRisk[]): 'compliant' | 'needs_attention' | 'non_compliant' {
    const criticalRisks = risks.filter(r => r.severity === 'critical').length
    const highRisks = risks.filter(r => r.severity === 'high').length

    if (criticalRisks > 0 || score < 60) {
      return 'non_compliant'
    } else if (highRisks > 2 || score < 80) {
      return 'needs_attention'
    } else {
      return 'compliant'
    }
  }

  // Bias detection methods
  private checkGenderBias(prompt: string, response: string): { detected: boolean; type: string; recommendation: string } {
    const genderBiasedTerms = ['他總是', '她通常', '男生比較', '女生比較']
    const detected = genderBiasedTerms.some(term => response.includes(term))
    
    return {
      detected,
      type: 'gender_bias',
      recommendation: 'Use gender-neutral language in AI responses',
    }
  }

  private checkCulturalBias(prompt: string, response: string): { detected: boolean; type: string; recommendation: string } {
    const culturalAssumptions = ['西方文化', '東方思維', '美國式', '中國式']
    const detected = culturalAssumptions.some(term => response.includes(term))
    
    return {
      detected,
      type: 'cultural_bias',
      recommendation: 'Avoid cultural assumptions in educational content',
    }
  }

  private checkAbilityBias(prompt: string, response: string): { detected: boolean; type: string; recommendation: string } {
    const abilityAssumptions = ['正常學生', '一般能力', '普通水平']
    const detected = abilityAssumptions.some(term => response.includes(term))
    
    return {
      detected,
      type: 'ability_bias',
      recommendation: 'Use inclusive language that accommodates all abilities',
    }
  }

  private checkSocioeconomicBias(prompt: string, response: string): { detected: boolean; type: string; recommendation: string } {
    const socioeconomicTerms = ['有錢人家', '貧困家庭', '中產階級']
    const detected = socioeconomicTerms.some(term => response.includes(term))
    
    return {
      detected,
      type: 'socioeconomic_bias',
      recommendation: 'Avoid socioeconomic assumptions in content',
    }
  }

  // Privacy compliance checks
  private checkMinimalDataCollection(): boolean {
    // Implementation would check actual data collection practices
    return true // Placeholder
  }

  private checkExplicitConsent(): boolean {
    // Implementation would check consent mechanisms
    return true // Placeholder
  }

  private checkDataRetention(): boolean {
    // Implementation would check data retention policies
    return true // Placeholder
  }

  private checkDataSharing(): boolean {
    // Implementation would check data sharing practices
    return true // Placeholder
  }

  // Trust metric management
  private updateTrustMetric(metricId: string, change: number): void {
    const metric = this.trustMetrics.get(metricId)
    if (metric) {
      metric.value = Math.max(0, Math.min(100, metric.value + change))
      metric.lastUpdated = new Date().toISOString()
      metric.trend = change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable'
    }
  }

  // Initialize systems
  private initializeTrustMetrics(): void {
    const metrics = [
      {
        id: 'ai_fairness',
        name: 'AI 公平性',
        description: 'AI 回應的公平性和無偏見程度',
        value: 85,
        trend: 'stable' as const,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'data_privacy',
        name: '數據隱私',
        description: '用戶數據隱私保護程度',
        value: 90,
        trend: 'stable' as const,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'user_wellbeing',
        name: '用戶福祉',
        description: '對用戶身心健康的重視程度',
        value: 88,
        trend: 'stable' as const,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'transparency',
        name: '透明度',
        description: '系統運作和決策的透明度',
        value: 82,
        trend: 'improving' as const,
        lastUpdated: new Date().toISOString(),
      },
    ]

    metrics.forEach(metric => {
      this.trustMetrics.set(metric.id, metric)
    })
  }

  private initializeSafeguards(): void {
    const safeguards: SafeguardPolicy[] = [
      {
        id: 'session_break_reminder',
        name: '會話休息提醒',
        description: '長時間使用時提醒用戶休息',
        trigger: 'session_duration > 2_hours',
        action: 'show_break_reminder',
        uxIntervention: 'Gentle reminder with break suggestions',
      },
      {
        id: 'usage_limit_warning',
        name: '使用限制警告',
        description: '過度使用時警告用戶',
        trigger: 'daily_sessions > 20',
        action: 'show_usage_warning',
        uxIntervention: 'Warning modal with usage statistics',
      },
      {
        id: 'bias_detection_alert',
        name: '偏見檢測警報',
        description: '檢測到 AI 偏見時警報',
        trigger: 'bias_detected',
        action: 'log_bias_incident',
        uxIntervention: 'Transparent explanation of bias detection',
      },
    ]

    safeguards.forEach(safeguard => {
      this.activeSafeguards.set(safeguard.id, safeguard)
    })
  }
}

// Export singleton instance
export const ethicalGuardian = new EthicalGuardian()

// React Hook for easy usage
export function useEthicalGuardian() {
  return {
    auditSystem: ethicalGuardian.auditSystem.bind(ethicalGuardian),
    monitorAIInteraction: ethicalGuardian.monitorAIInteraction.bind(ethicalGuardian),
    monitorEngagementPatterns: ethicalGuardian.monitorEngagementPatterns.bind(ethicalGuardian),
    auditDataPrivacy: ethicalGuardian.auditDataPrivacy.bind(ethicalGuardian),
    getTrustMetrics: ethicalGuardian.getTrustMetrics.bind(ethicalGuardian),
    getSafeguardRecommendations: ethicalGuardian.getSafeguardRecommendations.bind(ethicalGuardian),
  }
}
