/**
 * PDF Coordinate Conversion Utilities
 *
 * Converts between different coordinate spaces:
 * 1. DOM/Client coordinates (pixels, relative to viewport)
 * 2. PDF page coordinates (points, scale-independent)
 * 3. Normalized coordinates (0-1 range, for database storage)
 *
 * GoodNotes strategy: Always store coordinates in PDF space (normalized 0-1)
 * to ensure highlights remain accurate across different zoom levels
 */

export interface PDFViewport {
  width: number
  height: number
  scale: number
  rotation?: number
}

export interface DOMRect {
  x: number
  y: number
  width: number
  height: number
}

export interface NormalizedRect {
  x: number // 0-1 range
  y: number // 0-1 range
  width: number // 0-1 range
  height: number // 0-1 range
}

export interface PDFRect {
  x: number // PDF points
  y: number // PDF points
  w: number // PDF points
  h: number // PDF points
}

/**
 * Convert DOM ClientRect to PDF coordinates
 *
 * @param clientRect - DOMRect from browser (pixels, relative to viewport)
 * @param pageElement - The PDF page container element
 * @param viewport - pdf.js PageViewport object
 * @returns PDF coordinate rect
 */
export function clientRectToPDF(
  clientRect: globalThis.DOMRect,
  pageElement: HTMLElement,
  viewport: PDFViewport
): PDFRect {
  const pageRect = pageElement.getBoundingClientRect()

  // Convert client coordinates to page-relative coordinates
  const relativeX = clientRect.left - pageRect.left
  const relativeY = clientRect.top - pageRect.top

  // Convert to PDF coordinates (removing scale)
  const pdfX = relativeX / viewport.scale
  const pdfY = relativeY / viewport.scale
  const pdfW = clientRect.width / viewport.scale
  const pdfH = clientRect.height / viewport.scale

  return {
    x: pdfX,
    y: pdfY,
    w: pdfW,
    h: pdfH,
  }
}

/**
 * Convert PDF coordinates to normalized coordinates (0-1 range)
 *
 * Normalized coordinates are scale-independent and ideal for database storage
 *
 * @param pdfRect - PDF coordinate rect
 * @param viewport - pdf.js PageViewport object (at scale 1.0)
 * @returns Normalized rect (0-1 range)
 */
export function pdfToNormalized(pdfRect: PDFRect, viewport: PDFViewport): NormalizedRect {
  // Use viewport at scale 1.0 for normalization
  const baseWidth = viewport.width / viewport.scale
  const baseHeight = viewport.height / viewport.scale

  return {
    x: Math.max(0, Math.min(1, pdfRect.x / baseWidth)),
    y: Math.max(0, Math.min(1, pdfRect.y / baseHeight)),
    width: Math.max(0.001, Math.min(1, pdfRect.w / baseWidth)),
    height: Math.max(0.001, Math.min(1, pdfRect.h / baseHeight)),
  }
}

/**
 * Convert normalized coordinates back to PDF coordinates
 *
 * @param normalized - Normalized rect (0-1 range)
 * @param viewport - pdf.js PageViewport object (at current scale)
 * @returns PDF coordinate rect
 */
export function normalizedToPDF(normalized: NormalizedRect, viewport: PDFViewport): PDFRect {
  // Use viewport at scale 1.0 for denormalization
  const baseWidth = viewport.width / viewport.scale
  const baseHeight = viewport.height / viewport.scale

  return {
    x: normalized.x * baseWidth,
    y: normalized.y * baseHeight,
    w: normalized.width * baseWidth,
    h: normalized.height * baseHeight,
  }
}

/**
 * Convert PDF coordinates to DOM coordinates (for rendering)
 *
 * @param pdfRect - PDF coordinate rect
 * @param viewport - pdf.js PageViewport object (at current scale)
 * @returns DOM coordinate rect (pixels)
 */
export function pdfToDOM(pdfRect: PDFRect, viewport: PDFViewport): DOMRect {
  return {
    x: pdfRect.x * viewport.scale,
    y: pdfRect.y * viewport.scale,
    width: pdfRect.w * viewport.scale,
    height: pdfRect.h * viewport.scale,
  }
}

/**
 * Convert multiple DOMRects to normalized coordinates
 *
 * Used when converting native selection rects to database format
 *
 * @param clientRects - Array of DOMRects from Range.getClientRects()
 * @param pageElement - The PDF page container element
 * @param viewport - pdf.js PageViewport object
 * @returns Array of normalized rects
 */
export function clientRectsToNormalized(
  clientRects: globalThis.DOMRect[],
  pageElement: HTMLElement,
  viewport: PDFViewport
): NormalizedRect[] {
  return clientRects.map((rect) => {
    const pdfRect = clientRectToPDF(rect, pageElement, viewport)
    return pdfToNormalized(pdfRect, viewport)
  })
}

/**
 * Convert normalized rects back to DOM rects (for rendering highlights)
 *
 * @param normalizedRects - Array of normalized rects
 * @param viewport - pdf.js PageViewport object (at current scale)
 * @returns Array of DOM rects
 */
export function normalizedRectsToDOM(
  normalizedRects: NormalizedRect[],
  viewport: PDFViewport
): DOMRect[] {
  return normalizedRects.map((normalized) => {
    const pdfRect = normalizedToPDF(normalized, viewport)
    return pdfToDOM(pdfRect, viewport)
  })
}

/**
 * Union multiple rects into a single bounding rect
 *
 * Useful for calculating tooltip position from multi-line selection
 *
 * @param rects - Array of DOMRects
 * @returns Single bounding DOMRect
 */
export function unionRects(rects: globalThis.DOMRect[]): globalThis.DOMRect {
  if (rects.length === 0) {
    return new globalThis.DOMRect(0, 0, 0, 0)
  }

  const left = Math.min(...rects.map((r) => r.left))
  const top = Math.min(...rects.map((r) => r.top))
  const right = Math.max(...rects.map((r) => r.right))
  const bottom = Math.max(...rects.map((r) => r.bottom))

  return new globalThis.DOMRect(left, top, right - left, bottom - top)
}
