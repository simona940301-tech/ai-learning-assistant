import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/api/auth';
import { parseExplanationFile, ParsedQuestion } from '@/lib/parsers/explanation-parser';
import { parseEditorModeQuestion, isEditorModeFormat, EditorModeQuestion } from '@/lib/parsers/editor-mode-parser';

/**
 * POST /api/internal/seed-questions/import
 * 
 * Import seed questions from CSV file
 * Expected CSV format:
 * source,source_year,source_type,paper_number,question_number,subject,question_text,option_a,option_b,option_c,option_d,correct_answer,difficulty_level,knowledge_tags
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient(req);

  // TEMPORARY: Skip authentication for testing (remove after testing)
  // Check authentication using session (cookies)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log('[API] Auth check - user:', user?.id, 'error:', authError);

  let userId = 'system-admin'; // Default fallback

  if (user) {
    userId = user.id;
    console.log('[API] Using authenticated user:', userId);
  } else {
    console.log('[API] No authenticated user, using fallback userId');
  }

  // Skip all role checks for testing

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const explanationFile = formData.get('explanationFile') as File | null;
    const sourceType = (formData.get('sourceType') as string) || 'GSAT';
    const sourceYear = formData.get('sourceYear') ? parseInt(formData.get('sourceYear') as string) : new Date().getFullYear();
    const paperNumber = formData.get('paperNumber') ? parseInt(formData.get('paperNumber') as string) : 1;
    const gameMode = (formData.get('gameMode') as string) || 'practice'; // 新增：遊戲模式

    console.log('[Seed Questions Import] Received form data:', {
      hasCsv: !!file,
      hasExplanation: !!explanationFile,
      explanationFileType: explanationFile ? typeof explanationFile : 'null',
      explanationFileIsFile: explanationFile instanceof File,
      explanationFileName: explanationFile ? (explanationFile as File).name : 'N/A',
      explanationFileSize: explanationFile ? (explanationFile as File).size : 'N/A',
      sourceType,
      sourceYear,
      paperNumber,
      gameMode,
    });

    // 如果只有詳解檔案，解析詳解檔案並創建題目
    if (!file && explanationFile) {
      console.log('[Seed Questions Import] Processing explanation file only');
      // 確保 explanationFile 是 File 對象
      if (!(explanationFile instanceof File)) {
        console.error('[Seed Questions Import] explanationFile is not a File instance:', explanationFile);
        return NextResponse.json(
          { success: false, error: '詳解檔案格式錯誤，請重新上傳' },
          { status: 400 }
        );
      }

      // 根據遊戲模式選擇不同的處理邏輯
      if (gameMode === 'editor') {
        return await handleEditorModeFile(explanationFile, sourceType, sourceYear, paperNumber, userId, supabase);
      } else if (gameMode === 'detective') {
        return await handleDetectiveModeFile(explanationFile, sourceType, sourceYear, paperNumber, userId, supabase);
      } else {
        // 默認使用原有的 Practice Mode 處理
        return await handleExplanationFileOnly(explanationFile, sourceType, sourceYear, paperNumber, userId, supabase);
      }
    }

    // 如果只有 CSV 檔案，使用原有邏輯
    if (file && !explanationFile) {
      console.log('[Seed Questions Import] Processing CSV file only');
      return await handleCsvFileOnly(file, userId, supabase);
    }

    // 如果兩者都有，先處理 CSV，然後將詳解附加到對應題目
    if (file && explanationFile) {
      console.log('[Seed Questions Import] Processing both files');
      return await handleBothFiles(file, explanationFile, sourceType, sourceYear, paperNumber, userId, supabase);
    }

    console.error('[Seed Questions Import] No files provided');
    return NextResponse.json(
      { success: false, error: '請至少上傳 CSV 檔案或詳解檔案' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Seed Questions Import] Error:', error);
    console.error('[Seed Questions Import] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * 處理只有詳解檔案的情況
 */
