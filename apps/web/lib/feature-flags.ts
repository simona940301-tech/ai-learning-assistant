/**
 * Feature flag system for Batch 1 + Batch 1.5 Hotfix
 * Allows safe rollback of UI changes
 */

// Feature flags - can be controlled via environment variables
const FLAGS = {
  // Batch 1
  HOTFIX_BATCH1: process.env.NEXT_PUBLIC_HOTFIX_BATCH1 !== 'false', // Enabled by default
  HOTFIX_QR_ONE_STEP: process.env.NEXT_PUBLIC_HOTFIX_QR_ONE_STEP !== 'false',
  HOTFIX_MICRO_CARD: process.env.NEXT_PUBLIC_HOTFIX_MICRO_CARD !== 'false',
  HOTFIX_SAVED_BADGE: process.env.NEXT_PUBLIC_HOTFIX_SAVED_BADGE !== 'false',
  HOTFIX_CTA_TEXT: process.env.NEXT_PUBLIC_HOTFIX_CTA_TEXT !== 'false',
  // Batch 1.5
  HOTFIX_BATCH1_5: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5 !== 'false',
  HOTFIX_BATCH1_5_SINGLE_CTA: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA !== 'false',
  HOTFIX_BATCH1_5_NEAR_DIFFICULTY:
    process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY !== 'false',
  HOTFIX_BATCH1_5_BATCH_API: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API !== 'false',
  HOTFIX_BATCH1_5_SAMPLER_PERF: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF !== 'false',
} as const;

type FeatureFlag = keyof typeof FLAGS;

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FLAGS[flag] === true;
}

/**
 * Check if entire Batch 1 hotfix is enabled
 */
export function isBatch1Enabled(): boolean {
  return FLAGS.HOTFIX_BATCH1;
}

/**
 * Check if entire Batch 1.5 hotfix is enabled
 */
export function isBatch15Enabled(): boolean {
  return FLAGS.HOTFIX_BATCH1_5;
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return isFeatureEnabled(flag);
}

export { FLAGS };
