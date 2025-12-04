'use client'

import { useState, useEffect } from 'react'
import { AppBar } from '@/components/layout/app-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Globe, FlaskConical, Calculator, Languages, Star, Download, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from '@/components/ui/Toast'
import type { QuestionSetWithDownloadStatus } from '@/lib/types/question-sets'
import { formatPrice } from '@/lib/types/question-sets'

const subjects = [
  { id: 'all', name: '全部', icon: null },
  { id: 'chinese', name: '國文', icon: BookOpen },
  { id: 'english', name: '英文', icon: Languages },
  { id: 'social', name: '社會', icon: Globe },
  { id: 'science', name: '自然', icon: FlaskConical },
  { id: 'math', name: '數學', icon: Calculator },
]

export default function StoreShopPage() {
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [sets, setSets] = useState<QuestionSetWithDownloadStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchSets()
  }, [selectedSubject])

  const fetchSets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedSubject !== 'all') {
        params.append('subject', selectedSubject)
      }

      const res = await fetch(`/api/store/question-sets?${params.toString()}`)
      const data = await res.json()

      if (data.sets) {
        setSets(data.sets)
      }
    } catch (error) {
      console.error('Failed to fetch sets:', error)
      toast.error('載入失敗：無法載入題本列表，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (setId: string, title: string) => {
    try {
      setDownloadingId(setId)
      const res = await fetch('/api/store/question-sets/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Download failed')
      }

      toast.success(data.is_duplicate ? `已存在：「${title}」已在您的背包中` : `下載成功：「${title}」已加入您的背包`)

      // Update local state
      setSets(prev => prev.map(s =>
        s.id === setId ? { ...s, is_downloaded: true, downloads: s.downloads + 1 } : s
      ))

    } catch (error) {
      toast.error(error instanceof Error ? `下載失敗：${error.message}` : '下載失敗：請稍後再試')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <>
      <AppBar title="題本商店" user={{ name: 'User', avatar: '' }} />

      <main className="mx-auto max-w-lg pb-20">
        {/* Subject Filter */}
        <div className="sticky top-14 z-30 border-b bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {subjects.map((subject) => {
              const Icon = subject.icon
              const isActive = selectedSubject === subject.id

              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {subject.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-6 px-4 pt-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : sets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              目前沒有相關題本
            </div>
          ) : (
            <div className="grid gap-4">
              {sets.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <div className="flex">
                      {/* Left: Cover Placeholder */}
                      <div className="w-24 bg-muted flex items-center justify-center text-muted-foreground">
                        <BookOpen className="h-8 w-8 opacity-20" />
                      </div>

                      {/* Right: Content */}
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {item.rating}
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {formatPrice(item.price)}
                          </div>

                          <Button
                            size="sm"
                            variant={item.is_downloaded ? "outline" : "default"}
                            disabled={downloadingId === item.id || item.is_downloaded}
                            onClick={() => handleDownload(item.id, item.title)}
                          >
                            {downloadingId === item.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : item.is_downloaded ? (
                              <>
                                <Check className="mr-1 h-4 w-4" />
                                已下載
                              </>
                            ) : (
                              <>
                                <Download className="mr-1 h-4 w-4" />
                                下載
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

































