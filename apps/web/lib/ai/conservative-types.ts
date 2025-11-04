/**
 * Conservative Mode Type Definitions
 * Structured, slot-by-slot, verifiable answer formats
 */

export type ConservativeQuestionType =
  | 'E1_VOCAB'
  | 'E2_CLOZE'
  | 'E3_FILL_IN_CLOZE'
  | 'E4_READING'
  | 'E5_DISCOURSE'
  | 'E5_TRANSLATION'
  | 'E6_WRITING'

export interface DistractorReject {
  option: string
  reason: string
}

export interface E1VocabAnswer {
  type: 'E1_VOCAB'
  question_text: string
  answer: string
  one_line_reason: string
  distractor_rejects: DistractorReject[]
}

export interface ClozeSlot {
  slot: number
  answer: string
  one_line_reason: string
  distractor_rejects: DistractorReject[]
}

export interface E2ClozeAnswer {
  type: 'E2_CLOZE'
  passage_summary: string
  slots: ClozeSlot[]
}

export interface E3FillInClozeAnswer {
  type: 'E3_FILL_IN_CLOZE'
  passage_summary: string
  slots: ClozeSlot[]
}

export interface ReadingQuestion {
  qid: number
  answer: string
  one_line_reason: string
  evidence_sentence?: string
  distractor_rejects: DistractorReject[]
}

export interface E4ReadingAnswer {
  type: 'E4_READING'
  title: string
  questions: ReadingQuestion[]
}

export interface E5DiscourseAnswer {
  type: 'E5_DISCOURSE'
  passage_summary: string
  slots: ClozeSlot[]
}

export interface E5TranslationAnswer {
  type: 'E5_TRANSLATION'
  original_zh: string
  reference_en: string
  grammar_focus: string
  key_phrase_analysis: string
  native_upgrade?: string
}

export interface MAWSScores {
  content: number
  organization: number
  grammar_structure: number
  vocabulary_fluency: number
}

export interface E6WritingAnswer {
  type: 'E6_WRITING'
  topic_summary: string
  student_sample?: string
  maws_scores: MAWSScores
  qualitative_feedback: string
  high_score_sample_intro?: string
}

export type ConservativeAnswer =
  | E1VocabAnswer
  | E2ClozeAnswer
  | E3FillInClozeAnswer
  | E4ReadingAnswer
  | E5DiscourseAnswer
  | E5TranslationAnswer
  | E6WritingAnswer

export interface ConservativeResult {
  detected_type: ConservativeQuestionType
  answer: ConservativeAnswer
  confidence?: 'high' | 'medium' | 'low'
}
