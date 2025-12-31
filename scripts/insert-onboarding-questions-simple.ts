#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.log('Please make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface Question {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  difficulty_level: number
  subject: string
  explanation: string
  knowledge_tags: string[]
}

const questions: Question[] = [
  // Difficulty 1 - 5 questions
  {
    question_text: 'The new library has a large reading room where students can sit in _________ and focus on their studies.',
    option_a: 'silence',
    option_b: 'tension',
    option_c: 'sorrow',
    option_d: 'glamour',
    correct_answer: 'A',
    difficulty_level: 1,
    subject: 'english',
    explanation: '【核心考點】句中提到圖書館的閱讀室,目的是讓學生能夠 "focus on their studies" (專注於學習)。最能幫助專注的環境是安靜。\n【題幹翻譯】新圖書館有一個大型閱覽室,學生可以在安靜的環境中專注於學習。\n【選項分析】\n(A) silence (n.) 安靜,寂靜 (最符合閱讀室的環境要求)\n(B) tension (n.) 緊張\n(C) sorrow (n.) 悲傷\n(D) glamour (n.) 魅力,魔力',
    knowledge_tags: ['英文-詞彙題', '名詞', '基礎詞彙']
  },
  {
    question_text: 'The flight was cancelled due to the heavy snow, so we had to make _________ arrangements to travel by train instead.',
    option_a: 'tiny',
    option_b: 'dense',
    option_c: 'ultimate',
    option_d: 'alternative',
    correct_answer: 'D',
    difficulty_level: 1,
    subject: 'english',
    explanation: '【核心考點】句中提到航班被取消,所以必須改為搭火車 "instead" (作為替代)。此處需填入表示替代或選擇的形容詞。\n【題幹翻譯】由於大雪,航班被取消了,所以我們不得不做出替代的安排,改搭火車。\n【選項分析】\n(A) tiny (adj.) 微小的\n(B) dense (adj.) 密集的\n(C) ultimate (adj.) 最終的\n(D) alternative (adj.) 替代的,二選一的',
    knowledge_tags: ['英文-詞彙題', '形容詞', '基礎詞彙']
  },
  {
    question_text: 'Despite the initial difficulty, the construction workers finally managed to _________ the main bridge connecting the two cities.',
    option_a: 'invade',
    option_b: 'complete',
    option_c: 'vanish',
    option_d: 'scatter',
    correct_answer: 'B',
    difficulty_level: 1,
    subject: 'english',
    explanation: '【核心考點】句中主語是 "construction workers" (建築工人),受詞是 "the main bridge" (主橋)。他們在克服 "initial difficulty" (最初困難) 後,最終對橋樑採取的動作是完成建造。\n【題幹翻譯】儘管最初遇到困難,建築工人最終還是設法完成了連接這兩個城市的主橋。\n【選項分析】\n(A) invade (v.) 侵略\n(B) complete (v.) 完成 (符合工程建設的語境)\n(C) vanish (v.) 消失\n(D) scatter (v.) 分散',
    knowledge_tags: ['英文-詞彙題', '動詞', '基礎詞彙']
  },
  {
    question_text: 'Before giving a speech, the nervous politician often takes a deep _________ to calm himself down.',
    option_a: 'doubt',
    option_b: 'gesture',
    option_c: 'breath',
    option_d: 'habit',
    correct_answer: 'C',
    difficulty_level: 1,
    subject: 'english',
    explanation: '【核心考點】句中提到 "nervous politician" (緊張的政治人物) 為了 "calm himself down" (讓自己平靜下來) 所採取的行動。緩解緊張的常用方法是深呼吸 (take a deep breath)。\n【題幹翻譯】在發表演講之前,這位緊張的政治人物經常做一次深呼吸來讓自己平靜下來。\n【選項分析】\n(A) doubt (n.) 懷疑\n(B) gesture (n.) 手勢\n(C) breath (n.) 呼吸 (慣用語:take a deep breath)\n(D) habit (n.) 習慣',
    knowledge_tags: ['英文-詞彙題', '名詞', '慣用語', '基礎詞彙']
  },
  {
    question_text: 'The charity organization relies entirely on public _________ to support its projects and operations.',
    option_a: 'tuition',
    option_b: 'curiosity',
    option_c: 'donations',
    option_d: 'landscape',
    correct_answer: 'C',
    difficulty_level: 1,
    subject: 'english',
    explanation: '【核心考點】句中主語是 "charity organization" (慈善機構),它的運作 "relies entirely on" (完全依賴) 公眾的捐款或資助。\n【題幹翻譯】該慈善組織完全依賴公眾的捐款來支持其項目和營運。\n【選項分析】\n(A) tuition (n.) 學費\n(B) curiosity (n.) 好奇心\n(C) donations (n.) 捐款,捐贈物\n(D) landscape (n.) 風景',
    knowledge_tags: ['英文-詞彙題', '名詞', '基礎詞彙']
  },

  // Difficulty 2 - 5 questions
  {
    question_text: 'The museum displays a beautiful collection of traditional clothes that date back to the 18th _________.',
    option_a: 'territory',
    option_b: 'century',
    option_c: 'monument',
    option_d: 'ingredient',
    correct_answer: 'B',
    difficulty_level: 2,
    subject: 'english',
    explanation: '【核心考點】句中提到傳統服飾 "date back to the 18th _________" (可追溯到18世紀)。在歷史語境中,18世紀指的是一個百年的時間單位。\n【題幹翻譯】博物館展出了一系列精美的傳統服飾,可追溯到18世紀。\n【選項分析】\n(A) territory (n.) 領土,領域\n(B) century (n.) 世紀 (一百年)\n(C) monument (n.) 紀念碑\n(D) ingredient (n.) 成分,原料',
    knowledge_tags: ['英文-詞彙題', '名詞', '歷史語境']
  },
  {
    question_text: 'The mountain biking trail is designed to be challenging, with steep slopes and rough _________.',
    option_a: 'fiction',
    option_b: 'surface',
    option_c: 'pattern',
    option_d: 'emotion',
    correct_answer: 'B',
    difficulty_level: 2,
    subject: 'english',
    explanation: '【核心考點】句中描述山地自行車道 "trail" 的特點是 "steep slopes" (陡峭的斜坡) 和 "rough _________"。此處形容的是道路本身的表面狀況。\n【題幹翻譯】這條山地自行車道設計得很有挑戰性,有陡峭的斜坡和粗糙的路面。\n【選項分析】\n(A) fiction (n.) 小說,虛構\n(B) surface (n.) 表面,路面 (最符合道路描述的語境)\n(C) pattern (n.) 模式,圖案\n(D) emotion (n.) 情緒',
    knowledge_tags: ['英文-詞彙題', '名詞', '運動語境']
  },
  {
    question_text: 'After failing to save the drowning man, the lifeguard was filled with a deep sense of _________ and regret.',
    option_a: 'misery',
    option_b: 'glory',
    option_c: 'triumph',
    option_d: 'tension',
    correct_answer: 'A',
    difficulty_level: 2,
    subject: 'english',
    explanation: '【核心考點】句中提到救生員 "failing to save the drowning man" (未能救起溺水者),以及隨之而來的 "regret" (後悔)。這種失敗帶來的強烈負面情緒是悲慘或痛苦。\n【題幹翻譯】未能救起溺水者後,這位救生員內心充滿了深切的悲痛和後悔。\n【選項分析】\n(A) misery (n.) 痛苦,悲慘 (指極度的不適或不幸)\n(B) glory (n.) 光榮\n(C) triumph (n.) 勝利,成功\n(D) tension (n.) 緊張',
    knowledge_tags: ['英文-詞彙題', '名詞', '情緒詞彙']
  },
  {
    question_text: 'The small, remote village suffered from a serious lack of modern communication _________ like reliable internet access.',
    option_a: 'devices',
    option_b: 'fabrics',
    option_c: 'revenues',
    option_d: 'fortunes',
    correct_answer: 'A',
    difficulty_level: 2,
    subject: 'english',
    explanation: '【核心考點】句中提到該村莊缺乏 "reliable internet access" (可靠的網路連接) 等設施,這是屬於通訊設備或裝置的類別。\n【題幹翻譯】這個偏遠小村莊嚴重缺乏可靠網路等現代通訊設備。\n【選項分析】\n(A) devices (n.) 裝置,設備 (指用於特定用途的工具或機器)\n(B) fabrics (n.) 織物,布料\n(C) revenues (n.) 收益,稅收\n(D) fortunes (n.) 財富,運氣',
    knowledge_tags: ['英文-詞彙題', '名詞', '科技語境']
  },
  {
    question_text: 'If you want to achieve a healthy weight, you must learn to _________ a balance between diet and exercise.',
    option_a: 'strike',
    option_b: 'dismiss',
    option_c: 'withdraw',
    option_d: 'offend',
    correct_answer: 'A',
    difficulty_level: 2,
    subject: 'english',
    explanation: '【核心考點】句中提到目的是 "achieve a healthy weight" (達到健康的體重),必須在飲食和運動之間取得平衡。Strike a balance 是一個表示取得平衡的慣用片語。\n【題幹翻譯】如果你想達到健康的體重,你必須學會如何在飲食和運動之間取得平衡。\n【選項分析】\n(A) strike (v.) 擊打 (慣用語:strike a balance 取得平衡)\n(B) dismiss (v.) 解散,不予理會\n(C) withdraw (v.) 撤回,退出\n(D) offend (v.) 冒犯',
    knowledge_tags: ['英文-詞彙題', '動詞', '慣用語']
  },

  // Difficulty 3 - 5 questions
  {
    question_text: 'The professor\'s lecture was so complex and full of jargon that it was nearly incomprehensible to the undergraduate students.',
    option_a: 'accessible',
    option_b: 'identical',
    option_c: 'comprehensible',
    option_d: 'subjective',
    correct_answer: 'C',
    difficulty_level: 3,
    subject: 'english',
    explanation: '【核心考點】句中提到演講 "was so complex and full of jargon" (非常複雜且充滿術語),因此對於大學部學生來說,演講的狀態是難以理解的。\n【題幹翻譯】這位教授的演講非常複雜且充滿術語,對於大學生來說幾乎是難以理解的。\n【選項分析】\n(A) accessible (adj.) 易於取得的,可進入的\n(B) identical (adj.) 相同的\n(C) comprehensible (adj.) 可理解的\n(D) subjective (adj.) 主觀的',
    knowledge_tags: ['英文-詞彙題', '形容詞', '學術語境']
  },
  {
    question_text: 'His calm _________ under pressure allowed him to make rational decisions during the crisis.',
    option_a: 'gratitude',
    option_b: 'temper',
    option_c: 'demeanor',
    option_d: 'destiny',
    correct_answer: 'C',
    difficulty_level: 3,
    subject: 'english',
    explanation: '【核心考點】句中形容詞 "calm" (冷靜的) 修飾的名詞,必須是一種在 "under pressure" (壓力下) 能夠被觀察到的行為舉止或風度。\n【題幹翻譯】他在壓力下的冷靜舉止,使他能夠在危機中做出理性的決定。\n【選項分析】\n(A) gratitude (n.) 感謝\n(B) temper (n.) 脾氣 (通常指情緒狀態,而非外顯舉止)\n(C) demeanor (n.) 行為,風度 (指外顯的舉止、態度或神態)\n(D) destiny (n.) 命運',
    knowledge_tags: ['英文-詞彙題', '名詞', '抽象概念']
  },
  {
    question_text: 'The author\'s detailed description of the landscape seemed so _________ that readers could almost feel the cold wind blowing.',
    option_a: 'vivid',
    option_b: 'humble',
    option_c: 'massive',
    option_d: 'delicate',
    correct_answer: 'A',
    difficulty_level: 3,
    subject: 'english',
    explanation: '【核心考點】句中提到作者的描述效果是 "readers could almost feel the cold wind blowing" (讀者幾乎能感受到冷風吹拂),這說明描述具備生動且逼真的特性。\n【題幹翻譯】作者對景色的詳細描述看起來如此生動,以至於讀者幾乎可以感受到冷風吹拂。\n【選項分析】\n(A) vivid (adj.) 生動的,逼真的 (符合描述栩栩如生的語境)\n(B) humble (adj.) 謙遜的\n(C) massive (adj.) 巨大的\n(D) delicate (adj.) 精緻的,微妙的',
    knowledge_tags: ['英文-詞彙題', '形容詞', '文學語境']
  },
  {
    question_text: 'The scientist managed to _________ a new hypothesis based on years of observational data.',
    option_a: 'confine',
    option_b: 'formulate',
    option_c: 'interfere',
    option_d: 'surpass',
    correct_answer: 'B',
    difficulty_level: 3,
    subject: 'english',
    explanation: '【核心考點】句中主語是 "scientist" (科學家),受詞是 "a new hypothesis" (一個新的假說),根據 "years of observational data" (多年的觀察數據)。科學家對假說採取的行動是構建或提出。\n【題幹翻譯】這位科學家設法根據多年的觀察數據構建/提出了一個新的假說。\n【選項分析】\n(A) confine (v.) 限制,禁閉\n(B) formulate (v.) 規劃,構想 (尤指提出理論、計畫或公式)\n(C) interfere (v.) 干涉\n(D) surpass (v.) 超越',
    knowledge_tags: ['英文-詞彙題', '動詞', '學術語境']
  },
  {
    question_text: 'The committee needs to reach a _________ before proceeding with the next stage of the project.',
    option_a: 'consensus',
    option_b: 'segment',
    option_c: 'dimension',
    option_d: 'capacity',
    correct_answer: 'A',
    difficulty_level: 3,
    subject: 'english',
    explanation: '【核心考點】句中主語是 "committee" (委員會),其行動是 "before proceeding with the next stage" (在進行下一階段之前)。委員會在決策前必須達成的狀態是共識或一致意見。\n【題幹翻譯】委員會需要在進入項目的下一階段之前達成共識。\n【選項分析】\n(A) consensus (n.) 共識,一致意見 (慣用語:reach a consensus)\n(B) segment (n.) 部分\n(C) dimension (n.) 維度,層面\n(D) capacity (n.) 容量,能力',
    knowledge_tags: ['英文-詞彙題', '名詞', '慣用語', '商業語境']
  },

  // Difficulty 4 - 5 questions
  {
    question_text: 'The company\'s unethical business practices finally led to a public _________ that severely damaged its reputation.',
    option_a: 'analogy',
    option_b: 'setback',
    option_c: 'autonomy',
    option_d: 'scrutiny',
    correct_answer: 'D',
    difficulty_level: 4,
    subject: 'english',
    explanation: '【核心考點】句中提到公司 "unethical business practices" (不道德的商業行為) 導致其聲譽受到嚴重損害。這種行為會引發公眾的嚴密審查或詳細檢查。\n【題幹翻譯】該公司不道德的商業行為最終導致了公眾的嚴密審查,嚴重損害了其聲譽。\n【選項分析】\n(A) analogy (n.) 類比,相似\n(B) setback (n.) 挫折,倒退\n(C) autonomy (n.) 自治權\n(D) scrutiny (n.) 詳細審查,嚴密檢查 (指公眾或機構對其行為進行的嚴格檢視)',
    knowledge_tags: ['英文-詞彙題', '名詞', '高階詞彙', '商業語境']
  },
  {
    question_text: 'Despite repeated warnings, the city government failed to _________ the potential dangers of the faulty dam.',
    option_a: 'confine',
    option_b: 'rectify',
    option_c: 'anticipate',
    option_d: 'retrieve',
    correct_answer: 'C',
    difficulty_level: 4,
    subject: 'english',
    explanation: '【核心考點】句中提到市政府 "failed to _________" (未能...),儘管有 "repeated warnings" (一再的警告)。警告的目的在於讓政府預見或預期故障水壩的潛在危險。\n【題幹翻譯】儘管一再發出警告,市政府仍未能預見這座故障水壩的潛在危險。\n【選項分析】\n(A) confine (v.) 限制\n(B) rectify (v.) 矯正,修正\n(C) anticipate (v.) 預期,預見 (指根據現有資訊判斷未來可能發生什麼)\n(D) retrieve (v.) 取回,挽回',
    knowledge_tags: ['英文-詞彙題', '動詞', '高階詞彙']
  },
  {
    question_text: 'The newly discovered ancient manuscript provides invaluable _________ into the daily lives of the civilization\'s inhabitants.',
    option_a: 'insights',
    option_b: 'attributes',
    option_c: 'remnants',
    option_d: 'constraints',
    correct_answer: 'A',
    difficulty_level: 4,
    subject: 'english',
    explanation: '【核心考點】句中提到古老手稿的價值在於提供了關於古代文明居民 "daily lives" (日常生活) 的資訊。手稿能夠提供的珍貴資訊是深入的理解或洞察。\n【題幹翻譯】這份新發現的古代手稿為我們提供了關於該文明居民日常生活的寶貴洞察。\n【選項分析】\n(A) insights (n.) 洞察,見解 (指深入、透徹的理解)\n(B) attributes (n.) 屬性,特質\n(C) remnants (n.) 殘餘物,遺跡\n(D) constraints (n.) 限制,約束',
    knowledge_tags: ['英文-詞彙題', '名詞', '高階詞彙', '歷史語境']
  },
  {
    question_text: 'The board meeting was held in a strictly _________ manner, with no spontaneous discussion allowed outside the agenda.',
    option_a: 'preliminary',
    option_b: 'plausible',
    option_c: 'procedural',
    option_d: 'perpetual',
    correct_answer: 'C',
    difficulty_level: 4,
    subject: 'english',
    explanation: '【核心考點】句中提到董事會會議的特點是 "no spontaneous discussion allowed outside the agenda" (不允許議程以外的自發性討論)。這表明會議遵循嚴格的程序和流程。\n【題幹翻譯】這次董事會會議以嚴格程序性的方式進行,不允許議程以外的自發性討論。\n【選項分析】\n(A) preliminary (adj.) 初步的,預備性的\n(B) plausible (adj.) 看似有理的,可信的\n(C) procedural (adj.) 程序上的,按步驟的 (指嚴格遵循既定流程和規則)\n(D) perpetual (adj.) 永久的,不斷的',
    knowledge_tags: ['英文-詞彙題', '形容詞', '高階詞彙', '商業語境']
  },
  {
    question_text: 'The scientist\'s argument was widely criticized for being highly _________, relying too much on personal belief rather than experimental data.',
    option_a: 'empirical',
    option_b: 'tentative',
    option_c: 'theoretical',
    option_d: 'dogmatic',
    correct_answer: 'D',
    difficulty_level: 4,
    subject: 'english',
    explanation: '【核心考點】句中提到科學家的論點被批評的原因是 "relying too much on personal belief rather than experimental data" (過度依賴個人信念而非實驗數據)。這種缺乏客觀證據的、固執己見的論點被稱為教條主義的。\n【題幹翻譯】這位科學家的論點因高度教條主義而受到廣泛批評,它過度依賴個人信念而非實驗數據。\n【選項分析】\n(A) empirical (adj.) 憑經驗的 (指基於實驗或觀察的數據,與句意相反)\n(B) tentative (adj.) 暫定的,試驗性的\n(C) theoretical (adj.) 理論上的\n(D) dogmatic (adj.) 教條主義的,武斷的 (指固執己見,缺乏客觀證據)',
    knowledge_tags: ['英文-詞彙題', '形容詞', '高階詞彙', '學術語境']
  },

  // Difficulty 5 - 10 questions
  {
    question_text: 'Dispensing the exact amount of chemical needed for the reaction proved to be quite challenging.',
    option_a: 'Dispensing',
    option_b: 'Dismantling',
    option_c: 'Detaching',
    option_d: 'Delegating',
    correct_answer: 'A',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中提到 "the exact amount of chemical needed for the reaction" (反應所需化學藥品的精確量),這是在實驗室或化學環境中對物質進行測量、分配或分發的動作。\n【題幹翻譯】精確分發反應所需的化學藥品量,被證明是相當具有挑戰性的。\n【選項分析】\n(A) Dispensing (v.) 分發,分配 (特指精確地給予或配藥,符合化學實驗的語境)\n(B) Dismantling (v.) 拆卸,拆解 (指把機器或結構拆開)\n(C) Detaching (v.) 分離,脫離 (指將一部分從主體上取下)\n(D) Delegating (v.) 委派,授權 (指將職責或權力分配給他人)',
    knowledge_tags: ['英文-詞彙題', '動詞', '高階詞彙', '科學語境']
  },
  {
    question_text: 'The newly implemented tax incentive is designed to encourage small businesses to invest more.',
    option_a: 'incentive',
    option_b: 'obstacle',
    option_c: 'criterion',
    option_d: 'obligation',
    correct_answer: 'A',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中提到新實施的稅務措施的目的是 "to encourage small businesses to invest more" (鼓勵小企業投入更多資金)。能夠起到鼓勵作用的事物是獎勵或誘因。\n【題幹翻譯】這項新實施的稅務獎勵措施旨在鼓勵小型企業進行更多投資。\n【選項分析】\n(A) incentive (n.) 獎勵,誘因 (指鼓勵行動或努力的事物)\n(B) obstacle (n.) 障礙\n(C) criterion (n.) 標準,準則\n(D) obligation (n.) 義務,責任',
    knowledge_tags: ['英文-詞彙題', '名詞', '高階詞彙', '經濟語境']
  },
  {
    question_text: 'Winning the literary prize brought the previously obscure writer widespread fame and recognition.',
    option_a: 'obscure',
    option_b: 'potent',
    option_c: 'arbitrary',
    option_d: 'terminal',
    correct_answer: 'A',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中提到贏得文學獎的結果是帶來 "widespread fame and recognition" (廣泛的名聲和認可),這與該作者以前的狀態形成對比。因此,這個作家以前的狀態應是不知名的或默默無聞的。\n【題幹翻譯】贏得文學獎為這位以前默默無聞的作家帶來了廣泛的名聲和認可。\n【選項分析】\n(A) obscure (adj.) 默默無聞的,不知名的 (指不為人知或難以理解的)\n(B) potent (adj.) 強大的,有力的\n(C) arbitrary (adj.) 任意的,武斷的\n(D) terminal (adj.) 最終的;末期的',
    knowledge_tags: ['英文-詞彙題', '形容詞', '高階詞彙', '文學語境']
  },
  {
    question_text: 'Students are required to abide by the university\'s honor code, even outside the classroom.',
    option_a: 'violate',
    option_b: 'articulate',
    option_c: 'abide by',
    option_d: 'alleviate',
    correct_answer: 'C',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中提到學生被要求對大學的 "honor code" (榮譽守則) 所採取的行為,且這個要求適用於 "even outside the classroom" (即使在課堂之外)。對於守則、規則、法律,人必須遵守。\n【題幹翻譯】學生被要求遵守大學的榮譽守則,即使在課堂之外也是如此。\n【選項分析】\n(A) violate (v.) 違反\n(B) articulate (v.) 清晰地表達\n(C) abide by (v. phr.) 遵守,信守 (固定搭配,後接規則、決定等)\n(D) alleviate (v.) 減輕,緩和',
    knowledge_tags: ['英文-詞彙題', '動詞片語', '高階詞彙']
  },
  {
    question_text: 'What is the implication of the two companies merging—will it lead to job losses?',
    option_a: 'integrity',
    option_b: 'implication',
    option_c: 'intuition',
    option_d: 'infrastructure',
    correct_answer: 'B',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中問題的後半部分 "will it lead to job losses?" (這會導致失業嗎?) 詢問的是兩家公司合併的後果或潛在影響。\n【題幹翻譯】這兩家公司合併的潛在影響是什麼—它會導致失業嗎?\n【選項分析】\n(A) integrity (n.) 誠信,正直\n(B) implication (n.) 潛在影響,暗示 (指某事可能產生的後果或推論)\n(C) intuition (n.) 直覺\n(D) infrastructure (n.) 基礎設施',
    knowledge_tags: ['英文-詞彙題', '名詞', '高階詞彙', '商業語境']
  },
  {
    question_text: 'She became solemn after reading the depressing news report about global warming.',
    option_a: 'eloquent',
    option_b: 'profound',
    option_c: 'vigorous',
    option_d: 'solemn',
    correct_answer: 'D',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中提到新聞報導的內容是 "depressing news report about global warming" (關於全球暖化的令人沮喪的新聞報導)。面對沉重且令人沮喪的消息,人的情緒反應是變得嚴肅或莊重。\n【題幹翻譯】讀完關於全球暖化令人沮喪的新聞報導後,她變得嚴肅起來。\n【選項分析】\n(A) eloquent (adj.) 雄辯的,口才好的\n(B) profound (adj.) 深奧的,深刻的\n(C) vigorous (adj.) 精力充沛的\n(D) solemn (adj.) 嚴肅的,莊重的 (指因重要或嚴峻的事情而表現出的沉著和不苟言笑)',
    knowledge_tags: ['英文-詞彙題', '形容詞', '高階詞彙', '情緒詞彙']
  },
  {
    question_text: 'The new law aims to combat discrimination against minority groups in the workplace.',
    option_a: 'compile',
    option_b: 'combat',
    option_c: 'contend',
    option_d: 'compel',
    correct_answer: 'B',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中提到新法律的目標是針對 "discrimination against minority groups" (對少數族群的歧視) 所採取的行為。法律的目的通常是對抗或打擊社會弊病。\n【題幹翻譯】這項新法律旨在打擊工作場所中對少數族群的歧視。\n【選項分析】\n(A) compile (v.) 彙編,編輯\n(B) combat (v.) 打擊,與...作戰 (指採取行動來阻止或消除)\n(C) contend (v.) 競爭;聲稱\n(D) compel (v.) 強迫',
    knowledge_tags: ['英文-詞彙題', '動詞', '高階詞彙', '法律語境']
  },
  {
    question_text: 'The witness was unable to designate the identity of the person who had stolen her purse.',
    option_a: 'designate',
    option_b: 'devise',
    option_c: 'denounce',
    option_d: 'deduce',
    correct_answer: 'A',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中提到證人無法對竊賊的 "identity" (身份) 進行的行為。在法律或證詞中,證人應能指明或確認身份。\n【題幹翻譯】這位證人無法指明偷走她錢包的人的身份。\n【選項分析】\n(A) designate (v.) 指定,指明 (在此處指明確指出或確認某人的身份)\n(B) devise (v.) 設計,想出 (指構思計畫或裝置)\n(C) denounce (v.) 譴責,告發\n(D) deduce (v.) 推斷,推論 (指從證據中得出結論)',
    knowledge_tags: ['英文-詞彙題', '動詞', '高階詞彙', '法律語境']
  },
  {
    question_text: 'The athlete\'s inherent ability to ignore pain allowed him to finish the marathon despite an injury.',
    option_a: 'inevitable',
    option_b: 'inherent',
    option_c: 'identical',
    option_d: 'implicit',
    correct_answer: 'B',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中形容運動員 "ability to ignore pain" (忽略疼痛的能力),這種能力是讓他能夠完成比賽的內在特質,故應是天生或固有的。\n【題幹翻譯】這位運動員固有的忍受疼痛能力使他得以在受傷的情況下完成馬拉松比賽。\n【選項分析】\n(A) inevitable (adj.) 不可避免的\n(B) inherent (adj.) 固有的,內在的 (指事物天生、本質上就具備的特性)\n(C) identical (adj.) 相同的\n(D) implicit (adj.) 含蓄的,隱含的',
    knowledge_tags: ['英文-詞彙題', '形容詞', '高階詞彙', '運動語境']
  },
  {
    question_text: 'After months of drought, the farmers felt great solace when the heavy rain finally arrived.',
    option_a: 'solitude',
    option_b: 'serenity',
    option_c: 'solace',
    option_d: 'subtlety',
    correct_answer: 'C',
    difficulty_level: 5,
    subject: 'english',
    explanation: '【核心考點】句中提到在 "months of drought" (數月的乾旱) 之後,大雨的到來對農民造成的情緒影響。這應是一種安慰或撫慰的感覺。\n【題幹翻譯】經過數月的乾旱後,當大雨終於來臨時,農民們感受到了巨大的慰藉。\n【選項分析】\n(A) solitude (n.) 孤獨,獨處\n(B) serenity (n.) 寧靜,平靜 (指平和的心境)\n(C) solace (n.) 慰藉,安慰 (指在悲傷或痛苦中得到的安慰)\n(D) subtlety (n.) 微妙,精妙',
    knowledge_tags: ['英文-詞彙題', '名詞', '高階詞彙', '情緒詞彙']
  }
]

