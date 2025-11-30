'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Annotation } from '@/lib/types/annotation'
import { track } from '@/lib/telemetry'
import { X } from 'lucide-react'
import { StickyNoteLayer } from './StickyNoteLayer'

// Lazy load Konva (heavy library, only load when needed)
// NOTE: react-konva is not currently installed. Uncomment when needed.
// let konvaLoadPromise: Promise<any> | null = null
// function loadKonva() {
//   if (!konvaLoadPromise) {
//     konvaLoadPromise = import('react-konva').then((module) => {
//       return module
//     })
//   }
//   return konvaLoadPromise
// }

interface AnnotationLayerProps {
  pageNumber: number
  fileId: string
  tool: 'pen' | 'marker' | 'sticky' | 'eraser' | null
  color: string
  strokeWidth: number
  annotations: Annotation[]
  scale: number
  viewport: { width: number; height: number }
  onAnnotationCreate: (annotation: Annotation) => void
  onAnnotationUpdate: (annotation: Annotation) => void
  onAnnotationDelete: (annotationId: string) => void
  onToolChange?: (tool: 'pen' | 'marker' | 'sticky' | 'eraser' | null) => void
}

export function AnnotationLayer({
  pageNumber,
  fileId,
  tool,
  color,
  strokeWidth,
  annotations,
  scale,
  viewport,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  onToolChange,
}: AnnotationLayerProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<number[]>([])
  const [konvaLoaded, setKonvaLoaded] = useState(false)
  const [konvaComponents, setKonvaComponents] = useState<any>(null)
  const stageRef = useRef<any>(null)
  const isDrawingTool = tool === 'pen' || tool === 'marker'
  const isInteractiveTool = tool === 'pen' || tool === 'marker' || tool === 'eraser'

  // Load react-konva dynamically - MUST be before any conditional returns
  // NOTE: Disabled until react-konva is installed
  useEffect(() => {
    // Annotation layer is disabled until react-konva is installed
    console.warn('[AnnotationLayer] react-konva not installed, annotation features disabled')
  }, [])

  // Handle mouse/touch events for drawing - MUST be before conditional return
  const handleMouseDown = useCallback(
    async (e: any) => {
      if (!tool) return

      // 防止頁面滾動（除非是選取模式）
      if (tool !== 'sticky') {
        e.evt?.preventDefault?.()
      }

      // Sticky notes are handled in handleMouseUp
      if (tool === 'sticky') return

      // Eraser: delete annotation on click
      if (tool === 'eraser') {
        const stage = e.target.getStage()
        const pos = stage.getPointerPosition()

        // Find annotation at click position
        const clickedAnnotation = annotations.find((ann) => {
          if (ann.annotation_type === 'pen' || ann.annotation_type === 'marker') {
            // Check if click is near the path
            if (ann.data.path && Array.isArray(ann.data.path)) {
              for (let i = 0; i < ann.data.path.length - 1; i += 2) {
                const x = ann.data.path[i]
                const y = ann.data.path[i + 1]
                const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2))
                if (distance < 20) return true
              }
            }
          } else if (ann.annotation_type === 'sticky') {
            // Check if click is inside sticky note
            const x = ann.data.x || 0
            const y = ann.data.y || 0
            const width = ann.data.width || 200
            const height = ann.data.height || 150
            if (pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height) {
              return true
            }
          }
          return false
        })

        if (clickedAnnotation) {
          // Call DELETE API
          try {
            const response = await fetch(`/api/backpack/annotations?id=${clickedAnnotation.id}`, {
              method: 'DELETE',
            })

            if (response.ok) {
              onAnnotationDelete(clickedAnnotation.id)
              track('backpack.reader.annot.delete', {
                type: clickedAnnotation.annotation_type,
                page: pageNumber,
              })
            }
          } catch (err) {
            console.error('[AnnotationLayer] Failed to delete annotation:', err)
          }
        }
        return
      }

      if (tool !== 'pen' && tool !== 'marker') return

      setIsDrawing(true)
      const pos = e.target.getStage().getPointerPosition()
      setCurrentPath([pos.x, pos.y])

      track('backpack.reader.annot.start', {
        type: tool,
        page: pageNumber,
      })
    },
    [tool, pageNumber, annotations, onAnnotationDelete]
  )

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!isDrawing || (tool !== 'pen' && tool !== 'marker')) return

      // 防止頁面滾動
      e.evt?.preventDefault?.()

      const stage = e.target.getStage()
      const point = stage.getPointerPosition()
      setCurrentPath((prev) => [...prev, point.x, point.y])
    },
    [isDrawing, tool]
  )

  const handleMouseUp = useCallback(async (e?: any) => {
    // Sticky notes are handled by StickyNoteLayer, skip here
    if (tool === 'sticky') {
      return
    }

    if (!isDrawing || currentPath.length < 4) {
      setIsDrawing(false)
      setCurrentPath([])
      return
    }

    if (tool !== 'pen' && tool !== 'marker') {
      setIsDrawing(false)
      setCurrentPath([])
      return
    }

    // Create annotation for pen/marker
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      file_id: fileId,
      page_number: pageNumber,
      annotation_type: tool,
      data: {
        path: currentPath,
        color: color,
        width: strokeWidth,
        opacity: tool === 'marker' ? 0.4 : 1,
      },
      created_at: new Date().toISOString(),
    }

    // Save to API
    try {
      const response = await fetch('/api/backpack/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          page_number: pageNumber,
          annotation_type: tool,
          data: annotation.data,
        }),
      })

      if (response.ok) {
        const { annotation: saved } = await response.json()
        onAnnotationCreate(saved)
      }
    } catch (err) {
      console.error('[AnnotationLayer] Failed to save annotation:', err)
    }

    track('backpack.reader.annot.create', {
      type: tool,
      page: pageNumber,
    })

    setIsDrawing(false)
    setCurrentPath([])
  }, [isDrawing, currentPath, tool, pageNumber, fileId, onAnnotationCreate, color, strokeWidth])


  // Render annotations
  const renderAnnotations = useCallback(() => {
    if (!konvaComponents) return []

    const elements: React.ReactNode[] = []
    const { Line, Rect, Text, Group, Circle } = konvaComponents

    for (const ann of annotations) {
      switch (ann.annotation_type) {
        case 'pen':
        case 'marker':
          if (ann.data.path && Array.isArray(ann.data.path)) {
            elements.push(
              <Line
                key={ann.id}
                points={ann.data.path}
                stroke={ann.data.color || '#000000'}
                strokeWidth={ann.data.width || 2}
                opacity={ann.data.opacity || 1}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  ann.annotation_type === 'marker' ? 'multiply' : 'source-over'
                }
              />
            )
          }
          break

        case 'sticky':
          // Sticky notes are handled by StickyNoteLayer, skip here
          break

        case 'text-highlight':
          // Text highlights are rendered via CSS, not Konva
          break
      }
    }

    return elements
  }, [annotations, konvaComponents, tool, pageNumber, onAnnotationDelete, onAnnotationUpdate])

  // Don't render if Konva is not loaded - AFTER all hooks
  if (!konvaLoaded || !konvaComponents) {
    return null
  }

  const { Stage, Layer, Line } = konvaComponents

  return (
    <>
      {/* Konva Layer - 用於繪圖（筆刷、螢光筆、橡皮擦） */}
      <div
        className="absolute inset-0"
        style={{
          touchAction: isDrawingTool ? 'none' : 'auto',
          overscrollBehavior: isDrawingTool ? 'contain' : 'auto',
          pointerEvents: tool === 'sticky' ? 'none' : isInteractiveTool ? 'auto' : 'none',
          zIndex: 10,
        }}
      >
        <Stage
          ref={stageRef}
          width={viewport.width}
          height={viewport.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer>
            {renderAnnotations()}
            {isDrawing && currentPath.length > 0 && tool && (
              <Line
                points={currentPath}
                stroke={color}
                strokeWidth={strokeWidth}
                opacity={tool === 'marker' ? 0.4 : 1}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  tool === 'marker' ? 'multiply' : 'source-over'
                }
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Sticky Note Layer - 始終顯示所有便利貼（雙層渲染系統） */}
      <StickyNoteLayer
        pageNumber={pageNumber}
        fileId={fileId}
        tool={tool}
        color={color}
        annotations={annotations}
        scale={scale}
        viewport={viewport}
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationUpdate={onAnnotationUpdate}
        onAnnotationDelete={onAnnotationDelete}
        onToolChange={onToolChange}
      />
    </>
  )
}
