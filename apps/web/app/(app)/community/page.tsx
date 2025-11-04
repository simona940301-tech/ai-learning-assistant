'use client'

import { useState } from 'react'
import { AppBar } from '@/components/layout/app-bar'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Share2, Plus, Image as ImageIcon } from 'lucide-react'
import { motion } from 'framer-motion'

// Mock data
const posts = [
  {
    id: 1,
    user: { name: '王小明', avatar: '' },
    content: '今天學習數學超有收穫！微積分終於開竅了 🎉',
    images: [],
    likes: 24,
    comments: 5,
    time: '2小時前',
  },
  {
    id: 2,
    user: { name: '李小華', avatar: '' },
    content: '分享一下我的筆記整理法，希望對大家有幫助',
    images: ['/placeholder1.jpg', '/placeholder2.jpg'],
    likes: 67,
    comments: 12,
    time: '4小時前',
  },
]

export default function CommunityPage() {
  const [showComposer, setShowComposer] = useState(false)
  const [content, setContent] = useState('')

  return (
    <>
      <AppBar title="Community" user={{ name: 'User', avatar: '' }} />

      <main className="mx-auto max-w-lg">
        <Tabs defaultValue="latest" className="w-full">
          <div className="sticky top-14 z-30 border-b bg-background/80 backdrop-blur-xl">
            <TabsList className="h-12 w-full rounded-none bg-transparent">
              <TabsTrigger value="latest" className="flex-1">最新</TabsTrigger>
              <TabsTrigger value="following" className="flex-1">追蹤</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="latest" className="mt-0">
            <div className="divide-y">
              {posts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <article className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.user.avatar} />
                        <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{post.user.name}</span>
                          <span className="text-xs text-muted-foreground">{post.time}</span>
                        </div>

                        <p className="mt-2 text-[15px] leading-relaxed">{post.content}</p>

                        {post.images.length > 0 && (
                          <div className={`mt-3 grid gap-1 ${
                            post.images.length === 1 ? 'grid-cols-1' :
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
                            <span className="text-sm">{post.comments}</span>
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
          </TabsContent>

          <TabsContent value="following">
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              追蹤的貼文會顯示在這裡
            </div>
          </TabsContent>
        </Tabs>
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
