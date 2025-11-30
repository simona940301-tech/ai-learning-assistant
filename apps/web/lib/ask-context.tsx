'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { AttachedFile, TaskType, SourceMode, BackpackFile, FileAnalysis } from './types'

interface AskContextType {
  attachedFiles: AttachedFile[]
  taskType: TaskType
  sourceMode: SourceMode
  addFiles: (files: AttachedFile[]) => void
  removeFile: (id: string) => void
  setTaskType: (type: TaskType) => void
  setSourceMode: (mode: SourceMode) => void
  importFromBackpack: (files: BackpackFile[], type: TaskType) => void
  clearAll: () => void
  currentAnalysis: FileAnalysis | null
  setCurrentAnalysis: (analysis: FileAnalysis | null) => void
}

const AskContext = createContext<AskContextType | undefined>(undefined)

export function AskProvider({ children }: { children: React.ReactNode }) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [taskType, setTaskType] = useState<TaskType>('summary')
  const [sourceMode, setSourceMode] = useState<SourceMode>('backpack')
  const [currentAnalysis, setCurrentAnalysis] = useState<FileAnalysis | null>(null)

  const addFiles = useCallback((files: AttachedFile[]) => {
    setAttachedFiles(prev => [...prev, ...files])
  }, [])

  const removeFile = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const importFromBackpack = useCallback((files: BackpackFile[], type: TaskType) => {
    const converted: AttachedFile[] = files.map(f => ({
      id: f.id,
      name: f.title,
      type: f.type,
      url: f.file_url || undefined,
      content: f.content || undefined,
      size: f.file_size,
    }))
    setAttachedFiles(converted)
    setTaskType(type)
  }, [])

  const clearAll = useCallback(() => {
    setAttachedFiles([])
    setCurrentAnalysis(null)
  }, [])

  return (
    <AskContext.Provider
      value={{
        attachedFiles,
        taskType,
        sourceMode,
        addFiles,
        removeFile,
        setTaskType,
        setSourceMode,
        importFromBackpack,
        clearAll,
        currentAnalysis,
        setCurrentAnalysis,
      }}
    >
      {children}
    </AskContext.Provider>
  )
}

export function useAsk() {
  const context = useContext(AskContext)
  if (!context) {
    throw new Error('useAsk must be used within AskProvider')
  }
  return context
}
