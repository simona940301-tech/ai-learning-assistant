'use client'

import { useState } from 'react'
import { AppBar } from '@/components/layout/app-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Globe, FlaskConical, Calculator, Languages, Star } from 'lucide-react'
import { motion } from 'framer-motion'

const subjects = [
  { id: 'all', name: '全部', icon: null },
  { id: 'chinese', name: '國文', icon: BookOpen },
  { id: 'english', name: '英文', icon: Languages },
  { id: 'social', name: '社會', icon: Globe },
  { id: 'science', name: '自然', icon: FlaskConical },
  { id: 'math', name: '數學', icon: Calculator },
]

const items = [
  {
    id: 1,
    subject: 'math',
    title: '微積分精通課程',
    provider: 'Khan Academy',
    price: 0,
    isFree: true,
    rating: 4.8,
    cover: '',
  },
  {
    id: 2,
    subject: 'english',
    title: 'TOEFL 準備完整教材',
    provider: 'ETS Official',
    price: 990,
    isFree: false,
    rating: 4.9,
    cover: '',
  },
  {
    id: 3,
    subject: 'science',
    title: '物理實驗影片集',
    provider: 'MIT OpenCourseWare',
    price: 0,
    isFree: true,
    rating: 4.7,
    cover: '',
  },
]

const categories = [
  { id: 'new', title: '最新上架', items: items.slice(0, 2) },
  { id: 'recommended', title: '為你推薦', items: items },
  { id: 'popular', title: '熱門教材', items: items.slice(1) },
]

export default function StorePage() {
  const [selectedSubject, setSelectedSubject] = useState('all')

  const filteredItems = selectedSubject === 'all'
    ? items
    : items.filter(item => item.subject === selectedSubject)

  return (
    <>
      <AppBar title="Store" user={{ name: 'User', avatar: '' }} />

      <main className="mx-auto max-w-lg pb-4">
        {/* Subject Filter */}
        <div className="sticky top-14 z-30 border-b bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {subjects.map((subject) => {
              const Icon = subject.icon
              const isActive = selectedSubject === subject.id

              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-foreground text-background'
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

        <div className="space-y-8 px-4 pt-6">
          {categories.map((category) => {
            const categoryItems = category.items.filter(item =>
              selectedSubject === 'all' || item.subject === selectedSubject
            )

            if (categoryItems.length === 0) return null

            return (
              <div key={category.id}>
                <h2 className="mb-4 text-lg font-semibold">{category.title}</h2>

                <div className="flex gap-4 overflow-x-auto pb-2">
                  {categoryItems.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="w-[280px] shrink-0"
                    >
                      <Card className="overflow-hidden">
                        {/* Cover Image */}
                        <div className="aspect-video w-full bg-gradient-to-br from-muted to-muted-foreground/20" />

                        <div className="p-4">
                          <h3 className="font-semibold line-clamp-2">{item.title}</h3>

                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Star className="h-3 w-3 fill-current text-yellow-500" />
                              {item.rating}
                            </div>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{item.provider}</span>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="text-lg font-bold">
                              {item.isFree ? '免費' : `NT$ ${item.price}`}
                            </div>
                            <Button size="sm">
                              {item.isFree ? '取得' : '購買'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Featured Banner */}
        <div className="mx-4 mt-8">
          <Card className="overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 p-6">
            <h3 className="mb-2 text-xl font-bold">精選課程包</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              完整學測準備教材，一次擁有
            </p>
            <Button>查看詳情</Button>
          </Card>
        </div>
      </main>
    </>
  )
}
