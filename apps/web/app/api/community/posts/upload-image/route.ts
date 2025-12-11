import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/community/posts/upload-image
 * 
 * Upload image to community_images bucket
 * Returns the public URL of the uploaded image
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: '請先登入' },
                { status: 401 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '請選擇圖片' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                {
                    error: 'VALIDATION_ERROR',
                    message: '僅支援 JPG、PNG、WebP 和 GIF 格式',
                },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    error: 'VALIDATION_ERROR',
                    message: `圖片大小不能超過 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
                },
                { status: 400 }
            );
        }

        // Sanitize filename
        const sanitizeFileName = (name: string): string => {
            const ext = name.substring(name.lastIndexOf('.'));
            const baseName = name.substring(0, name.lastIndexOf('.')) || name;
            const sanitized = baseName
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .replace(/_{2,}/g, '_')
                .substring(0, 100);
            const finalName = sanitized || 'image';
            return `${finalName}${ext}`;
        };

        const timestamp = Date.now();
        const safeFileName = sanitizeFileName(file.name);
        const filePath = `${user.id}/${timestamp}-${safeFileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('community_images')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('[Community Image Upload] Storage error:', uploadError);
            return NextResponse.json(
                {
                    error: 'UPLOAD_ERROR',
                    message: '圖片上傳失敗，請稍後再試',
                },
                { status: 500 }
            );
        }

        // Get public URL
        const {
            data: { publicUrl },
        } = supabase.storage.from('community_images').getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            path: filePath,
        });
    } catch (error) {
        console.error('[Community Image Upload] Unexpected error:', error);
        return NextResponse.json(
            {
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : '伺服器錯誤',
            },
            { status: 500 }
        );
    }
}
