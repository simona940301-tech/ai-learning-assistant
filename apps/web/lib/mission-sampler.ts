/**
 * Module 3: Mission Sampler Engine (Enhanced v2)
 *
 * Samples questions for daily missions with:
 * - 70% from installed packs
 * - 30% from error book (spaced repetition)
 * - Deduplication (7-day window)
 * - Skill matching + near difficulty
 * - Fallback tiers for insufficient questions
 * - Auto-補位 when count < 3
 * - Difficulty scoring bands
 * - Blacklist filtering
 */

import { createClient } from '@/lib/supabase/server';

export interface SamplerConfig {
  userId: string;
  numQuestions: number; // 3-5 questions
  packRatio: number; // 0.7 = 70%
  errorBookRatio: number; // 0.3 = 30%
  targetSkill?: string;
  targetDifficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  deduplicationDays?: number; // Default 7 days
  minQuestions?: number; // Minimum questions required (default: 3)
  difficultyScoreBand?: { min: number; max: number }; // Difficulty score range
  subject?: string; // For fallback sampling
}

export interface SampledQuestion {
  id: string;
  packId: string;
  stem: string;
  choices: string[];
  answer: string;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  hasExplanation: boolean;
  skill?: string;
  source: 'pack' | 'error_book';
  fallbackTier?: number; // Which fallback tier was used (0 = primary, 1-4 = fallback)
  difficultyScore?: number; // Numerical difficulty score
}

export interface SamplerResult {
  questions: SampledQuestion[];
  packCount: number;
  errorBookCount: number;
  metadata: {
    requestedPack: number;
    requestedErrorBook: number;
    actualPack: number;
    actualErrorBook: number;
    deduplicatedCount: number;
    fallbackUsed: boolean;
    fallbackTierCounts: Record<number, number>; // Count per fallback tier
    samplingTimeMs: number; // Performance tracking
  };
}

// Difficulty score mapping
const DIFFICULTY_SCORES: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
};

/**
 * Main sampler function (Batch 1.5 Optimized)
 * Uses optimized database function for P95 < 80ms performance
 */
export async function sampleQuestions(config: SamplerConfig): Promise<SamplerResult> {
  const startTime = Date.now();
  const supabase = createClient();
  const minQuestions = config.minQuestions || 3;

  // Check if optimized sampler feature is enabled
  const useOptimizedSampler =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF !== 'false';

  if (useOptimizedSampler) {
    return await sampleQuestionsOptimized(config);
  }

  // Fallback to original implementation
  return await sampleQuestionsLegacy(config);
}

/**
 * Batch 1.5: Optimized sampler using database function
 * Target: P95 < 80ms
 */
async function sampleQuestionsOptimized(config: SamplerConfig): Promise<SamplerResult> {
  const startTime = Date.now();
  const supabase = createClient();

  // Call optimized database function
  const { data, error } = await supabase.rpc('sample_mission_questions_optimized', {
    p_user_id: config.userId,
    p_total_count: config.numQuestions,
    p_error_book_ratio: config.errorBookRatio,
    p_target_skill: config.targetSkill || null,
    p_target_difficulty: config.targetDifficulty || null,
    p_difficulty_band_min: config.difficultyScoreBand?.min || null,
    p_difficulty_band_max: config.difficultyScoreBand?.max || null,
    p_exclude_ids: [], // Deduplication handled in function
  });

  if (error) {
    console.error('[Sampler] Optimized sampling failed:', error);
    // Fallback to legacy implementation
    return await sampleQuestionsLegacy(config);
  }

  const questions = (data || []).map((q: any) => ({
    id: q.question_id,
    packId: q.pack_id,
    stem: q.stem,
    choices: q.choices,
    answer: q.answer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    hasExplanation: q.has_explanation,
    skill: q.skill,
    source: q.source as 'pack' | 'error_book',
    fallbackTier: q.fallback_tier,
    difficultyScore: q.difficulty_score,
  }));

  const packCount = questions.filter((q) => q.source === 'pack').length;
  const errorBookCount = questions.filter((q) => q.source === 'error_book').length;

  // Calculate fallback tier counts
  const fallbackTierCounts: Record<number, number> = {};
  questions.forEach((q) => {
    const tier = q.fallbackTier || 0;
    fallbackTierCounts[tier] = (fallbackTierCounts[tier] || 0) + 1;
  });

  const samplingTimeMs = Date.now() - startTime;

  return {
    questions,
    packCount,
    errorBookCount,
    metadata: {
      requestedPack: Math.ceil(config.numQuestions * config.packRatio),
      requestedErrorBook: Math.floor(config.numQuestions * config.errorBookRatio),
      actualPack: packCount,
      actualErrorBook: errorBookCount,
      deduplicatedCount: 0, // Handled by database function
      fallbackUsed: questions.length < (config.minQuestions || 3),
      fallbackTierCounts,
      samplingTimeMs,
    },
  };
}

