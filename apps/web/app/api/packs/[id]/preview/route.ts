import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PackPreview, PackChapter, QuestionPreview } from '@plms/shared/types';
import { getConfidenceBadge } from '@plms/shared/types';

/**
 * GET /api/packs/:id/preview
 *
 * Get pack preview with chapters and sample questions (without answers)
 * Public endpoint - no auth required
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const supabase = createClient();

    // Get pack
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('*')
      .eq('id', id)
      .single();

    if (packError || !pack) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PACK_NOT_FOUND', message: 'Pack not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Get pack chapters (if structure exists)
    const { data: chapters } = await supabase
      .from('pack_chapters')
      .select('*')
      .eq('pack_id', id)
      .order('order', { ascending: true });

    // Get preview questions (max 3 per chapter, or 5 total if no chapters)
    let previewQuestions: QuestionPreview[] = [];
    let packChapters: PackChapter[] = [];

    if (chapters && chapters.length > 0) {
      // Structured pack with chapters
      for (const chapter of chapters) {
        const { data: questions } = await supabase
          .from('pack_questions')
          .select('id, stem, choices, has_explanation, difficulty')
          .eq('pack_id', id)
          .eq('chapter_id', chapter.id)
          .limit(3);

        const chapterPreview: PackChapter = {
          id: chapter.id,
          title: chapter.title,
          order: chapter.order,
          itemCount: chapter.item_count || 0,
          previewQuestions:
            questions?.map(q => ({
              id: q.id,
              stem: q.stem,
              choices: q.choices,
              hasExplanation: q.has_explanation,
              difficulty: q.difficulty,
            })) || [],
        };

        packChapters.push(chapterPreview);
      }
    } else {
      // Flat pack without chapters - show 5 random preview questions
      const { data: questions } = await supabase
        .from('pack_questions')
        .select('id, stem, choices, has_explanation, difficulty')
        .eq('pack_id', id)
        .limit(5);

      previewQuestions =
        questions?.map(q => ({
          id: q.id,
          stem: q.stem,
          choices: q.choices,
          hasExplanation: q.has_explanation,
          difficulty: q.difficulty,
        })) || [];

      // Create a single "default" chapter for flat packs
      packChapters = [
        {
          id: 'default',
          title: '題目預覽',
          order: 0,
          itemCount: pack.item_count,
          previewQuestions,
        },
      ];
    }

    const totalPreviewItems = packChapters.reduce(
      (sum, ch) => sum + ch.previewQuestions.length,
      0
    );

    // Build preview response
    const preview: PackPreview = {
      id: pack.id,
      title: pack.title,
      description: pack.description,
      subject: pack.subject,
      topic: pack.topic,
      skill: pack.skill,
      grade: pack.grade,
      itemCount: pack.item_count,
      hasExplanation: pack.has_explanation,
      explanationRate: pack.explanation_rate,
      avgConfidence: pack.avg_confidence,
      confidenceBadge: getConfidenceBadge(pack.avg_confidence),
      status: pack.status,
      publishedAt: pack.published_at,
      expiresAt: pack.expires_at,
      installCount: pack.install_count,
      completionRate: pack.completion_rate || 0,
      qrAlias: pack.qr_alias,
      createdAt: pack.created_at,
      updatedAt: pack.updated_at,
      createdBy: pack.created_by,
      chapters: packChapters,
      totalPreviewItems,
    };

    return NextResponse.json({
      success: true,
      data: preview,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Pack Preview API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
