'use client'

import { useState } from 'react'
import { AppBar } from '@/components/layout/app-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Globe, FlaskConical, Calculator, Languages } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const subjects = [
  { id: 'chinese', name: '國文', icon: BookOpen, color: 'text-red-500' },
  { id: 'english', name: '英文', icon: Languages, color: 'text-blue-500' },
  { id: 'social', name: '社會', icon: Globe, color: 'text-green-500' },
  { id: 'science', name: '自然', icon: FlaskConical, color: 'text-purple-500' },
  { id: 'math', name: '數學', icon: Calculator, color: 'text-orange-500' },
]

const tasks = [
  { id: 1, subject: 'math', title: '完成微積分練習題 1-10', xp: 100, coins: 50, completed: false },
  { id: 2, subject: 'english', title: '背誦單字 Unit 5', xp: 80, coins: 40, completed: true },
  { id: 3, subject: 'chinese', title: '閱讀文言文並做筆記', xp: 120, coins: 60, completed: false },
]

export default function PlayPage() {
  const [selectedTask, setSelectedTask] = useState<number | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const handleComplete = () => {
    setIsWorking(false)
    setSelectedTask(null)
    // Animation for completion
  }

  return (
    <>
      <AppBar title="Play" user={{ name: 'User', avatar: '' }} />

      <main className="mx-auto max-w-lg p-4">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold">7</div>
            <div className="text-xs text-muted-foreground">連續天數</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold">1,240</div>
            <div className="text-xs text-muted-foreground">總 XP</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold">580</div>
            <div className="text-xs text-muted-foreground">金幣</div>
          </Card>
        </div>

        {/* Subject Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {subjects.map((subject) => {
            const Icon = subject.icon
            return (
              <button
                key={subject.id}
                className="flex shrink-0 items-center gap-2 rounded-full border bg-background px-4 py-2 transition-colors hover:bg-accent"
              >
                <Icon className={`h-4 w-4 ${subject.color}`} />
                <span className="text-sm font-medium">{subject.name}</span>
              </button>
            )
          })}
        </div>

        {/* Tasks */}
        <div className="space-y-3">
          {tasks.map((task, idx) => {
            const subject = subjects.find(s => s.id === task.subject)
            const Icon = subject?.icon || BookOpen

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`p-4 ${task.completed ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg bg-muted p-2 ${subject?.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-medium">{task.title}</h3>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>+{task.xp} XP</span>
                        <span>+{task.coins} 金幣</span>
                      </div>
                    </div>

                    {!task.completed && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedTask(task.id)}
                      >
                        開始
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Task Modal */}
        <AnimatePresence>
          {selectedTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
              onClick={() => setSelectedTask(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="mx-4 w-full max-w-sm rounded-2xl border bg-background p-6"
              >
                {!isWorking ? (
                  <>
                    <h2 className="mb-4 text-xl font-semibold">準備好了嗎？</h2>
                    <p className="mb-6 text-muted-foreground">
                      完成任務後可獲得 XP 和金幣獎勵
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setSelectedTask(null)}>
                        取消
                      </Button>
                      <Button className="flex-1" onClick={() => setIsWorking(true)}>
                        開始計時
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-6 text-center">
                      <div className="mb-2 text-4xl font-bold">25:00</div>
                      <div className="text-muted-foreground">專注學習中...</div>
                    </div>
                    <Button className="w-full" onClick={handleComplete}>
                      完成任務
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  )
}
