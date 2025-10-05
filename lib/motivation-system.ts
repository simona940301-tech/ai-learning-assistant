/**
 * Motivation System
 * Based on Cognitive Psychologist Agent specifications
 * 
 * Mission: Design positive feedback loops keeping students engaged
 * Principles: Behavioral Economics × Flow Theory × Octalysis
 */

interface MotivationTrigger {
  id: string
  type: 'visual' | 'audio' | 'haptic' | 'cognitive'
  intensity: 'subtle' | 'moderate' | 'strong'
  duration: number // milliseconds
}

interface FeedbackLoop {
  trigger: string
  action: string
  reward: string
  identity: string
}

interface LearningMilestone {
  id: string
  title: string
  description: string
  xpReward: number
  coinReward: number
  badge?: string
  unlockCondition: string
}

class MotivationSystem {
  private sessionStartTime: number
  private dailyStreak: number
  private currentXP: number
  private currentCoins: number
  private completedMilestones: Set<string> = new Set()

  // Octalysis Framework - 8 Core Drives
  private coreDrives = {
    epicMeaning: 0, // Purpose beyond self
    development: 0, // Progress and achievement
    empowerment: 0, // Creativity and feedback
    ownership: 0, // Ownership and possession
    socialPressure: 0, // Social influence
    scarcity: 0, // Impatience and desire
    unpredictability: 0, // Curiosity and mystery
    avoidance: 0, // Loss and avoidance
  }

  constructor() {
    this.sessionStartTime = Date.now()
    this.dailyStreak = this.loadDailyStreak()
    this.currentXP = this.loadCurrentXP()
    this.currentCoins = this.loadCurrentCoins()
    this.loadCompletedMilestones()
  }

  // 4-Step Loop: Triggers → Actions → Rewards → Identity
  createFeedbackLoop(action: string): FeedbackLoop {
    const trigger = this.generateTrigger(action)
    const reward = this.generateReward(action)
    const identity = this.generateIdentity(action)

    return {
      trigger,
      action,
      reward,
      identity,
    }
  }

  // Daily Login Motivation Trigger
  triggerDailyLogin(): void {
    const timeSinceLastLogin = this.getTimeSinceLastLogin()
    
    if (timeSinceLastLogin > 24 * 60 * 60 * 1000) { // 24 hours
      this.incrementStreak()
      this.awardStreakBonus()
      this.showStreakCelebration()
    }

    // Update core drives based on login frequency
    this.updateCoreDrives('development', 10)
    this.updateCoreDrives('ownership', 5)
  }

  // AI Interaction Completion Reward
  rewardAIInteraction(type: 'summary' | 'solve', success: boolean): void {
    if (success) {
      const xpGain = type === 'summary' ? 50 : 75
      const coinGain = type === 'summary' ? 10 : 15
      
      this.addXP(xpGain)
      this.addCoins(coinGain)
      
      // Trigger visual celebration
      this.showCelebration({
        type: 'visual',
        intensity: 'moderate',
        duration: 1000,
      })

      // Update core drives
      this.updateCoreDrives('development', 15)
      this.updateCoreDrives('empowerment', 10)
      this.updateCoreDrives('unpredictability', 5)
    }
  }

  // Progress Milestone Achievement
  checkMilestones(): LearningMilestone[] {
    const newMilestones: LearningMilestone[] = []
    const milestones = this.getAvailableMilestones()

    milestones.forEach(milestone => {
      if (!this.completedMilestones.has(milestone.id) && this.checkMilestoneCondition(milestone)) {
        this.completeMilestone(milestone)
        newMilestones.push(milestone)
      }
    })

    return newMilestones
  }

  // Intrinsic Motivation Metric
  calculateIntrinsicMotivation(): number {
    // Based on flow state indicators
    const sessionDuration = Date.now() - this.sessionStartTime
    const optimalSessionLength = 25 * 60 * 1000 // 25 minutes
    
    const timeScore = Math.min(sessionDuration / optimalSessionLength, 1)
    const progressScore = this.currentXP / 1000 // Normalize XP
    const engagementScore = this.calculateEngagementScore()
    
    // Weighted average of motivation factors
    return (timeScore * 0.3 + progressScore * 0.4 + engagementScore * 0.3) * 100
  }

  // Emotional Safety Checks
  performEmotionalSafetyCheck(): { safe: boolean; concerns: string[] } {
    const concerns: string[] = []

    // Check for frustration indicators
    if (this.getRecentErrorRate() > 0.3) {
      concerns.push('High error rate detected - may indicate frustration')
    }

    // Check for engagement drop
    if (this.calculateEngagementScore() < 0.5) {
      concerns.push('Low engagement detected - may need motivation boost')
    }

    // Check for session length (too short or too long)
    const sessionDuration = Date.now() - this.sessionStartTime
    if (sessionDuration < 2 * 60 * 1000) { // Less than 2 minutes
      concerns.push('Very short session - may indicate quick exit')
    } else if (sessionDuration > 60 * 60 * 1000) { // More than 1 hour
      concerns.push('Very long session - may indicate overuse')
    }

    return {
      safe: concerns.length === 0,
      concerns,
    }
  }

