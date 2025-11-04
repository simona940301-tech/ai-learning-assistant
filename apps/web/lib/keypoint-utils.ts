import { supabase, generateEmbedding } from './tutor-utils'

export interface KeypointRecord {
  id: string
  code: string
  name: string
  description?: string
  category: string
  strategy_template?: {
    steps?: string[]
    checks?: string[]
  }
  error_patterns?: Array<{
    pattern: string
    note: string
  }>
  related_points?: string[]
  embedding?: number[]
}

export async function getSubjectByName(subjectName: string) {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('name', subjectName)
    .single()
  
  if (error) {
    console.error('Error getting subject:', error)
    return null
  }
  
  return data
}

export async function getKeypointsForSubject(subjectId: string): Promise<KeypointRecord[]> {
  const { data, error } = await supabase
    .from('keypoints')
    .select('*')
    .eq('subject_id', subjectId)
  
  if (error) {
    console.error('Error getting keypoints:', error)
    return []
  }
  
  return data || []
}

export async function matchKeypointByPrompt(
  prompt: string, 
  keypoints: KeypointRecord[]
): Promise<{ keypoint: KeypointRecord; similarity: number } | null> {
  try {
    // Simple text matching for now
    const promptLower = prompt.toLowerCase()
    
    for (const kp of keypoints) {
      const nameMatch = kp.name.toLowerCase().includes(promptLower) || 
                       promptLower.includes(kp.name.toLowerCase())
      
      if (nameMatch) {
        return { keypoint: kp, similarity: 0.9 }
      }
      
      if (kp.description) {
        const descMatch = kp.description.toLowerCase().includes(promptLower) ||
                         promptLower.includes(kp.description.toLowerCase())
        
        if (descMatch) {
          return { keypoint: kp, similarity: 0.8 }
        }
      }
    }
    
    // If no exact match, return the first keypoint with lower confidence
    if (keypoints.length > 0) {
      return { keypoint: keypoints[0], similarity: 0.5 }
    }
    
    return null
  } catch (error) {
    console.error('Error matching keypoint:', error)
    return null
  }
}

export function pickDistractorKeypoints(
  allKeypoints: KeypointRecord[],
  primaryKeypoint: KeypointRecord,
  count: number = 3
): KeypointRecord[] {
  const distractors: KeypointRecord[] = []
  
  // Find keypoints from the same category
  const sameCategory = allKeypoints.filter(kp => 
    kp.category === primaryKeypoint.category && kp.id !== primaryKeypoint.id
  )
  
  // Find keypoints from different categories
  const differentCategory = allKeypoints.filter(kp => 
    kp.category !== primaryKeypoint.category && kp.id !== primaryKeypoint.id
  )
  
  // Add same category distractors first
  const sameCategoryCount = Math.min(count, sameCategory.length)
  distractors.push(...sameCategory.slice(0, sameCategoryCount))
  
  // Add different category distractors if needed
  const remaining = count - distractors.length
  if (remaining > 0) {
    distractors.push(...differentCategory.slice(0, remaining))
  }
  
  // Shuffle to randomize order
  return shuffleArray(distractors)
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}