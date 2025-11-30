import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'

/**
 * POST /api/internal/onboarding-questions/import
 * 
 * Import onboarding questions from seed data
 * Internal use only - requires admin authentication
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient(req)

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required. Please log in.',
      },
      { status: 401 }
    )
  }

  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      {
        success: false,
        error: '無法獲取用戶資料',
      },
      { status: 403 }
    )
  }

  if (profile.role !== 'admin') {
    return NextResponse.json(
      {
        success: false,
        error: '只有管理員才能匯入題目',
      },
      { status: 403 }
    )
  }

  try {
    // Seed questions data (難度 1-3，符合資料庫 schema)
    const seedQuestions = [
      // Difficulty Level 1 (簡單題 - 建立信心)
      {
        question_text: 'Before John got on the stage to give the speech, he took a deep _________ to calm himself down.',
        option_a: 'order',
        option_b: 'rest',
        option_c: 'effort',
        option_d: 'breath',
        correct_answer: 'D',
        difficulty_level: 1,
        subject: 'english',
        explanation: '【核心考點】考查固定搭配 take a deep breath (深呼吸)。根據動作目的「讓自己平靜下來」（to calm himself down），判斷上台前可以採取的行動是深呼吸。',
        knowledge_tags: ['英文-詞彙題', '慣用語', '基礎詞彙'],
      },
      {
        question_text: 'Microscopes are used in medical research labs for studying bacteria or _________ that are too small to be visible to the naked eye.',
        option_a: 'agencies',
        option_b: 'codes',
        option_c: 'germs',
        option_d: 'indexes',
        correct_answer: 'C',
        difficulty_level: 1,
        subject: 'english',
        explanation: '【核心考點】根據語境「醫學研究實驗室」和「研究細菌」，判斷空格應填入另一個與細菌類似的微小致病生物。germs (病菌) 最符合顯微鏡下觀察的致病微生物。',
        knowledge_tags: ['英文-詞彙題', '名詞', '基礎詞彙'],
      },
      {
        question_text: 'The manager agreed to rent his apartment to me. Even though the agreement was not put in writing, I am sure he will keep his word.',
        option_a: 'barely',
        option_b: 'stably',
        option_c: 'verbally',
        option_d: 'massively',
        correct_answer: 'C',
        difficulty_level: 1,
        subject: 'english',
        explanation: '【核心考點】根據語境「儘管協議沒有寫成書面」（not put in writing），判斷協議是以口頭形式達成的。verbally (口頭上地) 與 not in writing 相對應。',
        knowledge_tags: ['英文-詞彙題', '副詞', '基礎詞彙'],
      },
      {
        question_text: 'After several rounds of intense fighting, the boxer punched his _________ right in the face, knocked him out, and won the match.',
        option_a: 'performer',
        option_b: 'attendant',
        option_c: 'opponent',
        option_d: 'messenger',
        correct_answer: 'C',
        difficulty_level: 1,
        subject: 'english',
        explanation: '【核心考點】根據語境「拳擊手」、「激烈搏鬥」和「贏得比賽」，判斷拳擊手攻擊並擊倒的對象應是比賽的對手 (opponent)。',
        knowledge_tags: ['英文-詞彙題', '名詞', '基礎詞彙'],
      },
      {
        question_text: 'As David finished the last drop of the delicious chicken soup, he licked his lips and gave out sounds of _________.',
        option_a: 'contentment',
        option_b: 'dominance',
        option_c: 'explosion',
        option_d: 'affection',
        correct_answer: 'A',
        difficulty_level: 1,
        subject: 'english',
        explanation: '【核心考點】根據語境「美味的雞湯」和動作「舔嘴唇」，判斷 David 對食物表達的是享受和滿足的情緒。contentment (滿足) 最符合享用美食後的狀態。',
        knowledge_tags: ['英文-詞彙題', '名詞', '基礎詞彙'],
      },
      // Difficulty Level 2 (中等題 - 稍有挑戰)
      {
        question_text: 'The sign in front of the Johnsons\' house says that no one is allowed to set foot on their _________ without permission.',
        option_a: 'margin',
        option_b: 'shelter',
        option_c: 'reservation',
        option_d: 'property',
        correct_answer: 'D',
        difficulty_level: 2,
        subject: 'english',
        explanation: '【核心考點】根據句意「未經允許不得踏上...」，判斷這個空間是私人擁有且禁止進入的地產或領地。property (房產；財產) 最符合私人住宅周圍的土地或建築。',
        knowledge_tags: ['英文-詞彙題', '名詞', '中等詞彙'],
      },
      {
        question_text: 'Instead of giving negative criticism, our teachers usually try to give us _________ feedback so that we can improve on our papers.',
        option_a: 'absolute',
        option_b: 'constructive',
        option_c: 'influential',
        option_d: 'peculiar',
        correct_answer: 'B',
        difficulty_level: 2,
        subject: 'english',
        explanation: '【核心考點】根據對比結構「而不是給予負面批評」和目的「這樣我們才能改進」，判斷老師提供的反饋必須是有益的。constructive (有建設性的) 與 negative 相對，且有助於 improve。',
        knowledge_tags: ['英文-詞彙題', '形容詞', '中等詞彙'],
      },
      {
        question_text: 'The athlete rolled up his sleeves to show his _________ forearms, thick and strong from years of training in weight-lifting.',
        option_a: 'barren',
        option_b: 'chubby',
        option_c: 'ragged',
        option_d: 'muscular',
        correct_answer: 'D',
        difficulty_level: 2,
        subject: 'english',
        explanation: '【核心考點】根據修飾對象「前臂」和原因「多年重訓」及描述詞「厚實而強壯」，判斷運動員的前臂應具備肌肉發達的特性。muscular (肌肉發達的) 最符合舉重訓練的結果。',
        knowledge_tags: ['英文-詞彙題', '形容詞', '中等詞彙'],
      },
      {
        question_text: 'Martha has been trying to _________ her roommate since their quarrel last week, as she doesn\'t want to continue the argument.',
        option_a: 'overgrow',
        option_b: 'bother',
        option_c: 'pursue',
        option_d: 'avoid',
        correct_answer: 'D',
        difficulty_level: 2,
        subject: 'english',
        explanation: '【核心考點】根據結果「她並不想繼續爭執」，判斷 Martha 對室友採取的行動是避免接觸。avoid (避開) 符合不想繼續爭吵而保持距離的行為。',
        knowledge_tags: ['英文-詞彙題', '動詞', '中等詞彙'],
      },
      {
        question_text: 'The high-tech company\'s _________ earnings surely made its shareholders happy since they were getting a good return on their investment.',
        option_a: 'robust',
        option_b: 'solitary',
        option_c: 'imperative',
        option_d: 'terminal',
        correct_answer: 'A',
        difficulty_level: 2,
        subject: 'english',
        explanation: '【核心考點】根據語境「股東很高興」和原因「獲得了良好的投資回報」，判斷這家高科技公司的收益一定是強勁且穩定的。robust (強勁的) 形容經濟、收益的強大和穩定。',
        knowledge_tags: ['英文-詞彙題', '形容詞', '中等詞彙'],
      },
      // Difficulty Level 3 (挑戰題 - 測試實力)
      {
        question_text: 'The film Life of Pi won Ang Lee an Oscar in 2013 for Best Director—one of the most _________ awards in the movie industry.',
        option_a: 'populated',
        option_b: 'surpassed',
        option_c: 'coveted',
        option_d: 'rotated',
        correct_answer: 'C',
        difficulty_level: 3,
        subject: 'english',
        explanation: '【核心考點】根據語境「奧斯卡最佳導演獎」，判斷這個獎項在電影界是人人都想要、極度渴求的。coveted (夢寐以求的) 形容許多人熱烈追求的獎項。',
        knowledge_tags: ['英文-詞彙題', '形容詞', '高階詞彙'],
      },
      {
        question_text: 'Due to the worldwide recession, the World Bank\'s forecast for next year\'s global economic growth is _________.',
        option_a: 'keen',
        option_b: 'mild',
        option_c: 'grim',
        option_d: 'foul',
        correct_answer: 'C',
        difficulty_level: 3,
        subject: 'english',
        explanation: '【核心考點】根據語境「全球經濟衰退」，判斷世界銀行對全球經濟增長的預測應該是不樂觀的。grim (嚴峻的；黯淡的) 最符合經濟衰退期對增長的悲觀預期。',
        knowledge_tags: ['英文-詞彙題', '形容詞', '高階詞彙'],
      },
      {
        question_text: 'The kingdom began to _________ after the death of its ruler, and was soon taken over by a neighboring country.',
        option_a: 'collapse',
        option_b: 'dismiss',
        option_c: 'rebel',
        option_d: 'withdraw',
        correct_answer: 'A',
        difficulty_level: 3,
        subject: 'english',
        explanation: '【核心考點】根據語境「統治者去世後」和後果「很快被鄰國接管」，判斷這個國家在失去領導者後面臨瓦解。collapse (崩潰；瓦解) 最符合國家結構徹底失敗的狀態。',
        knowledge_tags: ['英文-詞彙題', '動詞', '高階詞彙'],
      },
      {
        question_text: 'Plants and animals in some deserts must cope with a climate of _________ freezing winters and very hot summers.',
        option_a: 'extremes',
        option_b: 'forecasts',
        option_c: 'atmospheres',
        option_d: 'homelands',
        correct_answer: 'A',
        difficulty_level: 3,
        subject: 'english',
        explanation: '【核心考點】根據語境「沙漠」、「冰凍的冬天」和「炎熱的夏天」，判斷沙漠的氣候特點是溫差極大。extremes (極端) 符合「冰凍」和「炎熱」這兩種相反且強烈的氣候狀況。',
        knowledge_tags: ['英文-詞彙題', '名詞', '高階詞彙'],
      },
      {
        question_text: 'If student enrollment _________, some programs at the university may be eliminated to reduce the operation costs.',
        option_a: 'relieved',
        option_b: 'eliminated',
        option_c: 'projected',
        option_d: 'drops',
        correct_answer: 'D',
        difficulty_level: 3,
        subject: 'english',
        explanation: '【核心考點】根據語境「大學課程可能會被淘汰以減少營運成本」，判斷課程被淘汰的原因是學生入學人數減少。drops (下降；減少) 最符合導致削減成本的經濟因素。',
        knowledge_tags: ['英文-詞彙題', '動詞', '高階詞彙'],
      },
    ]

    // Check if questions already exist
    const { data: existingQuestions } = await supabase
      .from('onboarding_questions')
      .select('id')
      .eq('subject', 'english')
      .limit(1)

    if (existingQuestions && existingQuestions.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Onboarding questions already exist. Please delete existing questions first or use a different method.',
        existingCount: existingQuestions.length,
      }, { status: 400 })
    }

    // Insert questions
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('onboarding_questions')
      .insert(seedQuestions)
      .select('id, difficulty_level')

    if (insertError) {
      console.error('[OnboardingQuestionsImport] Failed to insert questions:', insertError)
      return NextResponse.json(
        {
          success: false,
          error: `資料庫錯誤: ${insertError.message}`,
          errorCode: insertError.code,
        },
        { status: 500 }
      )
    }

    // Count by difficulty
    const countByDifficulty = insertedQuestions.reduce((acc: Record<number, number>, q: any) => {
      acc[q.difficulty_level] = (acc[q.difficulty_level] || 0) + 1
      return acc
    }, {})

    console.log('[OnboardingQuestionsImport] Successfully inserted questions:', {
      total: insertedQuestions.length,
      byDifficulty: countByDifficulty,
    })

    return NextResponse.json({
      success: true,
      message: `成功匯入 ${insertedQuestions.length} 道 onboarding 題目`,
      total: insertedQuestions.length,
      byDifficulty: countByDifficulty,
      questions: insertedQuestions.map((q: any) => ({
        id: q.id,
        difficulty: q.difficulty_level,
      })),
    })
  } catch (error) {
    console.error('[OnboardingQuestionsImport] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

