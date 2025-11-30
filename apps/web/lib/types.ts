// Core types for Ask and Backpack integration

export type Subject = 'chinese' | 'english' | 'social' | 'science' | 'math'

export type FileType = 'text' | 'pdf' | 'image'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export type SourceMode = 'backpack' | 'backpack_academic'

export type TaskType = 'summary' | 'solve'

export type SolveType =
  | 'english_vocabulary'
  | 'english_grammar'
  | 'english_cloze'
  | 'english_reading'
  | 'math'
  | 'science'

export interface BackpackFile {
  id: string
  user_id: string
  subject: Subject
  type: FileType
  title: string
  content: string | null
  file_url: string | null
  file_size?: number
  created_at: string
  updated_at: string
  // Derived relationship
  derived_from?: string[]
  version_history?: VersionHistoryEntry[]
  // Notebook entry fields
  source_type?: 'summary' | 'qa' | 'manual'
  tags?: string[]
  is_notebook_entry?: boolean
}

export interface VersionHistoryEntry {
  timestamp: string
  description: string
  changes: string
}

export interface AttachedFile {
  id: string
  name: string
  type: FileType
  url?: string
  content?: string
  size?: number
  preview?: string
  pageCount?: number
}

export interface Reference {
  id: string
  type: 'backpack' | 'academic'
  // Backpack source
  filename?: string
  page?: string
  paragraph?: string
  excerpt?: string
  // Academic source
  authors?: string
  year?: string
  title?: string
  doi?: string
  url?: string
}

export interface AskResult {
  id: string
  type: TaskType
  solveType?: SolveType
  content: string
  references: Reference[]
  attachments: AttachedFile[]
  sourceMode: SourceMode
  unverified: string[] // Statements without citations
  created_at: string
  isEditing?: boolean
}

export interface AcademicWhitelist {
  name: string
  domains: string[]
}

export const ACADEMIC_WHITELIST: AcademicWhitelist[] = [
  { name: 'arXiv', domains: ['arxiv.org'] },
  { name: 'ACL Anthology', domains: ['aclanthology.org'] },
  { name: 'IEEE Xplore', domains: ['ieeexplore.ieee.org'] },
  { name: 'ACM Digital Library', domains: ['dl.acm.org'] },
  { name: 'PubMed', domains: ['pubmed.ncbi.nlm.nih.gov'] },
  { name: 'JSTOR', domains: ['jstor.org'] },
]

// Output templates structure
export interface SummaryOutput {
  overview: string // 100-200 chars
  sections: {
    heading: string
    points: string[]
    citations: string[]
  }[]
  examTips: string[]
  flashcards: {
    question: string
    answer: string
  }[]
  references: Reference[]
}

export interface VocabSolveOutput {
  translation: string[]
  optionMeanings: {
    option: string
    meaning: string
    notes?: string
  }[]
  contextClues: string[]
  optionComparison: string[]
  answer: string
  reasoning: string
  confusableWords?: {
    word1: string
    word2: string
    difference: string
  }[]
  references: Reference[]
}

export interface GrammarSolveOutput {
  grammarPoint: string
  sentenceStructure: string
  ruleExplanation: string
  wrongOptionAnalysis: {
    option: string
    reason: string
  }[]
  answer: string
  alternativeForm?: string
  references: Reference[]
}

export interface ClozeSolveOutput {
  overview: string
  passageStructure: string
  blanks: {
    number: number
    type: 'vocabulary' | 'grammar'
    grammarRule?: string
    clues: string[]
    optionComparison: string[]
    answer: string
    reasoning: string
  }[]
  coherenceCheck: string
  references: Reference[]
}

export interface ReadingSolveOutput {
  paragraphStructure: {
    paragraph: number
    role: string
  }[]
  questionType: string // 主旨/細節/推論/指代/語氣/結構
  evidence: string[]
  answer: string
  eliminationReason?: string
  references: Reference[]
}

export interface MathSolveOutput {
  given: string
  goal: string
  method: string
  steps: {
    step: number
    expression: string
    reasoning: string
  }[]
  answer: string
  verification: string
  references: Reference[]
}

export interface ScienceSolveOutput {
  concept: string
  chapter: string
  formulas: {
    formula: string
    assumptions: string[]
  }[]
  steps: {
    step: number
    calculation: string
    units: string
  }[]
  answer: string
  checklist: string[]
  references: Reference[]
}

// ====== TARS+KCE Engine Types ======

export type ExplainMode = 'fast' | 'deep'

export type ExplainKind =
  | 'vocab'
  | 'fill-in-cloze'
  | 'sentence-completion'
  | 'discourse'
  | 'reading'
  | 'translation'
  | 'essay'
  | 'hybrid'

export interface ExplainRequest {
  mode: ExplainMode
  input: {
    text?: string // OCR result or plain text
    imageUrl?: string // when provided, OCR handled upstream
  }
}

export interface ExplainViewModel {
  kind: ExplainKind
  mode: ExplainMode
  difficultyTag?: 'easy' | 'medium' | 'hard'
  answer: string
  briefReason: string // <=25 Chinese chars
  // Deep-only fields
  cnTranslation?: string
  fullExplanation?: string // markdown-ready
  distractorNotes?: Array<{ option: string; note: string }>
  grammarHighlights?: string[] // **核心語法點**
  evidenceBlocks?: string[] // reading: ≤3 sentences
  discourseRole?: string // discourse: 轉承/例證/結論
  mixAnswerExtra?: string // hybrid: non-MC complement
}

// ============================================
// Elite RAG Types
// ============================================

export interface CoreConcept {
  name: string
  explanation: string
  importance: number
  pageRefs: number[]
}

export interface KeyInsight {
  insight: string
  evidence: string
  pageRefs: number[]
}

export interface SuggestedQuestion {
  question: string
  difficulty: number
  topic: string
}

export interface ExamQuestion {
  questionText: string
  questionType: string
  options?: { label: string; text: string; isCorrect: boolean }[]
  correctAnswer: string
  explanation: string
  difficulty: number
  topicTags: string[]
  sourcePages: number[]
  confidenceScore: number
}

export type AnalysisStatus = 'pending' | 'processing' | 'preview_ready' | 'analysis_ready' | 'prediction_ready' | 'failed'

export interface FileAnalysis {
  id: string
  status: AnalysisStatus
  processingTimeMs: number
  // Layer 1
  quickSummary?: string
  detectedSubject?: string
  detectedTopics?: string[]
  // Layer 2
  coreConcepts?: CoreConcept[]
  keyInsights?: KeyInsight[]
  suggestedQuestions?: SuggestedQuestion[]
  structuredNotes?: string
  // Layer 3
  examPredictions?: ExamQuestion[]
  weakPoints?: { concept: string; reason: string; practiceSuggestion: string }[]
  studyRoadmap?: { phase: string; topics: string[]; estimatedHours: number }[]
  errorMessage?: string
}
