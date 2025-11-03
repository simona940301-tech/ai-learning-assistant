import { NextRequest, NextResponse } from 'next/server';
import type { QuestionNormalized } from '@plms/shared/types';
import { labelQuestion, detectDuplicates } from '@/lib/ai-labeling';

/**
 * POST /api/internal/questions/process/:rawId
 *
 * Process raw question:
 * 1. Normalize format
 * 2. Apply AI labeling
 * 3. Detect duplicates
 * 4. Store in questions table
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { rawId: string } }
) {
  try {
    const { rawId } = params;

    // TODO: Fetch raw question from database
    // For now, mock data
    const rawQuestion = {
      id: rawId,
      sourceFile: 'example.csv',
      rawContent: 'What is 2 + 2?',
      uploadedAt: new Date().toISOString(),
      status: 'pending' as const,
    };

    // Step 1: Normalize
    const normalized = {
      subject: 'math',
      stem: rawQuestion.rawContent,
      choices: ['3', '4', '5', '6'],
      answer: '4',
      explanation: '2 plus 2 equals 4',
    };

    // Step 2: AI Labeling
    const aiLabel = await labelQuestion(normalized.stem);

    // Step 3: Detect duplicates
    const existingQuestions: Array<{ id: string; stem: string }> = [];
    // TODO: Fetch from database

    const duplicateCheck = await detectDuplicates(
      rawId,
      normalized.stem,
      existingQuestions
    );

    // Step 4: Create normalized question
    const questionId = `q-normalized-${Date.now()}`;
    const question: QuestionNormalized = {
      id: questionId,
      rawId,
      ...normalized,
      aiLabel,
      confidence: aiLabel.confidence,
      labelSource: 'ai',
      labelVersion: 1,
      finalDifficulty: aiLabel.difficulty,
      isDuplicate: duplicateCheck.isDuplicate,
      duplicateOf: duplicateCheck.duplicateOf,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Save to database (questions table)

    console.log('[Question Process]', {
      rawId,
      questionId,
      difficulty: aiLabel.difficulty,
      confidence: aiLabel.confidence,
      isDuplicate: duplicateCheck.isDuplicate,
    });

    return NextResponse.json({
      success: true,
      data: question,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Question Process] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROCESS_FAILED',
          message: error instanceof Error ? error.message : 'Processing failed',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