/**
 * Legacy sampler implementation (fallback)
 */
async function sampleQuestionsLegacy(config: SamplerConfig): Promise<SamplerResult> {
  const startTime = Date.now();
  const supabase = createClient();
  const minQuestions = config.minQuestions || 3;

  // Calculate counts
  const packCount = Math.ceil(config.numQuestions * config.packRatio);
  const errorBookCount = Math.floor(config.numQuestions * config.errorBookRatio);

  // Get recently shown questions (for deduplication)
  const { data: recentQuestions } = await supabase.rpc('get_recent_questions', {
    p_user_id: config.userId,
    p_days: config.deduplicationDays || 7,
  });

  const excludeIds = (recentQuestions || []).map((q: any) => q.question_id);

  // Sample from error book (30%)
  const errorBookQuestions = await sampleFromErrorBook(
    supabase,
    config.userId,
    errorBookCount,
    excludeIds,
    config.targetSkill,
    config.targetDifficulty,
    config.difficultyScoreBand
  );

  // Update exclude list
  const excludeAfterErrorBook = [
    ...excludeIds,
    ...errorBookQuestions.map((q) => q.id),
  ];

  // Sample from packs (70%) with fallback tiers
  const packQuestions = await sampleFromPacksWithFallback(
    supabase,
    config.userId,
    packCount,
    excludeAfterErrorBook,
    config.targetSkill,
    config.targetDifficulty,
    config.difficultyScoreBand,
    config.subject
  );

  // Combine and shuffle
  let allQuestions = [...errorBookQuestions, ...packQuestions];
  const shuffled = shuffleArray(allQuestions);

  // Auto-補位: If total < minQuestions, use fallback to fill gap
  let fallbackUsed = false;
  const fallbackTierCounts: Record<number, number> = {};

  if (shuffled.length < minQuestions) {
    console.warn(
      `[Sampler] Insufficient questions (${shuffled.length}/${minQuestions}), using fallback補位`
    );
    fallbackUsed = true;

    const needed = minQuestions - shuffled.length;
    const fallbackQuestions = await sampleFallbackQuestions(
      supabase,
      config.userId,
      needed,
      [...excludeAfterErrorBook, ...shuffled.map((q) => q.id)],
      config.subject
    );

    allQuestions = [...shuffled, ...fallbackQuestions];
  }

  // Calculate fallback tier counts
  allQuestions.forEach((q) => {
    const tier = q.fallbackTier || 0;
    fallbackTierCounts[tier] = (fallbackTierCounts[tier] || 0) + 1;
  });

  // Take only requested number
  const finalQuestions = allQuestions.slice(0, config.numQuestions);

  const samplingTimeMs = Date.now() - startTime;

  return {
    questions: finalQuestions,
    packCount: packQuestions.length,
    errorBookCount: errorBookQuestions.length,
    metadata: {
      requestedPack: packCount,
      requestedErrorBook: errorBookCount,
      actualPack: packQuestions.length,
      actualErrorBook: errorBookQuestions.length,
      deduplicatedCount: excludeIds.length,
      fallbackUsed,
      fallbackTierCounts,
      samplingTimeMs,
    },
  };
}

