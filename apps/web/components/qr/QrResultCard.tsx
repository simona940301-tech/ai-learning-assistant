'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { useFeatureFlag } from '@/lib/feature-flags';
import { track } from '@plms/shared/analytics';
import type { QREntryResult, PackWithStatus } from '@plms/shared/types';

interface QrResultCardProps {
  result: QREntryResult;
  alias: string;
}

export function QrResultCard({ result, alias }: QrResultCardProps) {
  const router = useRouter();
  const isOneStepEnabled = useFeatureFlag('HOTFIX_QR_ONE_STEP');

  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * One-step flow: Install pack and start mission
   * Requirement: Install → Start → Navigate to first question in 2 clicks (P95)
   */
  const handleInstallAndStart = async (pack: PackWithStatus) => {
    if (!isOneStepEnabled) {
      // Fallback: just navigate to pack detail
      router.push(`/store/${pack.id}`);
      return;
    }

    setInstalling(true);
    setError(null);

    try {
      // Step 1: Install pack
      track('pack_install_click', {
        source: 'qr',
        packId: pack.id,
        alias,
      });

      const installResponse = await fetch('/api/pack/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      });

      const installData = await installResponse.json();

      if (!installData.success) {
        throw new Error(installData.error?.message || 'Installation failed');
      }

      track('pack_install_success', {
        packId: pack.id,
        source: 'qr',
      });

      // Step 2: Start mission automatically
      const missionResponse = await fetch('/api/missions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const missionData = await missionResponse.json();

      // Handle idempotent response (409 or 200 both OK)
      if (missionData.success || missionResponse.status === 409) {
        track('mission_start_auto', {
          source: 'qr',
          packId: pack.id,
        });

        // Navigate to mission page
        router.push('/play'); // Assuming /play is the mission page
      } else {
        throw new Error(missionData.error?.message || 'Failed to start mission');
      }
    } catch (err) {
      console.error('[QR One-Step] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      track('pack_install_failed', {
        packId: pack.id,
        source: 'qr',
        errorCode: errorMessage,
      });

      // Show error toast (using simple alert for now - can be replaced with toast library)
      setTimeout(() => setError(null), 5000);
    } finally {
      setInstalling(false);
    }
  };

  // Case 1: Pack not found or fallback needed
  if (!result.found || result.fallback) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        {result.pack && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{result.pack.title}</h3>
            <p className="text-sm text-gray-600">
              {result.fallback?.reason === 'expired' && '此題包已過期'}
              {result.fallback?.reason === 'archived' && '此題包已下架'}
              {result.fallback?.reason === 'not_found' && 'QR 碼無效'}
            </p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-700 mb-4">{result.fallback?.message}</p>
        </div>

        {result.fallback?.suggestedPacks && result.fallback.suggestedPacks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">推薦題包</h4>
            {result.fallback.suggestedPacks.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onInstallAndStart={handleInstallAndStart}
                installing={installing}
              />
            ))}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => router.push('/store')}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {t('qr.seeRecommendations')}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {t('toast.installFailed')}: {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              關閉
            </button>
          </div>
        )}
      </div>
    );
  }

  // Case 2: Pack found and available
  const pack = result.pack!;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{pack.title}</h1>
            <p className="text-gray-600 mb-4">{pack.description}</p>
          </div>
          <div className="ml-4">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {pack.confidenceBadge === 'high' && '高信心度'}
              {pack.confidenceBadge === 'medium' && '中信心度'}
              {pack.confidenceBadge === 'low' && '低信心度'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <span className="text-gray-500">科目：</span>
            <span className="font-medium text-gray-900">{pack.subject}</span>
          </div>
          <div>
            <span className="text-gray-500">主題：</span>
            <span className="font-medium text-gray-900">{pack.topic}</span>
          </div>
          <div>
            <span className="text-gray-500">技能：</span>
            <span className="font-medium text-gray-900">{pack.skill}</span>
          </div>
          <div>
            <span className="text-gray-500">題數：</span>
            <span className="font-medium text-gray-900">{pack.itemCount} 題</span>
          </div>
        </div>

        {pack.isInstalled ? (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm text-center">
              ✓ 已安裝此題包
            </div>
            <button
              onClick={() => router.push('/play')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              開始練習
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => handleInstallAndStart(pack)}
              disabled={installing}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              aria-label={t('qr.installAndStart')}
            >
              {installing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('qr.installing')}</span>
                </>
              ) : (
                t('qr.installAndStart')
              )}
            </button>

            <button
              onClick={() => router.push('/store')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {t('qr.seeRecommendations')}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start justify-between">
            <div>
              <div className="font-medium">{t('toast.installFailed')}</div>
              <div className="text-xs mt-1">{error}</div>
            </div>
            <button
              onClick={() => handleInstallAndStart(pack)}
              className="ml-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            >
              重試
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simplified pack card for recommendations
 */
function PackCard({
  pack,
  onInstallAndStart,
  installing,
}: {
  pack: PackWithStatus;
  onInstallAndStart: (pack: PackWithStatus) => void;
  installing: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-medium text-gray-900">{pack.title}</h5>
        <span className="text-xs text-gray-500">{pack.itemCount} 題</span>
      </div>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pack.description}</p>
      <button
        onClick={() => onInstallAndStart(pack)}
        disabled={installing || pack.isInstalled}
        className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pack.isInstalled ? '已安裝' : installing ? '安裝中...' : '安裝並開始'}
      </button>
    </div>
  );
}
