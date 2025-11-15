/**
 * Embedding utilities for vector search
 * Wraps OpenAI embedding generation with consistent interface
 */

import { generateEmbedding } from '@/lib/tutor-utils'

/**
 * Generate 1536-dimensional embedding using text-embedding-3-large
 * @param text Input text to embed
 * @returns 1536-dimensional vector as number array
 */
export async function embedText1536(text: string): Promise<number[]> {
  return generateEmbedding(text)
}

/**
 * Convert number array to PostgreSQL vector format string
 * @param embedding Number array (1536 dimensions)
 * @returns PostgreSQL vector string format: '[0.1,0.2,...]'
 */
export function embeddingToVectorString(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

