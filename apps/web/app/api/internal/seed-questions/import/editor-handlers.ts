import { NextResponse } from 'next/server'

// Type definitions for Editor Mode
interface EditorModeQuestion {
    questionNumber: number
    topic: string | null
    articleText: string
    blanks: Array<{
        blankId: number
        correctAnswer: string
        partOfSpeech: string
        chineseMeaning: string
        contextBefore: string
        contextAfter: string
        analysis: string
    }>
    optionPool: Array<{
        label: string
        word: string
        chineseMeaning: string
        partOfSpeech: string
    }>
    distractorOptions: Array<{
        label: string
        word: string
        chineseMeaning: string
        partOfSpeech: string
    }>
}

// Parser function (stub - implement as needed)
function parseEditorModeQuestion(text: string): EditorModeQuestion | null {
    // TODO: Implement actual parsing logic
    return null
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

    // 處理模考類型：將 NATIONAL_MOCK、NORTHERN_MOCK、SYSTEM 轉換為 OTHER
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
    // 注意：Editor Mode 不使用標準的 option_a/b/c/d 欄位，而是使用 editor_data JSONB 欄位
    const questionRecord = {
        source: `${sourcePrefix}_${sourceYear}_Paper_${paperNumber}`,
        source_year: sourceYear,
        source_type: dbSourceType,
        paper_number: paperNumber,
        question_number: parsedQuestion.questionNumber,
        subject: 'english', // Editor Mode 目前只支援英文
        question_text: parsedQuestion.articleText.substring(0, 500), // 摘要（用於列表顯示）
        option_a: '', // Editor Mode 不使用這些欄位
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A', // 佔位符
        difficulty_level: 3, // 預設難度，可以之後從 blanks 計算平均值
        knowledge_tags: parsedQuestion.topic ? [parsedQuestion.topic] : [],
        game_mode: 'editor', // 標記為 Editor Mode
        editor_data: editorData, // 存儲完整的 Editor Mode 資料
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
        { status: 501 } // 501 Not Implemented
    );
}