/**
 * Sample questions from error book (spaced repetition)
 */
async function sampleFromErrorBook(
  supabase: any,
  userId: string,
  count: number,
  excludeIds: string[],
  targetSkill?: string,
  targetDifficulty?: string,
  difficultyScoreBand?: { min: number; max: number }
): Promise<SampledQuestion[]> {
  try {
    // Get questions from error book
    // Note: Assumes error_book table exists from Module 1
    let query = supabase
      .from('error_book')
      .select(
        `
        id,
        question_id,
        pack_questions (
          id,
          pack_id,
          stem,
          choices,
          answer,
          explanation,
          difficulty,
          has_explanation
        ),
        packs (
          skill
        )
      `
      )
      .eq('user_id', userId)
      .eq('status', 'active') // Only active errors
      .not('question_id', 'in', `(${excludeIds.join(',') || 'null'})`);

    // Apply filters
    if (targetSkill) {
      query = query.eq('packs.skill', targetSkill);
    }

    // Order by spaced repetition algorithm
    // Priority: older errors that haven't been reviewed recently
    query = query
      .order('last_attempted_at', { ascending: true })
      .limit(count);

    const { data, error } = await query;

    if (error || !data) {
      console.error('[Sampler] Error sampling from error book:', error);
      return [];
    }

    return data
      .filter((item: any) => item.pack_questions && item.packs)
      .map((item: any) => {
        const difficulty = item.pack_questions.difficulty;
        return {
          id: item.pack_questions.id,
          packId: item.pack_questions.pack_id,
          stem: item.pack_questions.stem,
          choices: item.pack_questions.choices,
          answer: item.pack_questions.answer,
          explanation: item.pack_questions.explanation,
          difficulty,
          hasExplanation: item.pack_questions.has_explanation,
          skill: item.packs.skill,
          source: 'error_book' as const,
          fallbackTier: 0, // Primary source
          difficultyScore: DIFFICULTY_SCORES[difficulty] || 2,
        };
      })
      .filter((q: any) => {
        // Apply difficulty score band if specified
        if (difficultyScoreBand && q.difficultyScore) {
          return q.difficultyScore >= difficultyScoreBand.min &&
                 q.difficultyScore <= difficultyScoreBand.max;
        }
        return true;
      });
  } catch (error) {
    console.error('[Sampler] Error book sampling failed:', error);
    return [];
  }
}

/**
 * Sample questions from installed packs (deprecated - use sampleFromPacksWithFallback)
 */
async function sampleFromPacks(
  supabase: any,
  userId: string,
  count: number,
  excludeIds: string[],
  targetSkill?: string,
  targetDifficulty?: string
): Promise<SampledQuestion[]> {
  try {
    // Use database function for better performance
    const { data, error } = await supabase.rpc('sample_pack_questions', {
      p_user_id: userId,
      p_count: count,
      p_difficulty: targetDifficulty || null,
      p_skill: targetSkill || null,
      p_exclude_ids: excludeIds,
    });

    if (error || !data) {
      console.error('[Sampler] Error sampling from packs:', error);
      return [];
    }

    return data.map((q: any) => ({
      id: q.question_id,
      packId: q.pack_id,
      stem: q.stem,
      choices: q.choices,
      answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      hasExplanation: q.has_explanation,
      skill: q.skill,
      source: 'pack' as const,
      fallbackTier: 0,
      difficultyScore: DIFFICULTY_SCORES[q.difficulty] || 2,
    }));
  } catch (error) {
    console.error('[Sampler] Pack sampling failed:', error);
    return [];
  }
}

/**
 * Sample from packs with fallback tiers
 * Tier 0: Installed packs (user_pack_installations)
 * Tier 1: Same subject, high confidence (≥0.75)
 * Tier 2: Same skill
 * Tier 3: System recommended (high engagement)
 */
