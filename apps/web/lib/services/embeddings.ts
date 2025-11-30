import { generateEmbedding } from '../tutor-utils'

export async function embedText1536(text: string): Promise<number[]> {
  return generateEmbedding(text)
}

export function embeddingToVectorString(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
