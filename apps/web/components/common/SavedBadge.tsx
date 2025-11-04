'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { useFeatureFlag } from '@/lib/feature-flags';

interface SavedBadgeProps {
  show: boolean;
  duration?: number; // Duration in ms (default: 1200ms)
}

/**
 * "已儲存" badge that appears briefly after saving
 * Requirement: Show for 1.2s, fade out smoothly, non-intrusive
 */
export function SavedBadge({ show, duration = 1200 }: SavedBadgeProps) {
  const [visible, setVisible] = useState(false);
  const isEnabled = useFeatureFlag('HOTFIX_SAVED_BADGE');

  useEffect(() => {
    if (!isEnabled) return;

    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, isEnabled]);

  if (!isEnabled || !visible) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 pointer-events-none"
      style={{
        animation: 'fadeInOut 1.2s ease-in-out',
      }}
      role="status"
      aria-live="polite"
      aria-label={t('badge.saved')}
    >
      <div className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="text-sm font-medium">{t('badge.saved')}</span>
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          15% {
            opacity: 1;
            transform: translateY(0);
          }
          85% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-5px);
          }
        }

        /* Respect reduced motion preferences */
        @media (prefers-reduced-motion: reduce) {
          div[style*='animation'] {
            animation: fadeInOutReduced 1.2s ease-in-out;
          }

          @keyframes fadeInOutReduced {
            0% {
              opacity: 0;
            }
            15% {
              opacity: 1;
            }
            85% {
              opacity: 1;
            }
            100% {
              opacity: 0;
            }
          }
        }
      `}</style>
    </div>
  );
}
