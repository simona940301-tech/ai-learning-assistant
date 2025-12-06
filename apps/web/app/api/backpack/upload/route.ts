import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * POST /api/backpack/upload
 *
 * Upload file to backpack
 * Requires authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication with proper JWT error handling
    const { supabase, user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
            ? 'Authentication required'
            : 'Authentication error occurred'

      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message,
          errorType,
        },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const subject = formData.get('subject') as string
    const title = formData.get('title') as string

    if (!file) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'File is required',
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        },
        { status: 400 }
      )
    }

    // Determine file type
    let fileType: 'text' | 'pdf' | 'image' = 'text'
    if (file.type.startsWith('image/')) {
      fileType = 'image'
    } else if (file.type === 'application/pdf') {
      fileType = 'pdf'
    } else if (file.type.startsWith('text/')) {
      fileType = 'text'
    }

    // Upload to Supabase Storage
    // 🎯 修復：清理檔案名稱，移除特殊字符和中文字符，避免 Supabase Storage key 錯誤
    const sanitizeFileName = (name: string): string => {
      // 獲取檔案擴展名
      const ext = name.substring(name.lastIndexOf('.'))
      // 移除擴展名，清理檔案名稱
      const baseName = name.substring(0, name.lastIndexOf('.')) || name
      // 只保留字母、數字、連字符和下劃線，其他字符替換為下劃線
      const sanitized = baseName
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_{2,}/g, '_') // 移除多個連續下劃線
        .substring(0, 100) // 限制長度
      // 如果清理後為空，使用預設名稱
      const finalName = sanitized || 'file'
      return `${finalName}${ext}`
    }

    const timestamp = Date.now()
    const safeFileName = sanitizeFileName(file.name)
    const fileName = `${user.id}/${timestamp}-${safeFileName}`
    // ✅ FIX: Remove bucket name prefix from filePath - getPublicUrl() expects path without bucket name
    const filePath = fileName

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backpack_files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Backpack Upload] Storage error:', uploadError)
      return NextResponse.json(
        {
          error: 'UPLOAD_ERROR',
          message: uploadError.message,
        },
        { status: 500 }
      )
    }

    // ✅ FIX: Store file path instead of public URL
    // Since backpack_files bucket is NOT public, we need to generate signed URLs on demand
    // Store the storage path, not the URL
    const storagePath = filePath

    // Generate a signed URL (valid for 1 year) for immediate use
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('backpack_files')
      .createSignedUrl(storagePath, 365 * 24 * 60 * 60) // 1 year

    if (signedUrlError) {
      console.error('[Backpack Upload] Signed URL error:', signedUrlError)
      // Fallback: use path-based format that can be converted to signed URL later
    }

    const fileUrl = signedUrlData?.signedUrl || `storage://backpack_files/${storagePath}`

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('backpack_items')
      .insert({
        user_id: user.id,
        subject: subject || 'math',
        type: fileType,
        title: title || file.name,
        file_url: fileUrl,
        file_size: file.size,
        content: null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Backpack Upload] Database error:', dbError)
      // Try to delete uploaded file
      await supabase.storage.from('backpack_files').remove([filePath])
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: dbError.message,
        },
        { status: 500 }
      )
    }

    // 🚀 NotebookLM Feature: Auto-index for RAG
    try {
      // Convert File to Buffer for service
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { RagIndexingService } = await import('@/lib/services/rag-indexing-service')

      // Fire and forget (Background indexing)
      RagIndexingService.processDocument(
        buffer,
        file.name,
        file.type,
        file.size,
        user.id,
        {
          backpackItemId: dbData.id,
          isBackground: true
        }
      ).catch(err => console.error('[Backpack Upload] Background indexing failed:', err))

      console.log('[Backpack Upload] 🚀 Triggered background indexing for:', file.name)
    } catch (indexError) {
      // Don't fail the upload if indexing fails, just log it
      console.error('[Backpack Upload] Failed to trigger indexing:', indexError)
    }

    return NextResponse.json({
      success: true,
      fileId: dbData.id, // 🎯 添加 fileId 以兼容 BackpackUploader 組件
      item: dbData,
      message: 'File uploaded and scheduled for indexing',
    })
  } catch (error) {
    console.error('[Backpack Upload] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}








