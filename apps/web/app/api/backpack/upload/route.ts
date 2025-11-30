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
    const timestamp = Date.now()
    const fileName = `${user.id}/${timestamp}-${file.name}`
    const filePath = `backpack_files/${fileName}`

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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('backpack_files')
      .getPublicUrl(filePath)

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('backpack_items')
      .insert({
        user_id: user.id,
        subject: subject || 'math',
        type: fileType,
        title: title || file.name,
        file_url: urlData.publicUrl,
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

    return NextResponse.json({
      success: true,
      item: dbData,
      message: 'File uploaded successfully',
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








