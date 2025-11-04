'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { useFeatureFlag } from '@/lib/feature-flags';
import { track } from '@plms/shared/analytics';
import { Confetti } from '@/components/common/Confetti';

interface MissionData {
  todayMission: {
    id: string;
    status: 'pending' | 'in_progress' | 'completed';
    questionCount: number;
    correctCount: number;
    totalAnswered: number;
    streak: number;
  } | null;
  loading: boolean;
}

/**
 * Micro-Mission Card for Home Page
 * Requirements:
 * - Show "today remaining questions" (from existing API)
 * - Show "estimated 3-4 minutes" (fixed text)
 * - Show "streak days" (from existing API)
 * - Confetti + Streak +1 animation on completion
 */
export function MicroMissionCard() {
  const router = useRouter();
  const isEnabled = useFeatureFlag('HOTFIX_MICRO_CARD');

  const [missionData, setMissionData] = useState<MissionData>({
    todayMission: null,
    loading: true,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStreakPlusOne, setShowStreakPlusOne] = useState(false);
  const [previousStreak, setPreviousStreak] = useState<number | null>(null);

  // Fetch mission data
  useEffect(() => {
    fetchMissionData();
  }, []);

  const fetchMissionData = async () => {
    try {
      const response = await fetch('/api/missions');
      const data = await response.json();

      if (data.success && data.data.today) {
        const mission = data.data.today;
        const streak = data.data.streak || 0;

        // Check if mission just completed (trigger confetti)
        if (mission.status === 'completed') {
          // Check if this is newly completed (compare with previous state)
          if (
            previousStreak !== null &&
            streak > previousStreak &&
            !showConfetti
          ) {
            setShowConfetti(true);
            setShowStreakPlusOne(true);

            track('micro_completed_today', {
              streakBefore: previousStreak,
              streakAfter: streak,
              remainingBefore: mission.questionCount - mission.totalAnswered,
              remainingAfter: 0,
            });

            // Hide streak badge after 2s
            setTimeout(() => setShowStreakPlusOne(false), 2000);
          }
        }

        setMissionData({
          todayMission: {
            id: mission.id,
            status: mission.status,
            questionCount: mission.questionCount,
            correctCount: mission.correctCount,
            totalAnswered: mission.totalAnswered,
            streak,
          },
          loading: false,
        });

        setPreviousStreak(streak);
      } else {
        setMissionData({ todayMission: null, loading: false });
      }
    } catch (error) {
      console.error('[MicroMissionCard] Error fetching mission:', error);
      setMissionData({ todayMission: null, loading: false });
    }
  };

  // Track card view
  useEffect(() => {
    if (!missionData.loading && missionData.todayMission) {
      track('micro_card_viewed', {
        missionId: missionData.todayMission.id,
        status: missionData.todayMission.status,
        streak: missionData.todayMission.streak,
      });
    }
  }, [missionData.loading]);

  const handleStartClick = () => {
    console.log(`[MicroMissionCard] Start clicked at ${new Date().toISOString()}`);

    // Fire-and-forget analytics (non-blocking)
    track('micro_start_click', {
      missionId: missionData.todayMission?.id,
      status: missionData.todayMission?.status,
    });

    router.push('/play');
  };

  // Poll for mission updates when mission is in progress
  useEffect(() => {
    if (!missionData.todayMission || missionData.todayMission.status !== 'in_progress') {
      return;
    }

    console.log('[MicroMissionCard] Mission in progress, setting up polling');

    // Poll every 5 seconds for updates
    const pollInterval = setInterval(() => {
      console.log('[MicroMissionCard] Polling for mission updates');
      fetchMissionData();
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [missionData.todayMission?.status]);

  // Expose refetch method for external triggers (e.g., after completing a question)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__refetchMissionData = fetchMissionData;
      console.log('[MicroMissionCard] Exposed __refetchMissionData to window');
    }
  }, []);

  if (!isEnabled) {
    // Fallback: simple card
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">每日任務</h2>
        <button
          onClick={handleStartClick}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          開始練習
        </button>
      </div>
    );
  }

  if (missionData.loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  const mission = missionData.todayMission;
  const remainingQuestions = mission
    ? mission.questionCount - mission.totalAnswered
    : 0;
  const isCompleted = mission?.status === 'completed';
  const isInProgress = mission?.status === 'in_progress';

  return (
    <>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full opacity-20 -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-100 rounded-full opacity-20 -ml-12 -mb-12"></div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">今日微任務</h2>
            {mission && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('micro.streak')}</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-bold text-lg">
                  {mission.streak}
                </span>
              </div>
            )}
          </div>

          {/* Mission Status */}
          {isCompleted ? (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-semibold">{t('micro.completed')}</span>
              </div>
              <p className="text-sm text-gray-600">
                答對 {mission.correctCount} / {mission.questionCount} 題
              </p>
            </div>
          ) : (
            <div className="mb-4 space-y-2">
              {/* Remaining questions */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-600">
                  {remainingQuestions}
                </span>
                <span className="text-sm text-gray-600">
                  {t('micro.todayLeft')} {t('micro.questions')}
                </span>
              </div>

              {/* Estimated time */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{t('micro.eta')}</span>
              </div>

              {/* Progress bar */}
              {isInProgress && mission && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(mission.totalAnswered / mission.questionCount) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    已完成 {mission.totalAnswered} / {mission.questionCount} 題
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleStartClick}
            disabled={isCompleted}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
              isCompleted
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
            aria-label={isInProgress ? t('micro.continue') : t('micro.start')}
          >
            {isCompleted
              ? '明天再來'
              : isInProgress
              ? t('micro.continue')
              : t('micro.start')}
          </button>
        </div>

        {/* Streak +1 Badge (shown briefly after completion) */}
        {showStreakPlusOne && (
          <div
            className="absolute top-4 right-4 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-bold shadow-lg animate-bounce"
            role="status"
            aria-live="polite"
          >
            {t('micro.streakPlusOne')}
          </div>
        )}
      </div>

      {/* Confetti animation */}
      <Confetti show={showConfetti} duration={2000} />
    </>
  );
}