async function sampleFromPacksWithFallback(
  supabase: any,
  userId: string,
  count: number,
  excludeIds: string[],
  targetSkill?: string,
  targetDifficulty?: string,
  difficultyScoreBand?: { min: number; max: number },
  subject?: string
): Promise<SampledQuestion[]> {
  const questions: SampledQuestion[] = [];
  let remaining = count;

  // Tier 0: Installed packs (primary)
  if (remaining > 0) {
    const tier0 = await sampleFromInstalledPacks(
      supabase,
      userId,
      remaining,
      excludeIds,
      targetSkill,
      targetDifficulty,
      difficultyScoreBand
    );
    questions.push(...tier0.map(q => ({ ...q, fallbackTier: 0 })));
    remaining -= tier0.length;
    excludeIds = [...excludeIds, ...tier0.map(q => q.id)];
  }

  // Tier 1: Same subject, high confidence packs
  if (remaining > 0 && subject) {
    const tier1 = await sampleFromHighConfidencePacks(
      supabase,
      userId,
      remaining,
      excludeIds,
      subject,
      targetSkill,
      targetDifficulty,
      difficultyScoreBand
    );
    questions.push(...tier1.map(q => ({ ...q, fallbackTier: 1 })));
    remaining -= tier1.length;
    excludeIds = [...excludeIds, ...tier1.map(q => q.id)];
  }

  // Tier 2: Same skill (any subject)
  if (remaining > 0 && targetSkill) {
    const tier2 = await sampleFromSameSkill(
      supabase,
      userId,
      remaining,
      excludeIds,
      targetSkill,
      targetDifficulty,
      difficultyScoreBand
    );
    questions.push(...tier2.map(q => ({ ...q, fallbackTier: 2 })));
    remaining -= tier2.length;
    excludeIds = [...excludeIds, ...tier2.map(q => q.id)];
  }

  // Tier 3: System recommended (high engagement packs)
  if (remaining > 0) {
    const tier3 = await sampleFromRecommended(
      supabase,
      userId,
      remaining,
      excludeIds,
      subject,
      difficultyScoreBand
    );
    questions.push(...tier3.map(q => ({ ...q, fallbackTier: 3 })));
  }

  return questions;
}

/**
 * Tier 0: Sample from user's installed packs
 */
async function sampleFromInstalledPacks(
  supabase: any,
  userId: string,
  count: number,
  excludeIds: string[],
  targetSkill?: string,
  targetDifficulty?: string,
  difficultyScoreBand?: { min: number; max: number }
): Promise<SampledQuestion[]> {
  try {
    const { data, error } = await supabase.rpc('sample_pack_questions', {
      p_user_id: userId,
      p_count: count,
      p_difficulty: targetDifficulty || null,
      p_skill: targetSkill || null,
      p_exclude_ids: excludeIds,
    });

    if (error || !data) return [];

    return data
      .map((q: any) => ({
        id: q.question_id,
        packId: q.pack_id,
        stem: q.stem,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        hasExplanation: q.has_explanation,
        skill: q.skill,
        source: 'pack' as const,
        difficultyScore: DIFFICULTY_SCORES[q.difficulty] || 2,
      }))
      .filter((q: any) => {
        if (difficultyScoreBand && q.difficultyScore) {
          return q.difficultyScore >= difficultyScoreBand.min &&
                 q.difficultyScore <= difficultyScoreBand.max;
        }
        return true;
      });
  } catch (error) {
    return [];
  }
}

/**
 * Tier 1: Sample from high confidence packs (same subject)
 */
