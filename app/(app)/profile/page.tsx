'use client'

import { AppBar } from '@/components/layout/app-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Settings, LogOut, FileText, Backpack as BackpackIcon, MessageCircle, Award, Coins, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProfilePage() {
  const user = {
    name: '王小明',
    username: '@xiaoming',
    avatar: '',
    bio: '熱愛學習的高中生 📚',
    xp: 1240,
    coins: 580,
    streak: 7,
    posts: 23,
    materials: 45,
  }

  return (
    <>
      <AppBar title="Profile" user={{ name: user.name, avatar: user.avatar }} />

      <main className="mx-auto max-w-lg p-4 pb-20">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <Avatar className="mx-auto h-24 w-24 mb-4">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
          </Avatar>

          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.username}</p>
          <p className="mt-2 text-sm">{user.bio}</p>

          <Button variant="outline" className="mt-4">
            編輯個人資料
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="mb-1 flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <div className="text-xl font-bold">{user.streak}</div>
                </div>
                <div className="text-xs text-muted-foreground">連續天數</div>
              </div>

              <div className="text-center">
                <div className="mb-1 flex items-center justify-center gap-1">
                  <Award className="h-4 w-4 text-blue-500" />
                  <div className="text-xl font-bold">{user.xp}</div>
                </div>
                <div className="text-xs text-muted-foreground">總 XP</div>
              </div>

              <div className="text-center">
                <div className="mb-1 flex items-center justify-center gap-1">
                  <Coins className="h-4 w-4 text-orange-500" />
                  <div className="text-xl font-bold">{user.coins}</div>
                </div>
                <div className="text-xs text-muted-foreground">金幣</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Activity Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 space-y-3"
        >
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">我的發文</div>
                  <div className="text-sm text-muted-foreground">{user.posts} 篇貼文</div>
                </div>
              </div>
              <div className="text-muted-foreground">›</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">我的教材</div>
                  <div className="text-sm text-muted-foreground">{user.materials} 個項目</div>
                </div>
              </div>
              <div className="text-muted-foreground">›</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <BackpackIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Backpack 統計</div>
                  <div className="text-sm text-muted-foreground">查看詳細資料</div>
                </div>
              </div>
              <div className="text-muted-foreground">›</div>
            </div>
          </Card>
        </motion.div>

        <Separator className="my-6" />

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <button className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent">
            <Settings className="h-5 w-5" />
            <span>設定</span>
          </button>

          <button className="flex w-full items-center gap-3 rounded-lg p-3 text-destructive transition-colors hover:bg-destructive/10">
            <LogOut className="h-5 w-5" />
            <span>登出</span>
          </button>
        </motion.div>
      </main>
    </>
  )
}
