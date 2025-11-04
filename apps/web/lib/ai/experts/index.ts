type ExpertId =
  | 'english'
  | 'math'
  | 'chinese'
  | 'social'
  | 'science'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'geography'

export interface ExpertProbe {
  subject: ExpertId
  confidence: number
  tags: string[]
  notes: string
}

type ExpertFn = (text: string) => ExpertProbe

const wordCount = (text: string, regex: RegExp) => {
  const matches = text.match(regex)
  return matches ? matches.length : 0
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))

const englishExpert: ExpertFn = (text) => {
  const englishWords = wordCount(text, /\b[a-z]{3,}\b/gi)
  const total = Math.max(1, text.split(/\s+/).length)
  const ratio = englishWords / total
  const confidence = clamp(ratio * 1.2)
  return {
    subject: 'english',
    confidence,
    tags: ratio > 0.6 ? ['reading', 'vocabulary'] : ['grammar', 'cloze'],
    notes: ratio > 0.6 ? '語境選字' : '句法判讀',
  }
}

const mathExpert: ExpertFn = (text) => {
  const matches = wordCount(text, /[=+\-*/√^%∑∫]|\\(?:frac|sqrt|pi)|\b(?:cos|sin|tan|log|ln)\b/gi)
  const confidence = clamp(matches / 5)
  return {
    subject: 'math',
    confidence,
    tags: matches > 2 ? ['algebra', 'functions'] : ['calculation', 'logic'],
    notes: matches > 0 ? '符號判讀' : '一般敘述',
  }
}

const chineseExpert: ExpertFn = (text) => {
  const hanChars = wordCount(text, /[\u4e00-\u9fff]/g)
  const confidence = clamp(hanChars / 40)
  return {
    subject: 'chinese',
    confidence,
    tags: ['閱讀理解', '文言文'],
    notes: hanChars > 40 ? '高漢字密度' : '混合語系',
  }
}

const socialExpert: ExpertFn = (text) => {
  const hits = wordCount(text, /\b(history|dynasty|civil|law|憲法|地理|歷史|公民)\b/gi)
  return {
    subject: 'social',
    confidence: clamp(hits / 4),
    tags: ['歷史素材', '公民素養'],
    notes: hits > 0 ? '社會科關鍵字' : '一般描述',
  }
}

const scienceExpert: ExpertFn = (text) => {
  const hits = wordCount(text, /\b(energy|force|cell|reaction|電路|酸鹼|實驗)\b/gi)
  return {
    subject: 'science',
    confidence: clamp(hits / 4),
    tags: ['實驗設計', '概念理解'],
    notes: hits > 0 ? '科學術語' : '基礎敘述',
  }
}

const physicsExpert: ExpertFn = (text) => {
  const hits = wordCount(text, /\b(velocity|momentum|電流|波長|加速度)\b/gi)
  return {
    subject: 'physics',
    confidence: clamp(hits / 3),
    tags: ['力學', '波動'],
    notes: hits > 0 ? '物理 terminology' : 'general',
  }
}

const chemistryExpert: ExpertFn = (text) => {
  const hits = wordCount(text, /\b(mole|reaction|溶液|氧化|還原)\b/gi)
  return {
    subject: 'chemistry',
    confidence: clamp(hits / 3),
    tags: ['化學反應', '計量'],
    notes: hits > 0 ? '化學術語' : 'general',
  }
}

const biologyExpert: ExpertFn = (text) => {
  const hits = wordCount(text, /\b(cell|mitosis|DNA|演化|生態)\b/gi)
  return {
    subject: 'biology',
    confidence: clamp(hits / 3),
    tags: ['細胞', '生理'],
    notes: hits > 0 ? '生物術語' : 'general',
  }
}

const geographyExpert: ExpertFn = (text) => {
  const hits = wordCount(text, /\b(latitude|longitude|climate|地形|洋流|季風)\b/gi)
  return {
    subject: 'geography',
    confidence: clamp(hits / 3),
    tags: ['地理判讀', '環境變遷'],
    notes: hits > 0 ? '地理術語' : 'general',
  }
}

const EXPERTS: ExpertFn[] = [
  englishExpert,
  mathExpert,
  chineseExpert,
  socialExpert,
  scienceExpert,
  physicsExpert,
  chemistryExpert,
  biologyExpert,
  geographyExpert,
]

export function probeExperts(text: string): ExpertProbe[] {
  return EXPERTS.map((fn) => fn(text)).sort((a, b) => b.confidence - a.confidence)
}
