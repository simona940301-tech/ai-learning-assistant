'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { useFeatureFlag } from '@/lib/feature-flags';
import { track } from '@plms/shared/analytics';

interface ExplanationCardProps {
  questionId: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  userAnswer?: string;
  explanation: string;
  skill?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  packId?: string;
}

// Difficulty band mapping (1-4 scale)
const DIFFICULTY_TO_BAND: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
};

const MIN_BAND = 1;
const MAX_BAND = 4;

/**
 * Calculate near difficulty band (±1 from current)
 * Clamped to valid range [1, 4]
 */
function calculateNearDifficultyBand(currentDifficulty?: string): { min: number; max: number } | undefined {
  if (!currentDifficulty) return undefined;

  const currentBand = DIFFICULTY_TO_BAND[currentDifficulty];
  if (!currentBand) return undefined;

  // ±1 from current, clamped to valid range
  const minBand = Math.max(MIN_BAND, currentBand - 1);
  const maxBand = Math.min(MAX_BAND, currentBand + 1);

  return { min: minBand, max: maxBand };
}

/**
 * Explanation Card - Batch 1.5 (Simplified to Single CTA)
 *
 * Changes from Batch 1:
 * - Only ONE button: "再練一題"
 * - Removed: "換一題類似的", "再挑一題"
 * - Explicitly passes skillId + difficultyBand to backend
 * - Target: < 2s to next question (P95)
 */
export function ExplanationCard({
  questionId,
  question,
  choices,
  correctAnswer,
  userAnswer,
  explanation,
  skill,
  difficulty,
  packId,
}: ExplanationCardProps) {
  const router = useRouter();
  const isSingleCTA = useFeatureFlag('HOTFIX_BATCH1_5_SINGLE_CTA');
  const isNearDifficultyEnabled = useFeatureFlag('HOTFIX_BATCH1_5_NEAR_DIFFICULTY');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCorrect = userAnswer === correctAnswer;

  // Track explanation card view
  useEffect(() => {
    track('explain_card_viewed', {
      questionId,
      skillId: skill,
      difficulty,
      packId,
      isCorrect,
    });
  }, [questionId]);

  /**
   * Handle "Practice Again" - Same skill, near difficulty (±1)
   *
   * Batch 1.5 Enhancement:
   * - Explicitly passes skillId to maintain skill continuity
   * - Calculates and passes difficultyBand (±1 from current)
   * - Backend sampler uses these parameters for precise matching
   * - Analytics is NON-BLOCKING (fire-and-forget)
   */
  const handlePracticeAgain = async () => {
    if (loading) return; // Prevent double-click

    const startTime = Date.now();
    console.log(`[ExplanationCard] CTA clicked at ${new Date().toISOString()}`);

    // Update UI immediately (non-blocking)
    setLoading(true);
    setError(null);

    // Calculate near difficulty band
    const difficultyBand = isNearDifficultyEnabled
      ? calculateNearDifficultyBand(difficulty)
      : undefined;

    // Fire-and-forget analytics (non-blocking)
    track('cta_practice_again_click', {
      skillId: skill,
      currentDifficulty: difficulty,
      difficultyBand,
      questionId,
    });

    try {
      // Build request payload
      const payload: any = {};

      // Pass skill ID for same-skill continuity
      if (skill) {
        payload.targetSkill = skill;
      }

      // Pass difficulty band for near-difficulty matching
      if (difficultyBand) {
        payload.difficultyBand = difficultyBand;
      }

      console.log(`[ExplanationCard] Fetching mission with payload:`, payload);

      // Start new mission with explicit parameters
      const fetchStartTime = Date.now();
      const response = await fetch('/api/missions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const fetchEndTime = Date.now();
      console.log(`[ExplanationCard] API responded in ${fetchEndTime - fetchStartTime}ms`);

      const data = await response.json();

      // Handle success or idempotent response (409)
      if (data.success || response.status === 409) {
        const totalTime = Date.now() - startTime;
        console.log(`[ExplanationCard] Total time: ${totalTime}ms - Navigating to /play`);

        // Navigate to mission page (2s target)
        router.push('/play');
      } else {
        throw new Error(data.error?.message || 'Failed to start mission');
      }
    } catch (err) {
      console.error('[ExplanationCard] Practice again error:', err);

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      // Graceful fallback: navigate anyway after 1.5s
      console.warn('[ExplanationCard] Error occurred, auto-retry in 1.5s');
      setTimeout(() => {
        router.push('/play');
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Question */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">題目</h3>
        <p className="text-gray-800 leading-relaxed">{question}</p>
      </div>

      {/* Choices */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">選項</h4>
        <div className="space-y-2">
          {choices.map((choice, index) => {
            const choiceLetter = String.fromCharCode(65 + index); // A, B, C, D
            const isUserChoice = userAnswer === choiceLetter;
            const isCorrectChoice = correctAnswer === choiceLetter;

            return (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 ${
                  isCorrectChoice
                    ? 'border-green-500 bg-green-50'
                    : isUserChoice
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="font-medium text-gray-700">{choiceLetter}.</span>
                  <span className="flex-1 text-gray-800">{choice}</span>
                  {isCorrectChoice && (
                    <span className="text-green-600 font-medium" aria-label="正確答案">✓</span>
                  )}
                  {isUserChoice && !isCorrectChoice && (
                    <span className="text-red-600 font-medium" aria-label="您的答案">✗</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Result Badge */}
      <div
        className={`p-4 rounded-lg ${
          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 font-medium">
          {isCorrect ? (
            <>
              <span className="text-2xl" aria-hidden="true">✓</span>
              <span>答對了！</span>
            </>
          ) : (
            <>
              <span className="text-2xl" aria-hidden="true">✗</span>
              <span>答錯了，正確答案是 {correctAnswer}</span>
            </>
          )}
        </div>
      </div>

      {/* Explanation */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-3">詳解</h4>
        <div className="prose prose-sm max-w-none text-gray-700">
          {explanation}
        </div>
      </div>

      {/* Single CTA - Batch 1.5 */}
      {isSingleCTA ? (
        <div className="space-y-3 pt-4 border-t">
          {/* Primary CTA: "再練一題" */}
          <button
            onClick={handlePracticeAgain}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            aria-label={`${t('cta.practiceAgain')}${skill ? ` - ${skill}` : ''}`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true"></div>
                <span>{t('cta.loading')}</span>
              </>
            ) : (
              <>
                <span>{t('cta.practiceAgain')}</span>
                {skill && (
                  <span className="text-xs opacity-80">（{skill}）</span>
                )}
              </>
            )}
          </button>

          {/* Error message (non-blocking, inline) */}
          {error && (
            <div
              className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start justify-between"
              role="alert"
            >
              <div className="flex-1">
                <div className="font-medium">載入下一題時發生錯誤</div>
                <div className="text-xs mt-1">{error}</div>
                <div className="text-xs mt-1 opacity-75">正在自動重試...</div>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-800 hover:text-red-900"
                aria-label="關閉錯誤訊息"
              >
                ✕
              </button>
            </div>
          )}

          {/* Hint for skill continuity */}
          {skill && (
            <p className="text-xs text-gray-500 text-center">
              系統將為您挑選相同技能（{skill}）的題目繼續練習
            </p>
          )}
        </div>
      ) : (
        // Fallback: Simple button (if feature flag disabled)
        <button
          onClick={() => router.push('/play')}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          aria-label="繼續練習"
        >
          繼續練習
        </button>
      )}
    </div>
  );
}
