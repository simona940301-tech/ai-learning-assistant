import { NextRequest, NextResponse } from 'next/server';
import type { UploadResult } from '@plms/shared/types';
import { withInternalAuth, unauthorizedResponse } from '@/lib/auth-middleware';

/**
 * CR7: Allowed file types for question upload
 */
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
] as const;

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx', '.pdf'] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * CR7: Validate file type and size
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * POST /api/internal/questions/upload
 *
 * Upload question file (CSV/Excel/PDF) and process
 * Internal use only
 */
export async function POST(req: NextRequest) {
  // CR7: Check permission (admin/teacher only)
  const authResult = await withInternalAuth(req);
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error || 'Unauthorized');
  }

  const { userId, role } = authResult.context!;

  try {
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const batchId = formData.get('batchId') as string || `batch-${Date.now()}`;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // CR7: Validate file type and size
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Read file content
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);

    // Parse CSV (simple implementation - can be enhanced)
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());

    const questionIds: string[] = [];
    const errorDetails: Array<{ row: number; error: string }> = [];
    let duplicates = 0;

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validate required fields
        if (!row.stem || !row.answer) {
          errorDetails.push({
            row: i + 1,
            error: 'Missing required fields (stem or answer)',
          });
          continue;
        }

        // Generate question ID
        const questionId = `q-${Date.now()}-${i}`;
        questionIds.push(questionId);

        // TODO: Save to database (questions_raw)
        // TODO: Detect duplicates
        // TODO: Trigger AI labeling

      } catch (error) {
        errorDetails.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const result: UploadResult = {
      batchId, // CR4: Batch tracking
      totalRows: lines.length - 1, // Excluding header
      processed: questionIds.length,
      duplicates,
      errors: errorDetails.length,
      retried: 0,
      questionIds,
      errorDetails,
      isResubmission: false,
    };

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Question Upload] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Upload failed',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
