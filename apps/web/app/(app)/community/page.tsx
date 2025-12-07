'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Share2, Plus, Image as ImageIcon, HelpCircle, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { SkeletonList } from '@/components/ui/skeleton'
import { EmptyStateManager, useEmptyStateConditions } from '@/components/EmptyStateManager'

interface Post {
  id: string
  user: {
    id?: string
    name: string
    avatar: string | null
    is_anonymous: boolean
  }
  content: string
  images: string[]
  likes: number
  created_at: string
  question_metadata?: {
    questionText?: string
    options?: string[]
    correctAnswer?: string
    type?: string
  }
  is_question_post?: boolean
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins}分鐘前`
  if (diffHours < 24) return `${diffHours}小時前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-TW')
}

function CommunityPageContent() {
  const searchParams = useSearchParams()
  const { isCommunityEmpty } = useEmptyStateConditions()
  const [showComposer, setShowComposer] = useState(false)
  const [content, setContent] = useState('')
  const [mounted, setMounted] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    // 檢查 URL 參數中是否有 post ID（從求助學霸跳轉過來）
    const postId = searchParams.get('post')
    if (postId) {
      setHighlightPostId(postId)
    }
  }, [searchParams])

  useEffect(() => {
    // 載入貼文
    const loadPosts = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/community/posts?limit=20')
        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts || [])
        }
      } catch (error) {
        console.error('[CommunityPage] Failed to load posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPosts()
  }, [])

  return (
    <>
      <main className="mx-auto max-w-lg">
        {/* Removed Tabs - only showing latest posts */}
        <div className="sticky top-14 z-30 border-b bg-background/80 backdrop-blur-xl">
          <div className="h-12 flex items-center justify-center">
            <h2 className="text-base font-semibold text-foreground">最新貼文</h2>
          </div>
        </div>

        <div className="mt-0">
          {isLoading ? (
            <div className="p-4">
              <SkeletonList count={4} />
            </div>
          ) : (
            <EmptyStateManager
              type="community"
              condition={isCommunityEmpty(posts)}
            >
              <div className="divide-y">
                {posts.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={mounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: mounted ? idx * 0.1 : 0, duration: 0.3 }}
                    className={highlightPostId === post.id ? 'bg-indigo-500/10' : ''}
                  >
                    <article className="p-4">
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10">
                          {post.user.is_anonymous ? (
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              ?
                            </AvatarFallback>
                          ) : (
                            <>
                              <AvatarImage src={post.user.avatar || undefined} />
                              <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                            </>
                          )}
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {post.user.is_anonymous ? '匿名用戶' : post.user.name}
                            </span>
                            {post.is_question_post && (
                              <span className="flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-500">
                                <HelpCircle className="h-3 w-3" />
                                求助學霸
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(post.created_at)}
                            </span>
                          </div>

                          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">
                            {post.content}
                          </p>

                          {post.images.length > 0 && (
                            <div className={`mt-3 grid gap-1 ${post.images.length === 1 ? 'grid-cols-1' :
                              post.images.length === 2 ? 'grid-cols-2' :
                                'grid-cols-2'
                              }`}>
                              {post.images.map((img, i) => (
                                <div key={i} className="aspect-square overflow-hidden rounded-lg bg-muted" />
                              ))}
                            </div>
                          )}

                          <div className="mt-4 flex gap-6">
                            <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                              <Heart className="h-5 w-5" />
                              <span className="text-sm">{post.likes}</span>
                            </button>
                            <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                              <MessageCircle className="h-5 w-5" />
                            </button>
                            <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                              <Share2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  </motion.div>
                ))}
              </div>
            </EmptyStateManager>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowComposer(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      {/* Composer Dialog */}
      <Dialog open={showComposer} onOpenChange={setShowComposer}>
        <DialogContent className="top-0 max-w-lg translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle>新貼文</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <textarea
              placeholder="分享你的想法..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none"
            />

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm">
                <ImageIcon className="mr-2 h-4 w-4" />
                新增圖片
              </Button>

              <Button onClick={() => setShowComposer(false)}>發佈</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function CommunityPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    }>
      <CommunityPageContent />
    </Suspense>
  )
}
