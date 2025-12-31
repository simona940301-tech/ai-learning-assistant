'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Loader2, Check, Sparkles } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
// 確保 toast 可以正確導入

interface KnowledgeCurveHeatmapProps {
  skillMastery: Record<string, number> // { skillId: masteryLevel (0-1) }
}

interface SkillNote {
  skillId: string
  skillName: string
  content: string
  masteryLevel: number
}

/**
 * 知識曲線熱力圖組件 - 互動版本
 * 顯示用戶對各個知識點的掌握程度
 * 點擊低掌握度的知識點可生成筆記並加入錯題本
 */
export function KnowledgeCurveHeatmap({ skillMastery }: KnowledgeCurveHeatmapProps) {
  const skills = Object.entries(skillMastery)
  const [generatingNotes, setGeneratingNotes] = useState<Set<string>>(new Set())
  const [generatedNotes, setGeneratedNotes] = useState<Set<string>>(new Set())
  
  if (skills.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          暫無知識點數據
        </p>
      </Card>
    )
  }

  // 根據掌握度分組
  const masteryGroups = {
    excellent: skills.filter(([_, level]) => level >= 0.8),
    good: skills.filter(([_, level]) => level >= 0.6 && level < 0.8),
    fair: skills.filter(([_, level]) => level >= 0.4 && level < 0.6),
    poor: skills.filter(([_, level]) => level < 0.4),
  }

  const getMasteryColor = (level: number) => {
    if (level >= 0.8) return 'bg-green-500'
    if (level >= 0.6) return 'bg-blue-500'
    if (level >= 0.4) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getMasteryLabel = (level: number) => {
    if (level >= 0.8) return '優秀'
    if (level >= 0.6) return '良好'
    if (level >= 0.4) return '一般'
    return '需加強'
  }

  const handleSkillClick = async (skillId: string, skillName: string, masteryLevel: number) => {
    // 只允許點擊掌握度較低的知識點（< 60%）
    if (masteryLevel >= 0.6) {
      toast.info('掌握度良好，無需生成筆記')
      return
    }

    if (generatingNotes.has(skillId) || generatedNotes.has(skillId)) {
      return
    }

    setGeneratingNotes(prev => new Set([...prev, skillId]))

    try {
      const response = await fetch('/api/play/knowledge/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          skillId,
          skillName,
          masteryLevel,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedNotes(prev => new Set([...prev, skillId]))
        toast.success(`「${skillName}」的筆記已生成並加入錯題本！`, 3000)
      } else {
        toast.error(data.error || '生成筆記失敗', 3000)
      }
    } catch (error) {
      console.error('[KnowledgeCurveHeatmap] Failed to generate note:', error)
      toast.error('生成筆記失敗，請稍後重試', 3000)
    } finally {
      setGeneratingNotes(prev => {
        const next = new Set(prev)
        next.delete(skillId)
        return next
      })
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">知識點掌握度</h3>
        <p className="text-xs text-muted-foreground">
          點擊低掌握度的知識點可生成學習筆記
        </p>
      </div>
      
      <div className="space-y-3">
        {skills.map(([skillId, level]) => {
          const isClickable = level < 0.6
          const isGenerating = generatingNotes.has(skillId)
          const isGenerated = generatedNotes.has(skillId)

          return (
            <motion.div
              key={skillId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`group relative space-y-2 rounded-lg p-3 transition-all ${
                isClickable
                  ? 'cursor-pointer hover:bg-muted/50 hover:shadow-md'
                  : ''
              } ${isGenerated ? 'bg-green-500/5 border border-green-500/20' : ''}`}
              onClick={() => isClickable && handleSkillClick(skillId, skillId, level)}
              whileHover={isClickable ? { scale: 1.02 } : {}}
              whileTap={isClickable ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-medium text-sm">{skillId}</span>
                  {isClickable && (
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <BookOpen className="h-3 w-3 inline mr-1" />
                      點擊生成筆記
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isGenerating && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {isGenerated && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 text-green-600 dark:text-green-400"
                    >
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-medium">已生成</span>
                    </motion.div>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getMasteryColor(level)} text-white shadow-sm`}>
                    {getMasteryLabel(level)} ({Math.round(level * 100)}%)
                  </span>
                </div>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className={`h-full ${getMasteryColor(level)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${level * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                {isClickable && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 圖例 */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>優秀 (80%+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>良好 (60-80%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span>一般 (40-60%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span>需加強 (&lt;40%)</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          <span>點擊生成筆記</span>
        </div>
      </div>
    </Card>
  )
}