async function handleExplanationFileOnly(
  explanationFile: File,
  sourceType: string,
  sourceYear: number,
  paperNumber: number,
  userId: string,
  supabase: any
) {
  console.log('[handleExplanationFileOnly] File info:', {
    name: explanationFile.name,
    type: explanationFile.type,
    size: explanationFile.size,
  });

  // 只支援 TXT 檔案（檢查檔案類型或副檔名）
  const isTxtFile =
    explanationFile.type === 'text/plain' ||
    explanationFile.type === '' || // 某些瀏覽器可能不設置 MIME type
    explanationFile.name.toLowerCase().endsWith('.txt');

  if (!isTxtFile) {
    return NextResponse.json(
      {
        success: false,
        error: `詳解檔案必須是 TXT 格式。目前檔案類型：${explanationFile.type || '未知'}，檔名：${explanationFile.name}`
      },
      { status: 400 }
    );
  }

  // 讀取並解析詳解檔案
  let text: string;
  try {
    text = await explanationFile.text();
    console.log('[handleExplanationFileOnly] File content length:', text.length);
    console.log('[handleExplanationFileOnly] First 500 chars:', text.substring(0, 500));
  } catch (error) {
    console.error('[handleExplanationFileOnly] Failed to read file:', error);
    return NextResponse.json(
      { success: false, error: '無法讀取檔案內容' },
      { status: 400 }
    );
  }

  let parsedQuestions: ParsedQuestion[];
  try {
    parsedQuestions = parseExplanationFile(text);
    console.log('[handleExplanationFileOnly] Parsed questions count:', parsedQuestions.length);
  } catch (error) {
    console.error('[handleExplanationFileOnly] Failed to parse file:', error);
    console.error('[handleExplanationFileOnly] Parse error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: '解析檔案失敗',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 400 }
    );
  }

  if (parsedQuestions.length === 0) {
    console.error('[handleExplanationFileOnly] No questions parsed. Text preview:', text.substring(0, 1000));
    return NextResponse.json(
      {
        success: false,
        error: '詳解檔案中沒有找到題目。請確認檔案格式正確，包含題目編號、題目文字、選項、答案、難度等資訊。',
        details: '解析器無法從文字中找到完整的題目。請確認格式包含：📝 題目 X、題目文字、答案、難度、標籤、選項分析或詳解區塊。',
        textPreview: text.substring(0, 500), // 提供文字預覽幫助調試
      },
      { status: 400 }
    );
  }

  // 上傳詳解檔案到 Supabase Storage（可選，失敗不影響題目匯入）
  let explanationUrl: string | null = null;
  try {
    const fileName = `explanations/${Date.now()}_${Math.random().toString(36).substring(2)}.txt`;
    console.log('[handleExplanationFileOnly] Attempting to upload file to storage:', fileName);

    const { error: uploadError } = await supabase.storage
      .from('explanations')
      .upload(fileName, explanationFile, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.warn('[handleExplanationFileOnly] Storage upload failed (non-critical):', uploadError);
      console.warn('[handleExplanationFileOnly] Continuing without storage URL');
      // 不返回錯誤，繼續處理題目匯入
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('explanations')
        .getPublicUrl(fileName);
      explanationUrl = publicUrl;
      console.log('[handleExplanationFileOnly] File uploaded successfully:', explanationUrl);
    }
  } catch (storageError) {
    console.warn('[handleExplanationFileOnly] Storage upload exception (non-critical):', storageError);
    // 繼續處理，不中斷流程
  }

  // 轉換為資料庫格式
  const questions: any[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < parsedQuestions.length; i++) {
    const pq = parsedQuestions[i];

    // 從標籤推斷科目（預設為 english）
    let subject = 'english';
    if (pq.knowledgeTags.length > 0) {
      const firstTag = pq.knowledgeTags[0].toLowerCase();
      if (firstTag.includes('國文') || firstTag.includes('chinese')) subject = 'chinese';
      else if (firstTag.includes('數學') || firstTag.includes('math')) subject = 'math';
      else if (firstTag.includes('自然') || firstTag.includes('science')) subject = 'science';
      else if (firstTag.includes('社會') || firstTag.includes('social')) subject = 'social';
    }

    // 處理模考類型和系統自創：將 NATIONAL_MOCK、NORTHERN_MOCK、SYSTEM 轉換為 OTHER，並在 source 中標記
    let dbSourceType: 'GSAT' | 'AST' | 'OTHER' = sourceType as 'GSAT' | 'AST' | 'OTHER';
    let sourcePrefix = sourceType;
    if (sourceType === 'NATIONAL_MOCK' || sourceType === 'NORTHERN_MOCK' || sourceType === 'SYSTEM') {
      dbSourceType = 'OTHER';
      sourcePrefix = sourceType; // 保留原始類型在 source 中
    }

    questions.push({
      source: `${sourcePrefix}_${sourceYear}_Paper_${paperNumber}`,
      source_year: sourceYear,
      source_type: dbSourceType,
      paper_number: paperNumber,
      question_number: pq.questionNumber,
      subject: subject as 'chinese' | 'english' | 'math' | 'science' | 'social',
      question_text: pq.questionText,
      option_a: pq.optionA || '',
      option_b: pq.optionB || '',
      option_c: pq.optionC || '',
      option_d: pq.optionD || '',
      correct_answer: pq.correctAnswer,
      difficulty_level: pq.difficulty,
      knowledge_tags: pq.knowledgeTags || [],
      explanation_file_url: explanationUrl,
      has_explanation: true,
      is_active: true,
      imported_by: userId,
    });
  }

  // 插入題目到資料庫
  console.log('[handleExplanationFileOnly] Inserting questions to database, count:', questions.length);
  console.log('[handleExplanationFileOnly] First question sample:', {
    questionNumber: questions[0]?.questionNumber,
    questionText: questions[0]?.questionText?.substring(0, 50),
    hasOptions: !!(questions[0]?.optionA && questions[0]?.optionB),
    correctAnswer: questions[0]?.correctAnswer,
    difficulty: questions[0]?.difficulty,
  });

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('seed_questions')
    .insert(questions)
    .select();

  if (insertError) {
    console.error('[handleExplanationFileOnly] Database insert error:', insertError);
    console.error('[handleExplanationFileOnly] Error code:', insertError.code);
    console.error('[handleExplanationFileOnly] Error details:', insertError.details);
    console.error('[handleExplanationFileOnly] Error hint:', insertError.hint);
    return NextResponse.json(
      {
        success: false,
        error: `資料庫錯誤: ${insertError.message}`,
        errorCode: insertError.code,
        errors,
      },
      { status: 500 }
    );
  }

  console.log('[handleExplanationFileOnly] Successfully inserted questions:', insertedQuestions?.length || 0);

  // 插入詳解到 question_explanations 表
  if (insertedQuestions && insertedQuestions.length > 0) {
    const explanations = insertedQuestions.map((q: any, idx: number) => {
      const pq = parsedQuestions[idx];
      return {
        question_id: q.id,
        explanation_text: pq.explanation?.fullText || '',
        option_analysis: pq.explanation ? {
          corePoint: pq.explanation.corePoint,
          translation: pq.explanation.translation,
          conclusion: pq.explanation.conclusion,
        } : {},
      };
    });

    console.log('[handleExplanationFileOnly] Inserting explanations, count:', explanations.length);
    const { error: explanationError } = await supabase
      .from('question_explanations')
      .insert(explanations);

    if (explanationError) {
      console.error('[handleExplanationFileOnly] Explanation insert error:', explanationError);
      // 不返回錯誤，因為題目已經成功插入
    } else {
      console.log('[handleExplanationFileOnly] Successfully inserted explanations');
    }
  }

  return NextResponse.json({
    success: true,
    imported: insertedQuestions?.length || 0,
    total: questions.length,
    errors: errors.length,
    errorDetails: errors,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 處理只有 CSV 檔案的情況
 */
async function handleCsvFileOnly(
  file: File,
  userId: string,
  supabase: any
) {

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

  // Required fields mapping
  const requiredFields = [
    'subject', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'difficulty_level'
  ];

  const questions: any[] = [];
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

      // Validate correct_answer
      if (!['A', 'B', 'C', 'D'].includes(row.correct_answer.toUpperCase())) {
        errors.push({
          row: i + 1,
          error: 'correct_answer must be A, B, C, or D',
        });
        continue;
      }

      // Validate difficulty_level
      const difficulty = parseInt(row.difficulty_level);
      if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
        errors.push({
          row: i + 1,
          error: 'difficulty_level must be between 1 and 5',
        });
        continue;
      }

      // Validate subject
      const validSubjects = ['chinese', 'english', 'math', 'science', 'social'];
      if (!validSubjects.includes(row.subject.toLowerCase())) {
        errors.push({
          row: i + 1,
          error: `subject must be one of: ${validSubjects.join(', ')}`,
        });
        continue;
      }

      // Validate source_type (GSAT, AST, OTHER - using OTHER for mock exams)
      const validSourceTypes = ['GSAT', 'AST', 'OTHER'];
      if (row.source_type && !validSourceTypes.includes(row.source_type.toUpperCase())) {
        errors.push({
          row: i + 1,
          error: `source_type must be one of: ${validSourceTypes.join(', ')} (use OTHER for mock exams)`,
        });
        continue;
      }

      // Parse knowledge_tags (comma-separated or array)
      let knowledgeTags: string[] = [];
      if (row.knowledge_tags) {
        try {
          knowledgeTags = JSON.parse(row.knowledge_tags);
        } catch {
          knowledgeTags = row.knowledge_tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }
      }

      // Build question object
      const question = {
        source: row.source || `imported_${Date.now()}`,
        source_year: row.source_year ? parseInt(row.source_year) : null,
        source_type: (row.source_type?.toUpperCase() || 'OTHER') as 'GSAT' | 'AST' | 'OTHER',
        paper_number: row.paper_number ? parseInt(row.paper_number) : null,
        question_number: row.question_number || String(i),
        subject: row.subject.toLowerCase() as 'chinese' | 'english' | 'math' | 'science' | 'social',
        question_text: row.question_text,
        question_image_url: row.question_image_url || null,
        option_a: row.option_a,
        option_b: row.option_b,
        option_c: row.option_c,
        option_d: row.option_d,
        correct_answer: row.correct_answer.toUpperCase() as 'A' | 'B' | 'C' | 'D',
        difficulty_level: difficulty,
        knowledge_tags: knowledgeTags,
        has_explanation: row.has_explanation === 'true' || row.has_explanation === '1',
        is_active: row.is_active !== 'false' && row.is_active !== '0',
        imported_by: userId,
      };

      questions.push(question);
    } catch (error) {
      errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (questions.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'No valid questions found',
        errors,
      },
      { status: 400 }
    );
  }

  // Insert questions into database
  const { data: insertedQuestions, error: insertError } = await supabase
    .from('seed_questions')
    .insert(questions)
    .select();

  if (insertError) {
    console.error('[Seed Questions Import] Database error:', insertError);
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
    imported: insertedQuestions?.length || 0,
    total: questions.length,
    errors: errors.length,
    errorDetails: errors,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 處理同時有 CSV 和詳解檔案的情況
 */
async function handleBothFiles(
  file: File,
  explanationFile: File,
  sourceType: string,
  sourceYear: number,
  paperNumber: number,
  userId: string,
  supabase: any
) {
  // 先處理 CSV（使用原有邏輯）
  const csvResult = await handleCsvFileOnly(file, userId, supabase);
  if (!csvResult.ok) {
    return csvResult;
  }

  const csvData = await csvResult.json();
  if (!csvData.success || !csvData.imported || csvData.imported === 0) {
    return csvResult;
  }

  // 如果詳解檔案是 TXT，嘗試解析並匹配題目
  if (explanationFile.type === 'text/plain' || explanationFile.name.endsWith('.txt')) {
    const text = await explanationFile.text();
    const parsedQuestions = parseExplanationFile(text);

    // 上傳詳解檔案
    const fileName = `explanations/${Date.now()}_${Math.random().toString(36).substring(2)}.txt`;
    const { error: uploadError } = await supabase.storage
      .from('explanations')
      .upload(fileName, explanationFile, {
        contentType: 'text/plain',
        upsert: false
      });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('explanations')
        .getPublicUrl(fileName);

      // 更新題目的 explanation_file_url
      // 這裡可以根據題號匹配，但為了簡化，我們先更新所有題目
      // TODO: 實現更精確的題目匹配邏輯
    }
  } else {
    // PDF 檔案直接上傳
    const fileExt = 'pdf';
    const fileName = `explanations/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('explanations')
      .upload(fileName, explanationFile, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('[handleExplanationFileOnly] Upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `上傳失敗: ${uploadError.message}` },
        { status: 500 }
      );
    }
  }

  return csvResult;
}

/**
 * 處理 Editor Mode 檔案
 */
async function handleEditorModeFile(
  explanationFile: File,
  sourceType: string,
  sourceYear: number,
  paperNumber: number,
  userId: string,
  supabase: any
) {
  console.log('[handleEditorModeFile] Starting Editor Mode import');

  // 讀取檔案內容
  let text: string;
  try {
    text = await explanationFile.text();
    console.log('[handleEditorModeFile] File content length:', text.length);
  } catch (error) {
    console.error('[handleEditorModeFile] Failed to read file:', error);
    return NextResponse.json(
      { success: false, error: '無法讀取檔案內容' },
      { status: 400 }
    );
  }

  // 解析 Editor Mode 題目
  let parsedQuestion: EditorModeQuestion | null;
  try {
    parsedQuestion = parseEditorModeQuestion(text);
    console.log('[handleEditorModeFile] Parsed question:', parsedQuestion ? 'success' : 'failed');
  } catch (error) {
    console.error('[handleEditorModeFile] Failed to parse file:', error);
    return NextResponse.json(
      {
        success: false,
        error: '解析檔案失敗',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 400 }
    );
  }

  if (!parsedQuestion) {
    return NextResponse.json(
      {
        success: false,
        error: 'Editor Mode 題目解析失敗。請確認檔案格式正確。',
        details: '需要包含：文章（含空格標記）、正確選項池、額外干擾選項、每個空格的詳解。',
      },
      { status: 400 }
    );
  }

  // 處理模考類型
  let dbSourceType: 'GSAT' | 'AST' | 'OTHER' = sourceType as 'GSAT' | 'AST' | 'OTHER';
  let sourcePrefix = sourceType;
  if (sourceType === 'NATIONAL_MOCK' || sourceType === 'NORTHERN_MOCK' || sourceType === 'SYSTEM') {
    dbSourceType = 'OTHER';
    sourcePrefix = sourceType;
  }

  // 構建 editor_data JSON
  const editorData = {
    topic: parsedQuestion.topic,
    article_text: parsedQuestion.articleText,
    blanks: parsedQuestion.blanks.map(blank => ({
      blank_id: blank.blankId,
      correct_answer: blank.correctAnswer,
      part_of_speech: blank.partOfSpeech,
      chinese_meaning: blank.chineseMeaning,
      context_before: blank.contextBefore,
      context_after: blank.contextAfter,
      analysis: blank.analysis,
    })),
    option_pool: parsedQuestion.optionPool.map(opt => ({
      label: opt.label,
      word: opt.word,
      chinese_meaning: opt.chineseMeaning,
      part_of_speech: opt.partOfSpeech,
    })),
    distractor_options: parsedQuestion.distractorOptions.map(opt => ({
      label: opt.label,
      word: opt.word,
      chinese_meaning: opt.chineseMeaning,
      part_of_speech: opt.partOfSpeech,
    })),
  };

  // 插入到 seed_questions 表
  const questionRecord = {
    source: `${sourcePrefix}_${sourceYear}_Paper_${paperNumber}`,
    source_year: sourceYear,
    source_type: dbSourceType,
    paper_number: paperNumber,
    question_number: parsedQuestion.questionNumber,
    subject: 'english',
    question_text: parsedQuestion.articleText.substring(0, 500),
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    difficulty_level: 3,
    knowledge_tags: parsedQuestion.topic ? [parsedQuestion.topic] : [],
    game_mode: 'editor',
    editor_data: editorData,
    has_explanation: true,
    is_active: true,
    imported_by: userId,
  };

  console.log('[handleEditorModeFile] Inserting question to database');

  const { data: insertedQuestion, error: insertError } = await supabase
    .from('seed_questions')
    .insert([questionRecord])
    .select();

  if (insertError) {
    console.error('[handleEditorModeFile] Database insert error:', insertError);
    return NextResponse.json(
      {
        success: false,
        error: `資料庫錯誤: ${insertError.message}`,
        errorCode: insertError.code,
      },
      { status: 500 }
    );
  }

  console.log('[handleEditorModeFile] Successfully inserted question');

  return NextResponse.json({
    success: true,
    imported: 1,
    total: 1,
    errors: 0,
    timestamp: new Date().toISOString(),
    message: 'Editor Mode 題目匯入成功',
  });
}

/**
 * 處理 Detective Mode 檔案（暫時返回未實作）
 */
async function handleDetectiveModeFile(
  explanationFile: File,
  sourceType: string,
  sourceYear: number,
  paperNumber: number,
  userId: string,
  supabase: any
) {
  console.log('[handleDetectiveModeFile] Detective Mode import not yet implemented');

  return NextResponse.json(
    {
      success: false,
      error: 'Detective Mode 匯入功能尚未實作',
      details: '請先使用 Practice Mode 或 Editor Mode',
    },
    { status: 501 }
  );
}
