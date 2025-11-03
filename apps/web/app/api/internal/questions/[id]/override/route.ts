import { NextRequest, NextResponse } from 'next/server';
import type { QuestionNormalized } from '@plms/shared/types';

/**
 * PATCH /api/internal/questions/:id/override
 *
 * Override difficulty manually
 * Updates: manualOverride with source and version
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const { difficulty, overriddenBy, source } = body;

    if (!difficulty || !overriddenBy || !source) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: difficulty, overriddenBy, source',
        },
        { status: 400 }
      );
    }

    // TODO: Fetch question from database
    // For now, mock data
    const question: QuestionNormalized = {
      id,
      rawId: 'raw-123',
      subject: 'math',
      stem: 'Example question',
      choices: ['A', 'B', 'C', 'D'],
      answer: 'B',
      aiLabel: {
        topic: 'algebra',
        skill: 'problem_solving',
        difficulty: 'medium',
        errorTypes: ['calculation'],
        grade: 'junior_high_1',
        confidence: 0.75,
        labeledAt: new Date().toISOString(),
        version: '1.0.0',
      },
      confidence: 0.75,
      labelSource: 'teacher_override',
      labelVersion: 1,
      finalDifficulty: difficulty,
      manualOverride: {
        difficulty,
        overriddenBy,
        overriddenAt: new Date().toISOString(),
        source,
        version: '1.0.0',
      },
      isDuplicate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Save to database

    console.log('[Difficulty Override]', {
      questionId: id,
      aiDifficulty: question.aiLabel.difficulty,
      manualDifficulty: difficulty,
      overriddenBy,
      source,
    });

    return NextResponse.json({
      success: true,
      data: question,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Difficulty Override] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OVERRIDE_FAILED',
          message: error instanceof Error ? error.message : 'Override failed',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
