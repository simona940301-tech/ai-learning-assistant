'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Image as ImageIcon, File, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export interface FileStatus {
  id: string
  storage_path: string
  mime: string
  page_count: number
  ocr_status: 'pending' | 'processing' | 'done' | 'failed'
  embed_status: 'pending' | 'processing' | 'done' | 'failed'
  error_message?: string
  created_at: string
}

interface FileCardProps {
  file: FileStatus
  onClick?: () => void
}

export function FileCard({ file, onClick }: FileCardProps) {
  const getFileIcon = () => {
    if (file.mime === 'application/pdf') return <File className="h-5 w-5" />
    if (file.mime.startsWith('image/')) return <ImageIcon className="h-5 w-5" />
    return <FileText className="h-5 w-5" />
  }

  const getStatusBadge = (status: FileStatus['ocr_status'] | FileStatus['embed_status']) => {
    switch (status) {
      case 'done':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            完成
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1 animate-spin" />
            處理中
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            失敗
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="opacity-60">
            <Clock className="h-3 w-3 mr-1" />
            等待中
          </Badge>
        )
    }
  }

  const fileName = file.storage_path.split('/').pop() || '未知檔案'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`p-3 cursor-pointer transition-all hover:bg-muted/50 ${
          onClick ? '' : 'cursor-default'
        }`}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2">{getFileIcon()}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{fileName}</h3>
            {file.page_count > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {file.page_count} 頁
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs uppercase opacity-60">OCR</span>
                {getStatusBadge(file.ocr_status)}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs uppercase opacity-60">索引</span>
                {getStatusBadge(file.embed_status)}
              </div>
            </div>
            {file.error_message && (
              <p className="mt-2 text-xs text-destructive">{file.error_message}</p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}




