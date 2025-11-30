/**
 * 🤖 Gemini-Powered Avatar Generation
 *
 * Three-stage process:
 * 1. Client-side pixelation (instant preview)
 * 2. Gemini analysis (understand photo features)
 * 3. AI image generation (high-quality pixel art)
 */

import { pixelateImage, blobToDataURL } from './pixelate-client'

export interface AvatarGenerationResult {
  /** Instant preview (client-side pixelation) */
  preview: string
  /** Gemini's analysis of the photo */
  analysis?: GeminiAnalysis
  /** Final high-quality avatar URL */
  finalUrl?: string
  /** Generation status */
  status: 'preview' | 'analyzing' | 'generating' | 'completed' | 'error'
  /** Error message if failed */
  error?: string
}

export interface GeminiAnalysis {
  /** Text description of the person */
  description: string
  /** Key features (hair, face shape, etc) */
  features: string[]
  /** Generated prompt for image generation */
  pixelArtPrompt: string
  /** Recommended color palette */
  colorPalette: string[]
}

/**
 * Generate avatar with Gemini + image generation
 * Returns preview immediately, then upgrades to high-quality
 */
export async function generateAvatarWithGemini(
  file: File,
  onProgress?: (result: AvatarGenerationResult) => void
): Promise<AvatarGenerationResult> {
  const result: AvatarGenerationResult = {
    preview: '',
    status: 'preview',
  }

  try {
    // ⚡ STAGE 1: Instant client-side preview (0.2s)
    console.log('[Avatar] Stage 1: Creating preview...')
    const previewBlob = await pixelateImage(file, {
      size: 64,
      colors: 16,
      style: 'jrpg',
    })
    result.preview = await blobToDataURL(previewBlob)
    result.status = 'preview'
    onProgress?.(result)

    // 🤖 STAGE 2: Gemini analysis (1-2s)
    console.log('[Avatar] Stage 2: Analyzing with Gemini...')
    result.status = 'analyzing'
    onProgress?.(result)

    const analysis = await analyzePhotoWithGemini(file)
    result.analysis = analysis
    onProgress?.(result)

    // 🎨 STAGE 3: Generate high-quality pixel art (3-5s)
    console.log('[Avatar] Stage 3: Generating pixel art...')
    result.status = 'generating'
    onProgress?.(result)

    const finalUrl = await generatePixelArtFromPrompt(analysis.pixelArtPrompt)
    result.finalUrl = finalUrl
    result.status = 'completed'
    onProgress?.(result)

    return result
  } catch (error) {
    console.error('[Avatar] Generation failed:', error)
    result.status = 'error'
    result.error = error instanceof Error ? error.message : 'Unknown error'
    onProgress?.(result)
    return result
  }
}

/**
 * Use Gemini to analyze photo and create detailed prompt
 */
async function analyzePhotoWithGemini(file: File): Promise<GeminiAnalysis> {
  // Convert to base64
  const arrayBuffer = await file.arrayBuffer()
  const base64Image = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = file.type

  // Gemini prompt for avatar analysis
  const prompt = `分析這張人像照片，提供以下資訊：

1. **人物描述**: 簡短描述（年齡、性別、髮型、臉型）
2. **關鍵特徵**: 列出 3-5 個最顯著的特徵
3. **像素藝術 Prompt**: 生成一個詳細的 prompt，用於創建 JRPG 風格的像素藝術頭像
4. **色彩調色板**: 建議 8-12 種適合的顏色（hex 格式）

要求：
- 像素藝術必須是 64x64 或 128x128 像素
- 風格：經典 JRPG 對話頭像（如 Final Fantasy VI, Chrono Trigger）
- 背景：透明
- 清晰的像素塊，避免平滑漸變
- 保持人物的辨識度

請以 JSON 格式回答：
{
  "description": "人物描述",
  "features": ["特徵1", "特徵2", ...],
  "pixelArtPrompt": "完整的像素藝術生成 prompt",
  "colorPalette": ["#RRGGBB", ...]
}`

  const response = await fetch('/api/avatar/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      image: base64Image,
      mimeType,
      prompt,
    }),
  })

  if (!response.ok) {
    throw new Error('Gemini analysis failed')
  }

  const data = await response.json()
  return data.analysis
}

/**
 * Generate pixel art using an image generation API
 * (Replicate, DALL-E, or Stable Diffusion)
 */
async function generatePixelArtFromPrompt(prompt: string): Promise<string> {
  const response = await fetch('/api/avatar/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    throw new Error('Image generation failed')
  }

  const data = await response.json()
  return data.avatarUrl
}

/**
 * Quick version: Only client-side pixelation (no AI)
 */
export async function generateAvatarQuick(file: File): Promise<string> {
  const blob = await pixelateImage(file, {
    size: 64,
    colors: 16,
    style: 'jrpg',
  })

  return await blobToDataURL(blob)
}
