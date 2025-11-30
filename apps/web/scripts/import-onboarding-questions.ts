import { supabaseBrowserClient } from '@/lib/supabase'

const questions = [
  // 難度 1 (容易題)
  {
    question_text: '下列哪一個是正確的英文問候語？',
    option_a: 'How are you?',
    option_b: 'How is you?', 
    option_c: 'How you are?',
    option_d: 'Are how you?',
    correct_answer: 'A',
    difficulty_level: 1,
    subject: 'english',
    explanation: 'How are you? 是最常見的英文問候語，用來詢問對方的近況。'
  },
  {
    question_text: '下列哪個單字的意思是「快樂的」？',
    option_a: 'happy',
    option_b: 'sad',
    option_c: 'angry', 
    option_d: 'tired',
    correct_answer: 'A',
    difficulty_level: 1,
    subject: 'english',
    explanation: 'happy 的中文意思是「快樂的」。'
  },
  {
    question_text: '選出正確的英文單字：「學生」',
    option_a: 'student',
    option_b: 'teacher',
    option_c: 'school',
    option_d: 'book',
    correct_answer: 'A', 
    difficulty_level: 1,
    subject: 'english',
    explanation: 'student 是「學生」的意思。'
  },
  // 難度 2 (中等題)
  {
    question_text: '選出正確的過去式：I ____ to the store yesterday.',
    option_a: 'go',
    option_b: 'goes',
    option_c: 'went',
    option_d: 'going',
    correct_answer: 'C',
    difficulty_level: 2,
    subject: 'english',
    explanation: 'go 的過去式是 went，因為 yesterday 表示過去時間。'
  },
  {
    question_text: '下列哪個句子文法正確？',
    option_a: 'She don\'t like coffee.',
    option_b: 'She doesn\'t like coffee.',
    option_c: 'She not like coffee.',
    option_d: 'She no like coffee.',
    correct_answer: 'B',
    difficulty_level: 2,
    subject: 'english', 
    explanation: '第三人稱單數否定要用 doesn\'t，而不是 don\'t。'
  },
  {
    question_text: '選擇正確的時態：He ____ his homework right now.',
    option_a: 'do',
    option_b: 'does',
    option_c: 'is doing',
    option_d: 'did',
    correct_answer: 'C',
    difficulty_level: 2,
    subject: 'english',
    explanation: '「right now」表示現在進行式，要用 is doing。'
  },
  // 難度 3 (挑戰題)
  {
    question_text: '下列哪一個句子使用了正確的被動語態？',
    option_a: 'The book was written by Shakespeare.',
    option_b: 'The book write by Shakespeare.',
    option_c: 'The book is write by Shakespeare.',
    option_d: 'The book writing by Shakespeare.',
    correct_answer: 'A',
    difficulty_level: 3,
    subject: 'english',
    explanation: '被動語態的結構是 be + 過去分詞。這裡使用 was written 是正確的形式。'
  }
]

async function importQuestions() {
  console.log('🚀 開始導入 onboarding 題目...')
  
  try {
    // 檢查現有題目
    const { data: existing, error: checkError } = await supabaseBrowserClient
      .from('onboarding_questions')
      .select('id')
      .limit(1)
    
    if (checkError) {
      console.error('❌ 檢查現有題目失敗:', checkError)
      return
    }
    
    if (existing && existing.length > 0) {
      console.log('✅ 題目已存在，跳過導入')
      return
    }
    
    // 導入題目
    const { data, error } = await supabaseBrowserClient
      .from('onboarding_questions')
      .insert(questions)
      .select('id')
    
    if (error) {
      console.error('❌ 導入題目失敗:', error)
      return
    }
    
    console.log('✅ 成功導入', data?.length || 0, '題題目')
    
    // 驗證結果
    const { data: verification } = await supabaseBrowserClient
      .from('onboarding_questions')
      .select('difficulty_level, count:id.count()')
      .group('difficulty_level')
    
    console.log('📊 題目分布:', verification)
    
  } catch (error) {
    console.error('❌ 導入過程發生錯誤:', error)
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  importQuestions()
}

export { importQuestions }