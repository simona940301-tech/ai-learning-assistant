'use client'

import { useState, useEffect, Suspense, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SkeletonList } from '@/components/ui/skeleton'
import { EmptyStateManager, useEmptyStateConditions } from '@/components/EmptyStateManager'
import { PostComposer } from '@/components/community/PostComposer'
import { PostCard } from '@/components/community/PostCard'
import { ImageGallery } from '@/components/community/ImageGallery'
import { ChevronDown, Loader2 } from 'lucide-react'

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
  is_liked_by_me: boolean
  is_author: boolean
  created_at: string
  question_metadata?: any
  is_question_post?: boolean
}

interface User {
  name: string
  avatar?: string | null
}

function CommunityPageContent() {
  const searchParams = useSearchParams()
  const { isCommunityEmpty } = useEmptyStateConditions()
  const [mounted, setMounted] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  // Image gallery state
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    // Check URL params for highlighted post
    const postId = searchParams.get('post')
    if (postId) {
      setHighlightPostId(postId)
    }
  }, [searchParams])

  // Load user profile
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          setUser({
            name: data.profile?.username || data.profile?.display_name || '用戶',
            avatar: data.profile?.avatar_url,
          })
        }
      } catch (error) {
        console.error('[CommunityPage] Failed to load user:', error)
      }
    }
    loadUser()
  }, [])

  // Load initial posts
  const loadPosts = useCallback(async (cursor?: string) => {
    const isInitial = !cursor
    if (isInitial) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const url = cursor
        ? `/api/community/posts?limit=20&cursor=${encodeURIComponent(cursor)}`
        : '/api/community/posts?limit=20'

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (isInitial) {
          setPosts(data.posts || [])
        } else {
          setPosts((prev) => [...prev, ...(data.posts || [])])
        }
        setNextCursor(data.nextCursor)
      }
    } catch (error) {
      console.error('[CommunityPage] Failed to load posts:', error)
    } finally {
      if (isInitial) {
        setIsLoading(false)
      } else {
        setIsLoadingMore(false)
      }
    }
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
          loadPosts(nextCursor)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [nextCursor, isLoadingMore, loadPosts])

  const handlePostCreated = () => {
    loadPosts() // Reload posts
  }

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const handleImageClick = (images: string[], index: number) => {
    setGalleryImages(images)
    setGalleryIndex(index)
    setIsGalleryOpen(true)
  }

  return (
    <>
      <main
        className="mx-auto max-w-lg"
        style={{
          paddingBottom: 'var(--content-bottom-padding)',
        }}
      >
        {/* Header */}
        <div className="sticky top-14 z-30 border-b bg-background/80 backdrop-blur-xl">
          <div className="h-12 flex items-center justify-center">
            <h2 className="text-base font-semibold text-foreground">社群</h2>
          </div>
        </div>

        {/* Post Composer - Always Visible */}
        <div className="border-b bg-background">
          <PostComposer
            user={user || undefined}
            onPostCreated={handlePostCreated}
            className="p-4"
          />
        </div>

        {/* Posts Feed */}
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
                    transition={{ delay: mounted ? idx * 0.05 : 0, duration: 0.3 }}
                    className={highlightPostId === post.id ? 'bg-indigo-500/10' : ''}
                  >
                    <PostCard
                      post={post}
                      onDelete={handlePostDeleted}
                      onImageClick={handleImageClick}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Infinite Scroll Trigger */}
              {nextCursor && (
                <div ref={observerTarget} className="p-4 flex justify-center">
                  {isLoadingMore && (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}

              {/* End of Feed */}
              {!nextCursor && posts.length > 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  已經到底了 🎉
                </div>
              )}
            </EmptyStateManager>
          )}
        </div>
      </main>

      {/* Image Gallery */}
      <ImageGallery
        images={galleryImages}
        initialIndex={galleryIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />
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
