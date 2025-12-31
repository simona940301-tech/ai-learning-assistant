'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, Upload, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface SubjectFolder {
  id: string
  name: string
  subject: string
  itemCount: number
  lastUpdated?: string
}

interface SubjectFolderViewProps {
  folders: SubjectFolder[]
}

/**
 * 🎯 Phase A: Backpack 預設視圖 - 科目資料夾
 * 分步顯示，減少認知負荷
 */
export function SubjectFolderView({ folders }: SubjectFolderViewProps) {
  return (
    <div className="space-y-4">
      {/* 主 CTA：上傳 */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-1">新增資料</h3>
            <p className="text-sm text-blue-700/80">上傳題目、筆記或文件</p>
          </div>
          <Link href="/backpack/upload">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <Upload className="h-4 w-4 mr-2" />
              上傳
            </Button>
          </Link>
        </div>
      </Card>

      {/* 科目資料夾列表 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground px-1">我的科目</h4>

        {folders.map((folder, index) => (
          <motion.div
            key={folder.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={`/backpack/subject/${folder.subject}`}>
              <Card className="p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-xl">
                      <FolderOpen className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{folder.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {folder.itemCount} 個項目
                        {folder.lastUpdated && ` · ${folder.lastUpdated}`}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

