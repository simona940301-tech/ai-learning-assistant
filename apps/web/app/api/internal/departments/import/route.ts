import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/api/auth';
import { convertDepartmentStandards, type DepartmentStandardInput, type DepartmentStandardOutput } from '@/lib/gsat-standards';

/**
 * POST /api/internal/departments/import
 * 
 * Import department requirements from CSV file
 * Expected CSV format matches department_requirements table schema
 */
export async function POST(req: NextRequest) {
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

    const departmentMap = new Map<string, { department: Omit<DepartmentStandardOutput, 'gender_requirement'>; row: number }>();
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

        // Build department object (without scores first)
        const departmentInput: DepartmentStandardInput = {
          university_name: row.university_name,
          department_name: row.department_name,
          department_code: row.department_code || undefined,
          admission_quota: row.admission_quota ? parseInt(row.admission_quota) : undefined,
          gender_requirement: row.gender_requirement || undefined,
          requirement_chinese: row.requirement_chinese || undefined,
          requirement_english: row.requirement_english || undefined,
          requirement_math_a: row.requirement_math_a || undefined,
          requirement_math_b: row.requirement_math_b || undefined,
          requirement_social: row.requirement_social || undefined,
          requirement_natural: row.requirement_natural || undefined,
          requirement_english_listening: row.requirement_english_listening || undefined,
        };

        // 🎯 自動轉換級距標準為分數 (頂標→13, 前標→12, 均標→10 等)
        const department = convertDepartmentStandards(departmentInput);

        // Schema 尚未支援 gender_requirement，匯入時忽略此欄
        const { gender_requirement, ...departmentWithoutGender } = department;

        const normalizedUniversity = (departmentWithoutGender.university_name || '').trim().toLowerCase();
        const normalizedDepartment = (departmentWithoutGender.department_name || '').trim().toLowerCase();
        const departmentKey = `${normalizedUniversity}::${normalizedDepartment}`;

        if (departmentMap.has(departmentKey)) {
          const existingRow = departmentMap.get(departmentKey)?.row ?? 'unknown';
          errors.push({
            row: i + 1,
            error: `Duplicate department entry detected (first occurrence at row ${existingRow})`,
          });
          continue;
        }

        departmentMap.set(departmentKey, {
          department: departmentWithoutGender,
          row: i + 1,
        });
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const departments = Array.from(departmentMap.values()).map(entry => entry.department);

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