async function main() {
  console.log('🚀 Starting insertion of onboarding questions...\n')
  console.log(`📝 Total questions to insert: ${questions.length}\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]
    console.log(`⏳ [${i + 1}/${questions.length}] Inserting difficulty ${question.difficulty_level} question...`)

    const { data, error } = await supabase
      .from('onboarding_questions')
      .insert([question])
      .select()

    if (error) {
      console.error(`   ❌ Error:`, error.message)
      errorCount++
    } else {
      console.log(`   ✅ Inserted successfully (ID: ${data[0].id})`)
      successCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✨ Insertion complete!`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors:  ${errorCount}`)
  console.log('='.repeat(60))

  // Verify the results
  console.log('\n📊 Verifying insertion results...\n')

  const { data: allQuestions, error: fetchError } = await supabase
    .from('onboarding_questions')
    .select('difficulty_level')
    .eq('subject', 'english')
    .eq('is_active', true)

  if (fetchError) {
    console.error('Error fetching questions:', fetchError)
    return
  }

  const countsByDifficulty: Record<number, number> = {}
  for (const q of allQuestions) {
    countsByDifficulty[q.difficulty_level] = (countsByDifficulty[q.difficulty_level] || 0) + 1
  }

  console.log('Questions by difficulty level:')
  for (let i = 1; i <= 5; i++) {
    console.log(`  Level ${i}: ${countsByDifficulty[i] || 0} questions`)
  }
  console.log(`\n📝 Total: ${allQuestions.length} active English questions in database`)
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
