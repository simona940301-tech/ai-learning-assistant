'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MoreVertical } from 'lucide-react'

/**
 * 🎯 Phase A: 科目詳情頁 - 錯題 / 題本 Tab
 * 只在點進科目後才顯示
 */
export default function SubjectDetailPage({
  params,
}: {
  params: { subject: string }
}) {
  const [showEditMode, setShowEditMode] = useState(false)

  // 科目名稱映射
  const subjectNames: Record<string, string> = {
    'english': '英文',
    'chinese': '國文',
    'math': '數學',
    'science': '自然',
    'social': '社會',
  }

  const subjectName = subjectNames[params.subject] || params.subject

  return (
    <>
        title={subjectName}
        rightAction={
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setShowEditMode(!showEditMode)}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        }
      />

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">
        {/* 🎯 Phase A: Tab 切換 - 錯題 / 題本 */}
        <Tabs defaultValue="mistakes" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="mistakes">錯題</TabsTrigger>
            <TabsTrigger value="packs">題本</TabsTrigger>
          </TabsList>

          <TabsContent value="mistakes">
            {/* 錯題列表 */}
            <div className="text-center text-muted-foreground py-8">
              錯題列表（待實作）
            </div>
          </TabsContent>

          <TabsContent value="packs">
            {/* 題本列表 */}
            <div className="text-center text-muted-foreground py-8">
              題本列表（待實作）
            </div>
          </TabsContent>
        </Tabs>

        {/* 編輯模式面板 */}
        {showEditMode && (
          <div className="fixed bottom-24 left-0 right-0 bg-card border-t p-4 shadow-lg z-50">
            <div className="mx-auto max-w-lg flex gap-3">
              <Button variant="outline" className="flex-1">批次選取</Button>
              <Button variant="outline" className="flex-1">匯入</Button>
              <Button variant="outline" className="flex-1">分享</Button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