  // Private helper methods
  private generateTrigger(action: string): string {
    const triggers = {
      'ai_interaction': '✨ 準備開始學習',
      'file_upload': '📁 檔案已載入',
      'milestone_complete': '🏆 成就達成',
      'daily_login': '🌅 新的一天開始',
    }
    return triggers[action as keyof typeof triggers] || '🎯 準備行動'
  }

  private generateReward(action: string): string {
    const rewards = {
      'ai_interaction': `+${action === 'summary' ? '50' : '75'} XP`,
      'file_upload': '+10 XP',
      'milestone_complete': '+100 XP + 20 金幣',
      'daily_login': `連續 ${this.dailyStreak} 天`,
    }
    return rewards[action as keyof typeof rewards] || '+10 XP'
  }

  private generateIdentity(action: string): string {
    const identities = {
      'ai_interaction': '學習者',
      'file_upload': '資料整理師',
      'milestone_complete': '成就達人',
      'daily_login': '堅持學習者',
    }
    return identities[action as keyof typeof identities] || '學習者'
  }

  private showCelebration(trigger: MotivationTrigger): void {
    // Implementation would integrate with UI components
    console.log(`Celebration: ${trigger.type} ${trigger.intensity} for ${trigger.duration}ms`)
  }

  private showStreakCelebration(): void {
    // Implementation would show streak celebration UI
    console.log(`Streak celebration: ${this.dailyStreak} days!`)
  }

  private incrementStreak(): void {
    this.dailyStreak++
    this.saveDailyStreak()
  }

  private awardStreakBonus(): void {
    const bonus = Math.min(this.dailyStreak * 5, 100) // Max 100 coins
    this.addCoins(bonus)
  }

  private addXP(amount: number): void {
    this.currentXP += amount
    this.saveCurrentXP()
  }

  private addCoins(amount: number): void {
    this.currentCoins += amount
    this.saveCurrentCoins()
  }

  private updateCoreDrives(drive: keyof typeof this.coreDrives, amount: number): void {
    this.coreDrives[drive] = Math.min(this.coreDrives[drive] + amount, 100)
  }

  private calculateEngagementScore(): number {
    // Based on recent interactions and time spent
    return Math.random() * 0.4 + 0.6 // Placeholder implementation
  }

  private getRecentErrorRate(): number {
    // Implementation would check recent error events
    return 0.1 // Placeholder
  }

  private getAvailableMilestones(): LearningMilestone[] {
    return [
      {
        id: 'first_ai_interaction',
        title: 'AI 助手初體驗',
        description: '完成第一次 AI 互動',
        xpReward: 100,
        coinReward: 20,
        unlockCondition: 'ai_interactions >= 1',
      },
      {
        id: 'daily_streak_7',
        title: '一週堅持',
        description: '連續學習 7 天',
        xpReward: 200,
        coinReward: 50,
        badge: '🏆',
        unlockCondition: 'daily_streak >= 7',
      },
      {
        id: 'xp_master',
        title: '經驗大師',
        description: '累積 1000 XP',
        xpReward: 300,
        coinReward: 100,
        badge: '⭐',
        unlockCondition: 'total_xp >= 1000',
      },
    ]
  }

  private checkMilestoneCondition(milestone: LearningMilestone): boolean {
    // Implementation would check actual conditions
    return false // Placeholder
  }

  private completeMilestone(milestone: LearningMilestone): void {
    this.completedMilestones.add(milestone.id)
    this.addXP(milestone.xpReward)
    this.addCoins(milestone.coinReward)
    this.saveCompletedMilestones()
  }

  // Storage methods (would integrate with actual storage)
  private loadDailyStreak(): number { return 1 }
  private loadCurrentXP(): number { return 0 }
  private loadCurrentCoins(): number { return 0 }
  private loadCompletedMilestones(): void {}
  private saveDailyStreak(): void {}
  private saveCurrentXP(): void {}
  private saveCurrentCoins(): void {}
  private saveCompletedMilestones(): void {}
  private getTimeSinceLastLogin(): number { return 0 }
}

// Export singleton instance
export const motivationSystem = new MotivationSystem()

// React Hook for easy usage
export function useMotivation() {
  return {
    triggerDailyLogin: motivationSystem.triggerDailyLogin.bind(motivationSystem),
    rewardAIInteraction: motivationSystem.rewardAIInteraction.bind(motivationSystem),
    checkMilestones: motivationSystem.checkMilestones.bind(motivationSystem),
    calculateIntrinsicMotivation: motivationSystem.calculateIntrinsicMotivation.bind(motivationSystem),
    performEmotionalSafetyCheck: motivationSystem.performEmotionalSafetyCheck.bind(motivationSystem),
  }
}
