import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/api/auth';
import { chatCompletionJSON } from '@/lib/gemini';

/**
 * POST /api/internal/seed-questions/ai-parse
 * 
 * 使用 AI 自動解析一整年試題的純文字，提取年份、類別、科目、題目、選項、答案、詳解
 * 
 * Body:
 * - text: string - 試題文字內容
 * - sourceType?: string - 預設考試類型 (GSAT/AST/OTHER)
 * - sourceYear?: number - 預設年份
 */
interface AIParsedQuestion {
  question_number: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  difficulty_level: number; // 1-5
  subject: 'chinese' | 'english' | 'math' | 'science' | 'social';
  knowledge_tags: string[];
  explanation_text?: string;
}

interface AIParseResponse {
  source_year?: number;
  source_type?: 'GSAT' | 'AST' | 'OTHER';
  questions: AIParsedQuestion[];
}

const AI_PARSE_SYSTEM_PROMPT = `你是一個專業的試題解析助手。請從提供的試題文字中，自動提取以下資訊：

1. **試題資訊**：
   - 年份（source_year）：從文字中找出考試年份，如 2024、113 學年度等
   - 類別（source_type）：判斷是 GSAT（學測）、AST（指考）或其他（OTHER）
   - 科目（subject）：判斷科目，必須是以下之一：chinese（國文）、english（英文）、math（數學）、science（自然）、social（社會）

2. **每題題目**：
   - question_number：題號（如 "1", "7", "選填C"）
   - question_text：題目文字
   - option_a, option_b, option_c, option_d：四個選項
   - correct_answer：正確答案（A/B/C/D）
   - difficulty_level：難度等級（1-5，1最簡單，5最難）
   - knowledge_tags：知識點標籤陣列（如 ["英文-詞彙題", "英文-自然/季節"]）
   - explanation_text：詳解文字（如果有）

請以 JSON 格式返回，格式如下：
{
  "source_year": 2024,
  "source_type": "GSAT",
  "questions": [
    {
      "question_number": "1",
      "question_text": "題目文字...",
      "option_a": "選項A",
      "option_b": "選項B",
      "option_c": "選項C",
      "option_d": "選項D",
      "correct_answer": "C",
      "difficulty_level": 3,
      "subject": "english",
      "knowledge_tags": ["英文-詞彙題", "英文-自然/季節"],
      "explanation_text": "詳解內容..."
    }
  ]
}

注意事項：
- 如果無法確定年份，可以省略 source_year
- 如果無法確定類別，使用 "OTHER"
- 科目必須從文字內容判斷，不能猜測
- 難度等級如果無法判斷，預設為 3
- 知識點標籤可以從題目內容推斷
- 詳解如果沒有，可以省略 explanation_text
- 確保所有題目都有完整的四個選項和正確答案`;

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient(req);

  // 檢查認證
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required. Please log in.',
      },
      { status: 401 }
    );
  }

  const userId = user.id;

  try {
    const body = await req.json();
    const { text, sourceType, sourceYear } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '請提供試題文字內容',
        },
        { status: 400 }
      );
    }

    console.log('[AI Parse] Starting AI parsing, text length:', text.length);

    // 構建 AI 提示
    const userPrompt = `請解析以下試題文字，提取所有題目資訊：

${text}

${sourceType ? `提示：考試類型可能是 ${sourceType}` : ''}
${sourceYear ? `提示：年份可能是 ${sourceYear}` : ''}

請仔細分析文字內容，提取所有題目。`;

    // 調用 AI 解析
    const aiResponse = await chatCompletionJSON<AIParseResponse>(
      [
        { role: 'system', content: AI_PARSE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'gpt-4o',
        temperature: 0.2,
        responseFormat: { type: 'json_object' },
      }
    );

    console.log('[AI Parse] AI response received, questions count:', aiResponse.questions?.length || 0);

    if (!aiResponse.questions || aiResponse.questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI 無法從文字中提取題目，請確認文字格式是否正確',
        },
        { status: 400 }
      );
    }

    // 驗證和轉換題目格式
    const questions: any[] = [];
    const errors: Array<{ question_number: string; error: string }> = [];

    for (const q of aiResponse.questions) {
      try {
        // 驗證必要欄位
        if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
          errors.push({
            question_number: q.question_number || '未知',
            error: '缺少必要欄位（題目文字或選項）',
          });
          continue;
        }

        // 驗證正確答案
        if (!['A', 'B', 'C', 'D'].includes(q.correct_answer)) {
          errors.push({
            question_number: q.question_number || '未知',
            error: `無效的正確答案: ${q.correct_answer}`,
          });
          continue;
        }

        // 驗證難度等級
        const difficulty = Math.max(1, Math.min(5, q.difficulty_level || 3));

        // 驗證科目
        const validSubjects = ['chinese', 'english', 'math', 'science', 'social'];
        if (!validSubjects.includes(q.subject)) {
          errors.push({
            question_number: q.question_number || '未知',
            error: `無效的科目: ${q.subject}`,
          });
          continue;
        }

        // 構建題目物件
        const question = {
          source: `${aiResponse.source_type || sourceType || 'OTHER'}_${aiResponse.source_year || sourceYear || new Date().getFullYear()}`,
          source_year: aiResponse.source_year || sourceYear || new Date().getFullYear(),
          source_type: (aiResponse.source_type || sourceType || 'OTHER') as 'GSAT' | 'AST' | 'OTHER',
          paper_number: 1,
          question_number: q.question_number || String(questions.length + 1),
          subject: q.subject,
          question_text: q.question_text,
          question_image_url: null,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          difficulty_level: difficulty,
          knowledge_tags: q.knowledge_tags || [],
          has_explanation: !!q.explanation_text,
          is_active: true,
          imported_by: userId,
          explanation_text: q.explanation_text, // 暫存，稍後插入到 question_explanations
        };

        questions.push(question);
      } catch (error) {
        errors.push({
          question_number: q.question_number || '未知',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '沒有有效的題目可以匯入',
          errors,
        },
        { status: 400 }
      );
    }

    console.log('[AI Parse] Valid questions:', questions.length, 'Errors:', errors.length);

    // 插入題目到資料庫
    const questionsToInsert = questions.map(({ explanation_text, ...q }) => q);
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('seed_questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('[AI Parse] Database insert error:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: `資料庫錯誤: ${insertError.message}`,
          errors,
        },
        { status: 500 }
      );
    }

    console.log('[AI Parse] Successfully inserted questions:', insertedQuestions?.length || 0);

    // 插入詳解到 question_explanations 表
    if (insertedQuestions && insertedQuestions.length > 0) {
      const explanations = insertedQuestions
        .map((q, idx) => {
          const originalQ = questions[idx];
          if (!originalQ.explanation_text) return null;

          return {
            question_id: q.id,
            explanation_text: originalQ.explanation_text,
            option_analysis: {},
          };
        })
        .filter(Boolean);

      if (explanations.length > 0) {
        console.log('[AI Parse] Inserting explanations, count:', explanations.length);
        const { error: explanationError } = await supabase
          .from('question_explanations')
          .insert(explanations);

        if (explanationError) {
          console.error('[AI Parse] Explanation insert error:', explanationError);
          // 不返回錯誤，因為題目已經成功插入
        } else {
          console.log('[AI Parse] Successfully inserted explanations');
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: insertedQuestions?.length || 0,
      total: questions.length,
      errors: errors.length,
      errorDetails: errors,
      source_year: aiResponse.source_year || sourceYear,
      source_type: aiResponse.source_type || sourceType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AI Parse] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI 解析失敗',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}

