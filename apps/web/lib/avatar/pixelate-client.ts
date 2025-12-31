/**
 * 🎨 Client-Side Image Pixelation
 *
 * Fast, instant preview for user photos
 * Creates JRPG-style pixel art in the browser
 */

export interface PixelateOptions {
  /** Output size (default: 64x64) */
  size?: number
  /** Number of colors (default: 16) */
  colors?: number
  /** Style preset */
  style?: 'jrpg' | 'retro' | 'modern'
  /** Remove background */
  removeBackground?: boolean
}

/**
 * Pixelate an image file in the browser
 * Returns a Blob that can be uploaded or displayed
 */
export async function pixelateImage(
  file: File,
  options: PixelateOptions = {}
): Promise<Blob> {
  const {
    size = 64,
    colors = 16,
    style = 'jrpg',
    removeBackground = false,
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      try {
        // Set canvas size
        canvas.width = size
        canvas.height = size

        // Disable image smoothing for pixel-perfect scaling
        ctx.imageSmoothingEnabled = false

        // Calculate crop area (center square)
        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2
        const sy = (img.height - minDim) / 2

        // Draw cropped and scaled image
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, size, size)

        // Apply color quantization
        const quantized = quantizeColors(imageData, colors, style)

        // Optional: Remove background
        if (removeBackground) {
          removeBackgroundColor(quantized)
        }

        // Put processed data back
        ctx.putImageData(quantized, 0, 0)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob'))
            }
          },
          'image/png',
          1.0
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // Load image from file
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Reduce image to limited color palette
 * Uses different algorithms based on style
 */
function quantizeColors(
  imageData: ImageData,
  numColors: number,
  style: 'jrpg' | 'retro' | 'modern'
): ImageData {
  const data = imageData.data
  const step = Math.floor(256 / numColors)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    // Skip transparent pixels
    if (a === 0) continue

    switch (style) {
      case 'jrpg':
        // JRPG style: Vibrant, high contrast
        data[i] = Math.round(r / step) * step
        data[i + 1] = Math.round(g / step) * step
        data[i + 2] = Math.round(b / step) * step
        // Boost saturation
        boostSaturation(data, i)
        break

      case 'retro':
        // Retro style: Muted colors
        data[i] = Math.round(r / (step * 1.5)) * (step * 1.5)
        data[i + 1] = Math.round(g / (step * 1.5)) * (step * 1.5)
        data[i + 2] = Math.round(b / (step * 1.5)) * (step * 1.5)
        break

      case 'modern':
        // Modern style: Smooth gradients
        data[i] = Math.round(r / (step * 0.8)) * (step * 0.8)
        data[i + 1] = Math.round(g / (step * 0.8)) * (step * 0.8)
        data[i + 2] = Math.round(b / (step * 0.8)) * (step * 0.8)
        break
    }

    // Ensure values are in valid range
    data[i] = Math.min(255, Math.max(0, data[i]))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1]))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2]))
  }

  return imageData
}

/**
 * Boost color saturation for JRPG style
 */
function boostSaturation(data: Uint8ClampedArray, index: number) {
  const r = data[index]
  const g = data[index + 1]
  const b = data[index + 2]

  // Convert to HSL
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return // Grayscale, no saturation

  const d = max - min
  const s = l > 128 ? d / (510 - max - min) : d / (max + min)

  // Boost saturation by 20%
  const newS = Math.min(1, s * 1.2)

  // Convert back to RGB (simplified)
  const factor = newS / s
  data[index] = Math.round(128 + (r - 128) * factor)
  data[index + 1] = Math.round(128 + (g - 128) * factor)
  data[index + 2] = Math.round(128 + (b - 128) * factor)
}

/**
 * Remove background color (make transparent)
 * Detects corner pixels as background
 */
function removeBackgroundColor(imageData: ImageData) {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  // Sample corner pixels to detect background
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]

  const bgColors = corners.map(([x, y]) => {
    const i = (y * width + x) * 4
    return { r: data[i], g: data[i + 1], b: data[i + 2] }
  })

  // Find most common corner color
  const bgColor = bgColors[0] // Simplified: use top-left

  // Remove similar colors
  const threshold = 30
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const diff =
      Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b)

    if (diff < threshold) {
      data[i + 3] = 0 // Make transparent
    }
  }
}

/**
 * Get preview URL from blob
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Estimate processing time
 */
export function estimateProcessingTime(fileSize: number): number {
  // Very rough estimate in milliseconds
  return Math.min(200, fileSize / 10000)
}
