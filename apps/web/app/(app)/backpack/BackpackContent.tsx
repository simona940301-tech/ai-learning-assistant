'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
]

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return '今天'
  if (diffInDays === 1) return '昨天'
  if (diffInDays < 7) return `${diffInDays} 天前`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} 週前`
  return `${Math.floor(diffInDays / 30)} 月前'`
}

export function BackpackContent() {
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
      const found = items.find(i => i.id === highlight)
      if (found && found.type === 'text' && fileType !== 'text') {
        setShowTextHint(true)
        setTimeout(() => setShowTextHint(false), 2000)
      }
      setTimeout(() => {
        const element = document.getElementById(`file-${highlight}`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      setTimeout(() => setHighlightId(null), 2000)
    }
  }, [searchParams, items, fileType])

  // Simplified JSX - just return the main content without layout wrapper
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">背包</h1>
      <p>已保存 {items.length} 個項目</p>
      {/* Add your full backpack UI here */}
    </div>
  )
}
