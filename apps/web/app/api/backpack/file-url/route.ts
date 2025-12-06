import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

/**
 * GET /api/backpack/file-url
 *
 * Generate a signed URL for a backpack file
 * Required query param: path
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getApiUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '需要登入' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path')
    const fileId = searchParams.get('file_id')

    if (!path && !fileId) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Missing path or file_id parameter' },
        { status: 400 }
      )
    }

    let targetPath = path

    // If file_id is provided, look up the file_url from database
    if (fileId) {
      const { data: item, error: dbError } = await supabase
        .from('backpack_items')
        .select('file_url')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single()

      if (dbError || !item) {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'File not found' },
          { status: 404 }
        )
      }

      // Check if it's a storage URI
      if (item.file_url && item.file_url.startsWith('storage://')) {
        targetPath = item.file_url.replace('storage://backpack_files/', '')
      } else if (item.file_url && item.file_url.startsWith('http')) {
        // If it's already a URL (e.g. legacy public URL or long-lived signed URL), return it directly
        // Note: If valid long-lived signed URL, we just return it. 
        // If it's expired, we can't easily recover unless we stored the path. 
        // Assuming recently uploaded files use storage:// or 1-year keys.
        return NextResponse.json({
          success: true,
          url: item.file_url,
        })
      } else {
        return NextResponse.json(
          { error: 'INVALID_FILE', message: 'Invalid file URL format' },
          { status: 500 }
        )
      }
    }

    if (!targetPath) {
      return NextResponse.json(
        { error: 'RESOLVE_ERROR', message: 'Could not resolve file path' },
        { status: 500 }
      )
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('backpack_files')
      .createSignedUrl(targetPath, 3600) // 1 hour

    if (error) {
      console.error('[Backpack File URL] Error:', error)
      return NextResponse.json(
        {
          error: 'STORAGE_ERROR',
          message: error.message,
        },
        { status: 500 }
      )
    }

    if (!data?.signedUrl) {
      return NextResponse.json(
        { error: 'NO_URL', message: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
    })
  } catch (error) {
    console.error('[Backpack File URL] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
