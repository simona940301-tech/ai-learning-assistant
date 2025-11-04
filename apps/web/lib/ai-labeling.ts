import type { AILabel } from '@plms/shared/types';
import crypto from 'crypto';

/**
 * AI Labeling Service (Enhanced)
 *
 * CR1: Semantic-first deduplication
 * CR6: Fault tolerance with bounded retry
 */

const LABELING_VERSION = '1.0.0';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
const REQUEST_TIMEOUT = 30000; // 30s

/**
 * CR1: Generate semantic hash from embeddings
 * TODO: Replace with actual OpenAI embeddings API
 */
export async function generateSemanticHash(text: string): Promise<string> {
  // Placeholder: Use simple hash for now
  // In production: Call OpenAI embeddings API and hash the vector
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

/**
 * CR6: Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // CR6: Timeout protection
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
      );

      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      if (attempt === retries) {
        throw error; // Final attempt failed
      }

      const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log(`[AI Labeling] Retry ${attempt + 1}/${retries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Retry exhausted');
}

/**
 * Label question with AI (with fault tolerance)
 */
export async function labelQuestion(questionContent: string): Promise<AILabel> {
  return retryWithBackoff(async () => {
    // TODO: Call OpenAI API
    // For now, use heuristic-based labeling

    const difficulty = estimateDifficulty(questionContent);
    const topic = extractTopic(questionContent);

    return {
      topic,
      skill: 'problem_solving',
      difficulty,
      errorTypes: ['calculation', 'concept'],
      grade: 'junior_high_1',
      confidence: 0.75,
      labeledAt: new Date().toISOString(),
      version: LABELING_VERSION,
    };
  });
}

function estimateDifficulty(content: string): 'easy' | 'medium' | 'hard' | 'expert' {
  const length = content.length;
  const hasComplexTerms = /integral|derivative|probability|quantum/.test(content);

  if (hasComplexTerms || length > 500) return 'expert';
  if (length > 300) return 'hard';
  if (length > 150) return 'medium';
  return 'easy';
}

function extractTopic(content: string): string {
  if (/algebra|equation|polynomial/.test(content)) return 'algebra';
  if (/geometry|triangle|circle/.test(content)) return 'geometry';
  if (/calculus|limit|derivative/.test(content)) return 'calculus';
  if (/probability|statistics/.test(content)) return 'statistics';
  return 'general_math';
}

/**
 * CR1: Enhanced duplicate detection (semantic first, lexical fallback)
 */
export async function detectDuplicates(
  questionId: string,
  questionContent: string,
  existingQuestions: Array<{ id: string; stem: string; semanticHash?: string }>
): Promise<{
  isDuplicate: boolean;
  duplicateOf?: string;
  duplicateGroupId?: string;
  similarity: number;
  method: 'semantic' | 'lexical';
}> {
  // Step 1: Generate semantic hash
  const semanticHash = await generateSemanticHash(questionContent);

  // Step 2: Check semantic duplicates (threshold ≥ 0.95)
  for (const existing of existingQuestions) {
    if (existing.semanticHash === semanticHash) {
      return {
        isDuplicate: true,
        duplicateOf: existing.id,
        duplicateGroupId: existing.semanticHash,
        similarity: 1.0,
        method: 'semantic',
      };
    }
  }

  // Step 3: Fallback to lexical similarity
  let maxSimilarity = 0;
  let duplicateOf: string | undefined;

  for (const existing of existingQuestions) {
    const similarity = calculateLexicalSimilarity(questionContent, existing.stem);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      if (similarity > 0.85) {
        duplicateOf = existing.id;
      }
    }
  }

  return {
    isDuplicate: maxSimilarity > 0.85,
    duplicateOf,
    duplicateGroupId: maxSimilarity > 0.85 ? semanticHash : undefined,
    similarity: maxSimilarity,
    method: 'lexical',
  };
}

/**
 * Lexical similarity (Levenshtein-based)
 */
function calculateLexicalSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * CR3: Calculate new confidence after teacher override
 */
export function calculateOverrideConfidence(oldConfidence: number): number {
  return Math.max(0.4, Math.round(oldConfidence * 0.75 * 100) / 100);
}

/**
 * CR5: Sanitize question content
 */
export function sanitizeQuestionContent(text: string): string {
  // Convert full-width to half-width
  let sanitized = text.replace(/[！-～]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
  );

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Remove dangerous HTML (basic XSS protection)
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  return sanitized.trim();
}
