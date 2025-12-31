/**
 * 數據庫字段映射工具 (遵循 Contract v2 模式)
 * 
 * 用途：統一處理 snake_case (DB) ↔ camelCase (API) 轉換
 * 模式：參考 contract-v2.ts 中的 normalizeSolveResult 設計
 * 架構：遵循 ARCHITECTURE.md 中 Utils 層規範
 */

/**
 * 標準字段映射規則
 * 基於專案現有數據結構分析得出
 */
const FIELD_MAPPING = {
  // User 相關
  user_id: 'userId',
  pack_id: 'packId',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  
  // Pack 相關
  item_count: 'itemCount',
  has_explanation: 'hasExplanation',
  avg_confidence: 'avgConfidence',
  install_count: 'installCount',
  explanation_rate: 'explanationRate',
  completion_rate: 'completionRate',
  published_at: 'publishedAt',
  expires_at: 'expiresAt',
  qr_alias: 'qrAlias',
  confidence_badge: 'confidenceBadge',
  source_name: 'sourceName',
  source_id: 'sourceId',
  created_by: 'createdBy',
  
  // Pack Installation 相關
  installed_at: 'installedAt',
  list_position: 'listPosition',
  completed_count: 'completedCount',
  last_practiced_at: 'lastPracticedAt',
  
  // Mission 相關
  mission_date: 'missionDate',
  all_completed: 'allCompleted',
  rewards_claimed: 'rewardsClaimed',
  target_skill: 'targetSkill',
  target_topic: 'targetTopic',
  target_grade: 'targetGrade',
  num_questions: 'numQuestions',
  pack_ratio: 'packRatio',
  error_book_ratio: 'errorBookRatio',
  mission_type: 'missionType',
  
  // Question 相關
  question_text: 'questionText',
  option_a: 'optionA',
  option_b: 'optionB',
  option_c: 'optionC',
  option_d: 'optionD',
  correct_answer: 'correctAnswer',
  difficulty_level: 'difficultyLevel',
  total_shown: 'totalShown',
  total_correct: 'totalCorrect',
  correct_rate: 'correctRate',
  knowledge_tags: 'knowledgeTags',
  is_active: 'isActive',
  
  // Battle 相關
  match_id: 'matchId',
  match_type: 'matchType',
  question_id_array: 'questionIdArray',
  is_correct_array: 'isCorrectArray',
  final_scores: 'finalScores',
  server_timestamp: 'serverTimestamp',
  processed_at: 'processedAt',
  
  // Onboarding 相關
  current_step: 'currentStep',
  completion_data: 'completionData',
  question_number: 'questionNumber',
  section_order: 'sectionOrder',
  question_subtitle: 'questionSubtitle',
  response_type: 'responseType',
  min_value: 'minValue',
  max_value: 'maxValue',
  analysis_weight: 'analysisWeight',
  analysis_category: 'analysisCategory',
} as const;

/**
 * 數據庫格式 → API格式 (snake_case → camelCase)
 * 遵循 contract-v2.ts 的 normalizeSolveResult 模式
 */
export function dbToApiFormat<T extends Record<string, any>>(dbRecord: T): any {
  if (!dbRecord || typeof dbRecord !== 'object') {
    return dbRecord;
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(dbRecord)) {
    // 優先使用映射表，如果沒有映射則使用通用 snake_case → camelCase 轉換
    let mappedKey = FIELD_MAPPING[key as keyof typeof FIELD_MAPPING];
    
    if (!mappedKey && key.includes('_')) {
      // 通用 snake_case → camelCase 轉換
      mappedKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    } else if (!mappedKey) {
      mappedKey = key;
    }
    
    // 遞歸處理嵌套對象
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[mappedKey] = dbToApiFormat(value);
    } else if (Array.isArray(value)) {
      result[mappedKey] = value.map(item => 
        typeof item === 'object' ? dbToApiFormat(item) : item
      );
    } else {
      result[mappedKey] = value;
    }
  }
  
  return result;
}

/**
 * API格式 → 數據庫格式 (camelCase → snake_case)
 */
export function apiToDbFormat<T extends Record<string, any>>(apiRecord: T): any {
  if (!apiRecord || typeof apiRecord !== 'object') {
    return apiRecord;
  }

  // 建立反向映射
  const reverseMapping = Object.fromEntries(
    Object.entries(FIELD_MAPPING).map(([snake, camel]) => [camel, snake])
  );

  const result: any = {};
  
  for (const [key, value] of Object.entries(apiRecord)) {
    // 優先使用反向映射，如果沒有映射則使用通用 camelCase → snake_case 轉換
    let mappedKey = reverseMapping[key];
    
    if (!mappedKey && /[A-Z]/.test(key)) {
      // 通用 camelCase → snake_case 轉換
      mappedKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    } else if (!mappedKey) {
      mappedKey = key;
    }
    
    // 遞歸處理嵌套對象
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[mappedKey] = apiToDbFormat(value);
    } else if (Array.isArray(value)) {
      result[mappedKey] = value.map(item => 
        typeof item === 'object' ? apiToDbFormat(item) : item
      );
    } else {
      result[mappedKey] = value;
    }
  }
  
  return result;
}

/**
 * 類型安全的轉換函數 (帶驗證)
 * 遵循專案的錯誤處理模式
 */
export function safeDbToApiTransform<T>(
  dbRecord: any,
  schema?: any
): T | null {
  try {
    const transformed = dbToApiFormat(dbRecord);
    
    // 如果提供了 schema，進行驗證
    if (schema) {
      return schema.parse(transformed) as T;
    }
    
    return transformed as T;
  } catch (error) {
    console.warn('[FieldMapping] Transformation failed:', error);
    return null;
  }
}

/**
 * 批量轉換數組
 */
export function dbArrayToApiFormat<T>(dbArray: any[]): T[] {
  return dbArray.map(item => dbToApiFormat(item) as T);
}

/**
 * 轉換並保持原始數據（用於調試）
 */
export function dbToApiFormatWithMeta<T>(dbRecord: any): { data: T; meta: { originalKeys: string[] } } {
  const originalKeys = Object.keys(dbRecord || {});
  const transformed = dbToApiFormat(dbRecord);
  
  return {
    data: transformed as T,
    meta: { originalKeys }
  };
}