'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { ErrorBookCard } from '@/components/backpack/ErrorBookCard'

interface ErrorBookItem {
  id: string
  question_id: string
  status: string
  last_attempted_at: string
  created_at: string
  pack_questions: {
    id: string
    stem: string
    choices: string[]
    answer: string
    explanation?: string
    difficulty?: string
    packs: {
      id: string
      subject: string
      skill: string
    }
  }
}

/**
 * 🎯 Phase A: 科目詳情頁 - 錯題 / 題本 Tab
 * 只在點進科目後才顯示
 */
export default function SubjectDetailPage({
  params,
}: {
  params: { subject: string }
}) {
  const [showEditMode, setShowEditMode] = useState(false)
  const [errorBookItems, setErrorBookItems] = useState<ErrorBookItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 科目名稱映射
  const subjectNames: Record<string, string> = {
    'english': '英文',
    'chinese': '國文',
    'math': '數學',
    'science': '自然',
    'social': '社會',
  }

  const subjectName = subjectNames[params.subject] || params.subject

  // Fetch error book items for this subject
  useEffect(() => {
    async function fetchErrorBook() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/error-book?subject=${params.subject}&status=active`)

        if (!response.ok) {
          throw new Error('Failed to fetch error book')
        }

        const data = await response.json()
        setErrorBookItems(data.items || [])
      } catch (err) {
        console.error('Error fetching error book:', err)
        setError('載入錯題失敗，請稍後再試')
      } finally {
        setIsLoading(false)
      }
    }

    fetchErrorBook()
  }, [params.subject])

  // Helper function for relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays} 天前`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`
    return `${Math.floor(diffDays / 30)} 個月前`
  }

  return (
    <>
      <main className="mx-auto max-w-lg px-4 py-6">
        {/* 🎯 Phase A: Tab 切換 - 錯題 / 題本 */}
        <Tabs defaultValue="mistakes" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="mistakes">錯題</TabsTrigger>
            <TabsTrigger value="packs">題本</TabsTrigger>
          </TabsList>

          <TabsContent value="mistakes">
            {/* 錯題列表 */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">載入中...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : errorBookItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">還沒有錯題</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  完成對戰後，點擊「儲存錯題」<br />即可將錯題加入錯題本
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {errorBookItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ErrorBookCard
                      item={item}
                      onClick={() => {
                        // TODO: Navigate to question detail
                        console.log('View question:', item.id)
                      }}
                      subjectName={subjectName}
                      getRelativeTime={getRelativeTime}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="packs">
            {/* 題本列表 */}
            <div className="text-center text-muted-foreground py-8">
              題本列表（待實作）
            </div>
          </TabsContent>
        </Tabs>

        {/* 編輯模式面板 */}
        {showEditMode && (
          <div className="fixed bottom-24 left-0 right-0 bg-card border-t p-4 shadow-lg z-50">
            <div className="mx-auto max-w-lg flex gap-3">
              <Button variant="outline" className="flex-1">批次選取</Button>
              <Button variant="outline" className="flex-1">匯入</Button>
              <Button variant="outline" className="flex-1">分享</Button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
