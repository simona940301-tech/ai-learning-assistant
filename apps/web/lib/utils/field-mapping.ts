/**
 * Field Mapping Utilities
 * Handles data transformation between different API formats
 */

export interface FieldMapping {
  source: string
  target: string
  transform?: (value: any) => any
}

export function applyFieldMapping<T = any>(
  data: Record<string, any>,
  mappings: FieldMapping[]
): T {
  const result: Record<string, any> = {}
  
  mappings.forEach(({ source, target, transform }) => {
    const value = data[source]
    if (value !== undefined) {
      result[target] = transform ? transform(value) : value
    }
  })
  
  return result as T
}

export function createFieldMapper(mappings: FieldMapping[]) {
  return <T = any>(data: Record<string, any>): T => {
    return applyFieldMapping<T>(data, mappings)
  }
}

// Common field mappings
export const API_FIELD_MAPPINGS = {
  USER_PROFILE: [
    { source: 'id', target: 'userId' },
    { source: 'user_nickname', target: 'nickname' },
    { source: 'chick_name', target: 'chickName' },
    { source: 'created_at', target: 'createdAt' },
    { source: 'updated_at', target: 'updatedAt' },
  ] as FieldMapping[],
  
  BATTLE_RESULT: [
    { source: 'match_id', target: 'matchId' },
    { source: 'player1_score', target: 'player1Score' },
    { source: 'player2_score', target: 'player2Score' },
    { source: 'created_at', target: 'createdAt' },
  ] as FieldMapping[],
} as const