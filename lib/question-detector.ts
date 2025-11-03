// ========================================
// Single / Batch 自動偵測邏輯
// ========================================

import type { Question, Mode } from './tutor-types';

export interface DetectionResult {
  mode: Mode
  confidence: number // 0-1
  questionCount: number
  suggestion?: string // Shown when confidence < 0.75
}

/**
 * 偵測輸入文字是單題或批次（增強版）
 * 規則：
 * - 偵測 2 次以上的 (A)(B)(C)(D) 選項模式 → batch
 * - 偵測題號模式（1. 2. 或 1) 2) 或 Q1 Q2）≥2 → batch
 * - 返回信心分數，< 0.75 時顯示 toast 確認
 */
export function detectMode(text: string): Mode {
  const result = detectModeWithConfidence(text)
  return result.mode
}

/**
 * Enhanced detection with confidence score
 */
export function detectModeWithConfidence(text: string): DetectionResult {
  if (!text.trim()) {
    return { mode: 'single', confidence: 1.0, questionCount: 0 }
  }

  // 計算選項組數（每組包含 A/B/C/D）
  const optionPattern = /\([A-D]\)[^\n(]{5,}/g
  const optionMatches = text.match(optionPattern) || []

  // 每 4 個連續選項視為一題
  const estimatedQuestionsFromOptions = Math.floor(optionMatches.length / 3)

  // 計算題號數量
  const numberPattern = /(?:^|\n)\s*(?:\d+[.)]\s*|Q\d+\s*|題\s*\d+)/g
  const numberMatches = text.match(numberPattern) || []

  // 計算行數（多行通常意味著多題）
  const lines = text.split('\n').filter(line => line.trim().length > 20)

  // 決策邏輯
  let mode: Mode = 'single'
  let confidence = 1.0
  let questionCount = 1

  // Strong batch indicators
  if (numberMatches.length >= 3) {
    mode = 'batch'
    confidence = 0.95
    questionCount = numberMatches.length
  } else if (estimatedQuestionsFromOptions >= 3) {
    mode = 'batch'
    confidence = 0.9
    questionCount = estimatedQuestionsFromOptions
  }
  // Weak batch indicators (confidence < 0.75)
  else if (numberMatches.length === 2) {
    mode = 'batch'
    confidence = 0.7
    questionCount = 2
  } else if (estimatedQuestionsFromOptions === 2) {
    mode = 'batch'
    confidence = 0.65
    questionCount = 2
  } else if (lines.length >= 10 && optionMatches.length >= 6) {
    // Many lines + some options = possibly batch
    mode = 'batch'
    confidence = 0.6
    questionCount = Math.max(2, Math.floor(optionMatches.length / 4))
  }
  // Single mode
  else {
    mode = 'single'
    confidence = optionMatches.length >= 3 ? 0.9 : 0.85
    questionCount = 1
  }

  // Generate suggestion for low confidence
  let suggestion: string | undefined
  if (confidence < 0.75 && mode === 'batch') {
    suggestion = `偵測到 ${questionCount} 個問題 — 切換到批次模式？`
  }

  return {
    mode,
    confidence,
    questionCount,
    suggestion,
  }
}

/**
 * 將批次文字拆解成多個題目
 */
export function parseQuestions(text: string): Question[] {
  const questions: Question[] = [];

  // 先以題號分割
  const questionBlocks = text.split(/(?=(?:^|\n)\s*(?:\d+[.)]\s*|Q\d+\s*|題\s*\d+))/).filter(Boolean);

  if (questionBlocks.length <= 1) {
    // 無明確題號，嘗試以選項組分割
    return parseBySinglePattern(text);
  }

  questionBlocks.forEach((block, idx) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const options = extractOptions(trimmed);
    const questionText = trimmed.replace(/\([A-D]\)[^\n(]*/g, '').trim();

    questions.push({
      id: `q-${idx + 1}`,
      text: questionText || trimmed,
      options: options.length >= 2 ? options : undefined,
    });
  });

  return questions.length > 0 ? questions : [{ id: 'q-1', text: text.trim() }];
}

/**
 * 單一模式解析（無題號時）
 */
function parseBySinglePattern(text: string): Question[] {
  // 偵測是否有完整的 (A)(B)(C)(D) 選項組
  const optionPattern = /\([A-D]\)[^\n(]{5,}/g;
  const matches = text.match(optionPattern) || [];

  if (matches.length < 3) {
    // 不足以構成多題，視為單題
    return [{ id: 'q-1', text: text.trim(), options: extractOptions(text) }];
  }

  // 嘗試以每 4 個選項分組
  const questions: Question[] = [];
  let currentText = text;
  let idx = 0;

  while (currentText.includes('(A)') && idx < 10) {
    const start = currentText.indexOf('(A)');
    const nextStart = currentText.indexOf('(A)', start + 1);

    const block = nextStart > 0 ? currentText.substring(0, nextStart) : currentText;
    const options = extractOptions(block);
    const questionText = block.replace(/\([A-D]\)[^\n(]*/g, '').trim();

    questions.push({
      id: `q-${idx + 1}`,
      text: questionText || block.trim(),
      options: options.length >= 2 ? options : undefined,
    });

    currentText = nextStart > 0 ? currentText.substring(nextStart) : '';
    idx++;
  }

  return questions.length > 0 ? questions : [{ id: 'q-1', text: text.trim() }];
}

/**
 * 提取選項 (A)(B)(C)(D)
 */
function extractOptions(text: string): string[] {
  const pattern = /\(([A-D])\)\s*([^\n(]+)/g;
  const options: string[] = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    options.push(`(${match[1]}) ${match[2].trim()}`);
  }

  return options;
}

/**
 * 從單一題目文字建立 Question 物件
 */
export function parseSingleQuestion(text: string): Question {
  const options = extractOptions(text);
  const questionText = text.replace(/\([A-D]\)[^\n(]*/g, '').trim();

  return {
    id: 'q-single',
    text: questionText || text.trim(),
    options: options.length >= 2 ? options : undefined,
  };
}