async function sampleFromHighConfidencePacks(
  supabase: any,
  userId: string,
  count: number,
  excludeIds: string[],
  subject: string,
  targetSkill?: string,
  targetDifficulty?: string,
  difficultyScoreBand?: { min: number; max: number }
): Promise<SampledQuestion[]> {
  try {
    let query = supabase
      .from('pack_questions')
      .select(`
        id,
        pack_id,
        stem,
        choices,
        answer,
        explanation,
        difficulty,
        has_explanation,
        packs!inner (
          subject,
          skill,
          confidence_badge
        )
      `)
      .eq('has_explanation', true)
      .eq('packs.subject', subject)
      .gte('packs.confidence_badge', 0.75)
      .eq('is_blacklisted', false)
      .not('id', 'in', `(${excludeIds.join(',') || 'null'})`)
      .order('random()')
      .limit(count);

    if (targetSkill) query = query.eq('packs.skill', targetSkill);
    if (targetDifficulty) query = query.eq('difficulty', targetDifficulty);

    const { data } = await query;
    if (!data) return [];

    return data
      .map((q: any) => ({
        id: q.id,
        packId: q.pack_id,
        stem: q.stem,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        hasExplanation: q.has_explanation,
        skill: q.packs?.skill,
        source: 'pack' as const,
        difficultyScore: DIFFICULTY_SCORES[q.difficulty] || 2,
      }))
      .filter((q: any) => {
        if (difficultyScoreBand && q.difficultyScore) {
          return q.difficultyScore >= difficultyScoreBand.min &&
                 q.difficultyScore <= difficultyScoreBand.max;
        }
        return true;
      });
  } catch (error) {
    return [];
  }
}

/**
 * Tier 2: Sample from packs with same skill (any subject)
 */
async function sampleFromSameSkill(
  supabase: any,
  userId: string,
  count: number,
  excludeIds: string[],
  targetSkill: string,
  targetDifficulty?: string,
  difficultyScoreBand?: { min: number; max: number }
): Promise<SampledQuestion[]> {
  try {
    let query = supabase
      .from('pack_questions')
      .select(`
        id,
        pack_id,
        stem,
        choices,
        answer,
        explanation,
        difficulty,
        has_explanation,
        packs!inner (skill)
      `)
      .eq('has_explanation', true)
      .eq('packs.skill', targetSkill)
      .eq('is_blacklisted', false)
      .not('id', 'in', `(${excludeIds.join(',') || 'null'})`)
      .order('random()')
      .limit(count);

    if (targetDifficulty) query = query.eq('difficulty', targetDifficulty);

    const { data } = await query;
    if (!data) return [];

    return data
      .map((q: any) => ({
        id: q.id,
        packId: q.pack_id,
        stem: q.stem,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        hasExplanation: q.has_explanation,
        skill: q.packs?.skill,
        source: 'pack' as const,
        difficultyScore: DIFFICULTY_SCORES[q.difficulty] || 2,
      }))
      .filter((q: any) => {
        if (difficultyScoreBand && q.difficultyScore) {
          return q.difficultyScore >= difficultyScoreBand.min &&
                 q.difficultyScore <= difficultyScoreBand.max;
        }
        return true;
      });
  } catch (error) {
    return [];
  }
}

/**
 * Tier 3: Sample from system recommended packs (high engagement)
 */
async function sampleFromRecommended(
  supabase: any,
  userId: string,
  count: number,
  excludeIds: string[],
  subject?: string,
  difficultyScoreBand?: { min: number; max: number }
): Promise<SampledQuestion[]> {
  try {
    let query = supabase
      .from('pack_questions')
      .select(`
        id,
        pack_id,
        stem,
        choices,
        answer,
        explanation,
        difficulty,
        has_explanation,
        packs!inner (
          subject,
          skill,
          confidence_badge
        )
      `)
      .eq('has_explanation', true)
      .eq('is_blacklisted', false)
      .gte('packs.confidence_badge', 0.6)
      .not('id', 'in', `(${excludeIds.join(',') || 'null'})`)
      .order('random()')
      .limit(count);

    if (subject) query = query.eq('packs.subject', subject);

    const { data } = await query;
    if (!data) return [];

    return data
      .map((q: any) => ({
        id: q.id,
        packId: q.pack_id,
        stem: q.stem,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        hasExplanation: q.has_explanation,
        skill: q.packs?.skill,
        source: 'pack' as const,
        difficultyScore: DIFFICULTY_SCORES[q.difficulty] || 2,
      }))
      .filter((q: any) => {
        if (difficultyScoreBand && q.difficultyScore) {
          return q.difficultyScore >= difficultyScoreBand.min &&
                 q.difficultyScore <= difficultyScoreBand.max;
        }
        return true;
      });
  } catch (error) {
    return [];
  }
}

