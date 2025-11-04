/**
 * Subject Detection Module
 *
 * Provides lightweight heuristics to classify text into subject domains
 * without requiring LLM calls for detection.
 */

export type SubjectKind = 'english' | 'math' | 'chinese' | 'unknown';

/**
 * Detects the subject of a given text using character analysis and keyword hints
 *
 * @param text - The text to analyze
 * @returns The detected subject kind
 */
export function detectSubject(text: string): SubjectKind {
  const raw = text ?? '';
  const lower = raw.toLowerCase();
  const normalized = raw.replace(/\s+/g, ' ').trim();

  if (!normalized) return 'unknown';

  const englishWords = lower.match(/\b[a-z]{2,}\b/g)?.length ?? 0;
  const totalTokens = normalized.split(/\s+/).filter(Boolean).length || 1;
  const englishWordRatio = englishWords / totalTokens;
  const englishCharRatio = (lower.match(/[a-z]/g)?.length ?? 0) / Math.max(normalized.length, 1);
  const hanChars = normalized.match(/[\u4e00-\u9fff]/g)?.length ?? 0;

  const mathSymbols = /[0-9=+\-−*/×÷√^%]/;
  const mathKeywords = /\b(cos|sin|tan|cot|sec|csc|theta|π|phi|sigma|log|ln|lim|integral|derivative|matrix|vector)\b/;
  const hasMathSymbols = mathSymbols.test(normalized);
  const hasMathKeywords = mathKeywords.test(lower);
  const hasMathSignal = hasMathSymbols || hasMathKeywords;

  const hasMixedLanguage = englishWords > 0 && hanChars > 0;

  // Priority 1: English takes precedence when clearly dominant
  if (englishWords > 10 || englishCharRatio > 0.6 || englishWordRatio > 0.6) {
    return 'english';
  }

  // Priority 2: Language questions default to English even if math symbols appear (mixed content)
  if (hasMathSignal && englishWords > 0) {
    return 'english';
  }

  // Priority 3: Pure math signals with little to no English words
  if (hasMathSignal && englishWords <= 3 && !hasMixedLanguage) {
    return 'math';
  }

  // Priority 4: Obvious Chinese dominance
  if (hanChars > englishWords * 2 && hanChars > 5) {
    return 'chinese';
  }

  // Default safe fallback: favor English to avoid math misrouting
  return englishWords > 0 ? 'english' : 'unknown';
}

/**
 * Post-validation guard to ensure subject correctness
 * Prevents English questions from being classified as Math
 */
export function validateSubject(text: string, detectedSubject: SubjectKind): SubjectKind {
  if (detectedSubject === 'math' && !text.match(/[0-9=+\-*/√]|cos|sin|tan/i)) {
    console.log('[subject-guard] Overriding math → english (no math patterns found)');
    return 'english';
  }

  return detectedSubject;
}

/**
 * Maps SubjectKind to Contract v2 Subject format
 *
 * @param kind - The detected subject kind
 * @returns Contract v2 Subject string
 */
export function mapSubjectToContract(kind: SubjectKind): string {
  switch (kind) {
    case 'english':
      return 'English';
    case 'math':
      return 'MathA';
    case 'chinese':
      return 'Chinese';
    case 'unknown':
    default:
      return 'English'; // Safe fallback to avoid math overreach
  }
}

/**
 * Gets the MCQ template type based on subject kind
 *
 * @param kind - The detected subject kind
 * @returns Template identifier
 */
export function getTemplateForSubject(kind: SubjectKind): string {
  switch (kind) {
    case 'english':
      return 'english-mcq';
    case 'math':
      return 'math-mcq';
    case 'chinese':
      return 'chinese-mcq';
    case 'unknown':
    default:
      return 'english-mcq'; // Safe fallback
  }
}
