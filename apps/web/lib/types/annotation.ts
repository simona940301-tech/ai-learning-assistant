// Annotation types for Backpack Reader
export interface Annotation {
  id: string
  file_id: string
  page_number: number
  annotation_type: 'pen' | 'marker' | 'text-highlight' | 'sticky'
  data: {
    // For pen/marker
    path?: number[] // [x1, y1, x2, y2, ...]
    color?: string
    width?: number
    opacity?: number
    
    // For text-highlight
    text?: string
    rects?: Array<{ x: number; y: number; w: number; h: number }> // Normalized 0-1
    range?: {
      startOffset: number
      endOffset: number
    }
    
    // For sticky
    x?: number
    y?: number
    width?: number
    height?: number
    content?: string
    collapsed?: boolean
    color?: 'yellow' | 'blue' | 'green'
    backgroundColor?: string
    refHighlightId?: string
  }
  // Metadata
  v?: number // Version
  pageRotation?: number
  pageSize?: { w: number; h: number }
  created_at: string
  updated_at?: string
  deletedAt?: string // Soft delete
}
