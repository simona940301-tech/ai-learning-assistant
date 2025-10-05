'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppBar } from '@/components/layout/app-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BookOpen, Globe, FlaskConical, Calculator, Languages, FileText, Image as ImageIcon, File, MoreVertical, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAsk } from '@/lib/ask-context'
import { BackpackFile, TaskType } from '@/lib/types'

const subjects = [
  { id: 'chinese', name: '國文', icon: BookOpen, color: 'bg-red-500/10 text-red-500' },
  { id: 'english', name: '英文', icon: Languages, color: 'bg-blue-500/10 text-blue-500' },
  { id: 'social', name: '社會', icon: Globe, color: 'bg-green-500/10 text-green-500' },
  { id: 'science', name: '自然', icon: FlaskConical, color: 'bg-purple-500/10 text-purple-500' },
  { id: 'math', name: '數學', icon: Calculator, color: 'bg-orange-500/10 text-orange-500' },
]

const seedFiles: BackpackFile[] = [
  {
    id: '1',
    user_id: 'user1',
    type: 'text',
    title: '微積分筆記',
    subject: 'math',
    content: '導數的定義與性質...',
    file_url: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    user_id: 'user1',
    type: 'pdf',
    title: '物理講義 Ch3',
    subject: 'science',
    content: null,
    file_url: '/mock/physics-ch3.pdf',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    user_id: 'user1',
    type: 'image',
    title: '化學式筆記',
    subject: 'science',
    content: null,
    file_url: '/mock/chemistry-notes.jpg',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return '今天'
  if (diffInDays === 1) return '昨天'
  if (diffInDays < 7) return `${diffInDays} 天前`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} 週前`
  return `${Math.floor(diffInDays / 30)} 月前`
}

export default function BackpackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { importFromBackpack } = useAsk()
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [fileType, setFileType] = useState('text')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [items, setItems] = useState<BackpackFile[]>([])
  const [showTextHint, setShowTextHint] = useState(false)

  // Load items from localStorage or seed
  useEffect(() => {
    try {
      const raw = localStorage.getItem('backpack_items')
      const list: BackpackFile[] = raw ? JSON.parse(raw) : seedFiles
      // sort by updated_at desc
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      setItems(list)
    } catch {
      setItems(seedFiles)
    }
  }, [])

  // Handle highlight from URL params
  useEffect(() => {
    const highlight = searchParams?.get('highlight')
    if (highlight) {
      setHighlightId(highlight)
      // If new item is text and current tab hides it, show dot on 文字 tab
      const found = items.find(i => i.id === highlight)
      if (found && found.type === 'text' && fileType !== 'text') {
        setShowTextHint(true)
        setTimeout(() => setShowTextHint(false), 2000)
      }
      // Auto-scroll to highlighted item
      setTimeout(() => {
        const element = document.getElementById(`file-${highlight}`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      // Remove highlight after 2 seconds
      setTimeout(() => setHighlightId(null), 2000)
    }
  }, [searchParams, items, fileType])

  const handleAskAction = (file: BackpackFile, taskType: TaskType) => {
    importFromBackpack([file], taskType)
    router.push('/ask')
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const handleBatchAsk = (taskType: TaskType) => {
    const selected = items.filter(f => selectedFiles.has(f.id))
    importFromBackpack(selected, taskType)
    router.push('/ask')
  }

  const filteredFiles = items.filter(file => {
    if (selectedSubject && file.subject !== selectedSubject) return false
    if (fileType !== 'all' && file.type !== fileType) return false
    return true
  })

  return (
    <>
      <AppBar title="Backpack" user={{ name: 'User', avatar: '' }} />

      <main className="mx-auto max-w-lg p-4">
        {/* Subject Folders */}
        {!selectedSubject ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">科目</h2>
            {subjects.map((subject, idx) => {
              const Icon = subject.icon
              const count = items.filter(f => f.subject === subject.id).length

              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className="cursor-pointer p-4 transition-colors hover:bg-accent"
                    onClick={() => setSelectedSubject(subject.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-3 ${subject.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium">{subject.name}</h3>
                          <p className="text-sm text-muted-foreground">{count} 個檔案</p>
                        </div>
                      </div>
                      <div className="text-2xl text-muted-foreground">›</div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Back Button */}
            <button
              onClick={() => setSelectedSubject(null)}
              className="mb-4 text-sm text-muted-foreground hover:text-foreground"
            >
              ← 返回
            </button>

            {/* File Type Tabs */}
            <Tabs value={fileType} onValueChange={setFileType} className="w-full">
              <TabsList className="mb-6 grid w-full grid-cols-4">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="text">
                  文字 {showTextHint && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-primary align-middle" />}
                </TabsTrigger>
                <TabsTrigger value="pdf">PDF</TabsTrigger>
                <TabsTrigger value="image">圖片</TabsTrigger>
              </TabsList>

              <TabsContent value={fileType} className="space-y-3">
                {filteredFiles.map((file, idx) => (
                  <motion.div
                    key={file.id}
                    id={`file-${file.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className={`p-4 transition-all duration-300 ${
                        highlightId === file.id
                          ? 'ring-2 ring-green-500 bg-green-500/5'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          {file.type === 'text' && <FileText className="h-5 w-5" />}
                          {file.type === 'pdf' && <File className="h-5 w-5" />}
                          {file.type === 'image' && <ImageIcon className="h-5 w-5" />}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-medium">{file.title}</h3>
                          {file.content && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {file.content}
                            </p>
                          )}
                          {file.derived_from && (
                            <p className="mt-1 text-xs text-blue-500">
                              派生自：{file.derived_from.length} 個來源
                            </p>
                          )}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {getRelativeTime(file.created_at)}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                Ask
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleAskAction(file, 'summary')}>
                                整理
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAskAction(file, 'solve')}>
                                解題
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}

                {filteredFiles.length === 0 && (
                  <div className="flex h-64 items-center justify-center text-muted-foreground">
                    尚無檔案
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </main>
    </>
  )
}
