// Tutor Explain API 類型定義

export type Subject = "Chinese" | "English" | "Science" | "Social"
export type Difficulty = "Easy" | "Medium" | "Hard"
export type Level = "Basic" | "Advanced"

// 各科題型
export type ChineseQuestionType =
  | "modern_text_comprehension"      // 現代文理解
  | "classical_text_comprehension"   // 文言文理解
  | "idiom_usage"                    // 成語/慣用語
  | "writing_analysis"               // 文章分析

export type EnglishQuestionType =
  | "vocabulary"                     // 單字題
  | "grammar"                        // 文法題
  | "cloze"                          // 克漏字
  | "text_insertion"                 // 篇章結構
  | "reading_comprehension"          // 閱讀理解
  | "translation"                    // 翻譯

export type ScienceQuestionType =
  | "concept_understanding"          // 概念理解
  | "numerical_calculation"          // 數值計算
  | "chart_interpretation"           // 圖表判讀
  | "experiment_design"              // 實驗設計

export type SocialQuestionType =
  | "historical_material"            // 史料閱讀
  | "chronological_order"            // 時序排列
  | "map_interpretation"             // 地圖判讀
  | "civic_law"                      // 公民法條

export type QuestionType =
  | ChineseQuestionType
  | EnglishQuestionType
  | ScienceQuestionType
  | SocialQuestionType

// 題目分段結果
export interface QuestionSegment {
  index: number
  text: string
  choices?: string[]     // (A)(B)(C)(D) 選項
  hasNumber: boolean     // 是否有題號
}

// 偵測結果
export interface DetectionResult {
  subject: Subject
  type: QuestionType
  intent: string         // 任務意圖描述
  language: "zh" | "en"  // 問題語言
  confidence: number     // 信心分數 0-1
}

// ========================================
// Ask 頁面重構：核心類型定義
// ========================================

export type Mode = 'single' | 'batch';
export type SinglePhase = 'question' | 'concept' | 'explain';
export type BatchPhase = 'list' | 'step-by-step' | 'quick';

export interface Question {
  id: string;
  text: string; // 題幹
  options?: string[]; // ['(A) ...', '(B) ...', '(C) ...', '(D) ...']
  suggestedAnswer?: string; // 'A' | 'B' | 'C' | 'D'
}

export interface ConceptChip {
  id: string;
  label: string; // 例如：「關係子句」
  color?: string;
}

export interface GrammarTableRow {
  category: string; // 類別
  description: string; // 說明
  example: string; // 範例
}

export interface Explanation {
  summary: string; // ✅ 一句話總結考點
  steps: string[]; // 🪜 解題步驟（3-5 點）
  grammarTable: GrammarTableRow[]; // 📘 文法統整表
  encouragement: string; // 微語氣（學長姐風格）
  editableMd?: string; // ✏️ 編輯後的 Markdown（僅統整表）
}

export interface QuickAnswer {
  questionId: string;
  suggestedAnswer?: string;
  oneLiner: string; // 一句話總結
}

// Ask 頁面完整狀態
export interface AskState {
  mode: Mode;
  singlePhase: SinglePhase;
  currentQuestion: Question | null;
  concepts: ConceptChip[];
  explanation: Explanation | null;
  batchPhase: BatchPhase;
  questions: Question[];
  selectedIds: string[];
  currentIndex: number;
  totalQuestions: number;
  quickAnswers: QuickAnswer[];
  isLoading: boolean;
  error: string | null;
}

// 主題色彩常數
export const THEME = {
  bg: '#0E1116',
  card: '#141A20',
  accent: '#6EC1E4',
  text: '#F1F5F9',
  textSecondary: '#A9B7C8',
  border: '#1F2937',
  borderRadius: '14px',
  borderRadiusLg: '16px',
  shadow: '0 4px 16px rgba(110, 193, 228, 0.08)',
} as const;

// Deprecated tutor structures (scheduled for removal after 14-day observation window)
export type {
  TutorExplainResult,
  TutorBackpackItem
} from '@/legacy/types-deprecated'
