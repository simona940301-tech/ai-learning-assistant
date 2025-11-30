import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/api/auth';
import { withInternalAuth, unauthorizedResponse } from '@/lib/auth-middleware';

/**
 * POST /api/internal/departments/import
 * 
 * Import department requirements from CSV file
 * Expected CSV format matches department_requirements table schema
 */
export async function POST(req: NextRequest) {
  const authResult = await withInternalAuth(req);
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error || 'Unauthorized');
  }

  const supabase = getSupabaseClient(req);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'CSV file must have at least a header and one data row' },
        { status: 400 }
      );
    }

    // Parse CSV headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Required fields
    const requiredFields = ['university_name', 'department_name'];

    const departments: any[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    // Parse each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validate required fields
        const missingFields = requiredFields.filter(field => !row[field]);
        if (missingFields.length > 0) {
          errors.push({
            row: i + 1,
            error: `Missing required fields: ${missingFields.join(', ')}`,
          });
          continue;
        }

        // Validate gender_requirement
        if (row.gender_requirement && !['無', '男', '女'].includes(row.gender_requirement)) {
          errors.push({
            row: i + 1,
            error: 'gender_requirement must be one of: 無, 男, 女',
          });
          continue;
        }

        // Build department object
        const department: any = {
          university_name: row.university_name,
          department_name: row.department_name,
          department_code: row.department_code || null,
          admission_quota: row.admission_quota ? parseInt(row.admission_quota) : null,
          gender_requirement: row.gender_requirement || null,
          requirement_chinese: row.requirement_chinese || null,
          requirement_english: row.requirement_english || null,
          requirement_math_a: row.requirement_math_a || null,
          requirement_math_b: row.requirement_math_b || null,
          requirement_social: row.requirement_social || null,
          requirement_natural: row.requirement_natural || null,
          requirement_english_listening: row.requirement_english_listening || null,
          score_chinese: row.score_chinese ? parseInt(row.score_chinese) : null,
          score_english: row.score_english ? parseInt(row.score_english) : null,
          score_math_a: row.score_math_a ? parseInt(row.score_math_a) : null,
          score_math_b: row.score_math_b ? parseInt(row.score_math_b) : null,
          score_social: row.score_social ? parseInt(row.score_social) : null,
          score_natural: row.score_natural ? parseInt(row.score_natural) : null,
          score_english_listening: row.score_english_listening || null,
        };

        departments.push(department);
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (departments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid departments found',
          errors,
        },
        { status: 400 }
      );
    }

    // Insert departments into database (using upsert to handle duplicates)
    const { data: insertedDepartments, error: insertError } = await supabase
      .from('department_requirements')
      .upsert(departments, {
        onConflict: 'university_name,department_name',
      })
      .select();

    if (insertError) {
      console.error('[Departments Import] Database error:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: insertedDepartments?.length || 0,
      total: departments.length,
      errors: errors.length,
      errorDetails: errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Departments Import] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      },
      { status: 500 }
    );
  }
}