/**
 * Fallback補位: Sample any available questions when primary sources insufficient
 */
async function sampleFallbackQuestions(
  supabase: any,
  userId: string,
  count: number,
  excludeIds: string[],
  subject?: string
): Promise<SampledQuestion[]> {
  try {
    let query = supabase
      .from('pack_questions')
      .select(`
        id,
        pack_id,
        stem,
        choices,
        answer,
        explanation,
        difficulty,
        has_explanation,
        packs!inner (
          subject,
          skill
        )
      `)
      .eq('has_explanation', true)
      .eq('is_blacklisted', false)
      .not('id', 'in', `(${excludeIds.join(',') || 'null'})`)
      .order('random()')
      .limit(count);

    if (subject) query = query.eq('packs.subject', subject);

    const { data } = await query;
    if (!data) return [];

    return data.map((q: any) => ({
      id: q.id,
      packId: q.pack_id,
      stem: q.stem,
      choices: q.choices,
      answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      hasExplanation: q.has_explanation,
      skill: q.packs?.skill,
      source: 'pack' as const,
      fallbackTier: 4, // Emergency fallback
      difficultyScore: DIFFICULTY_SCORES[q.difficulty] || 2,
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Get similar question for Immediate Retry
 * Same skill, near difficulty (±1 level)
 */
export async function getSimilarQuestion(
  userId: string,
  currentQuestionId: string,
  skill: string,
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
): Promise<SampledQuestion | null> {
  const supabase = createClient();

  // Get recently shown questions
  const { data: recentQuestions } = await supabase.rpc('get_recent_questions', {
    p_user_id: userId,
    p_days: 1, // Only today
  });

  const excludeIds = [
    currentQuestionId,
    ...(recentQuestions || []).map((q: any) => q.question_id),
  ];

  // Get near difficulties
  const difficultyLevels = ['easy', 'medium', 'hard', 'expert'];
  const currentIndex = difficultyLevels.indexOf(difficulty);
  const nearDifficulties = [
    difficultyLevels[Math.max(0, currentIndex - 1)],
    difficulty,
    difficultyLevels[Math.min(3, currentIndex + 1)],
  ].filter(Boolean);

  try {
    // Sample from packs with same skill and near difficulty
    const { data, error } = await supabase
      .from('pack_questions')
      .select(
        `
        id,
        pack_id,
        stem,
        choices,
        answer,
        explanation,
        difficulty,
        has_explanation,
        packs (skill)
      `
      )
      .in(
        'pack_id',
        supabase
          .from('user_pack_installations')
          .select('pack_id')
          .eq('user_id', userId)
      )
      .eq('has_explanation', true)
      .not('id', 'in', `(${excludeIds.join(',') || 'null'})`)
      .in('difficulty', nearDifficulties)
      .limit(10); // Get 10 candidates

    if (error || !data || data.length === 0) {
      return null;
    }

    // Filter by skill and pick random one
    const matchingSkill = data.filter((q: any) => q.packs?.skill === skill);

    if (matchingSkill.length === 0) {
      // Fallback: any question with same skill from packs
      return data.length > 0 ? transformQuestion(data[0], 'pack') : null;
    }

    const randomIndex = Math.floor(Math.random() * matchingSkill.length);
    return transformQuestion(matchingSkill[randomIndex], 'pack');
  } catch (error) {
    console.error('[Sampler] Get similar question failed:', error);
    return null;
  }
}

/**
 * Transform database question to SampledQuestion
 */
function transformQuestion(q: any, source: 'pack' | 'error_book'): SampledQuestion {
  return {
    id: q.id,
    packId: q.pack_id,
    stem: q.stem,
    choices: q.choices,
    answer: q.answer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    hasExplanation: q.has_explanation,
    skill: q.packs?.skill,
    source,
  };
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
