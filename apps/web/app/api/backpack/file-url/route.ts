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

    if (!path) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Missing path parameter' },
        { status: 400 }
      )
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('backpack_files')
      .createSignedUrl(path, 3600) // 1 hour

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
