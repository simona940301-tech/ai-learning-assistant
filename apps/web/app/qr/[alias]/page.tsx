'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QrResultCard } from '@/components/qr/QrResultCard';
import { track } from '@plms/shared/analytics';
import type { QREntryResult } from '@plms/shared/types';

export default function QRPage() {
  const params = useParams();
  const router = useRouter();
  const alias = params?.alias as string;

  const [result, setResult] = useState<QREntryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alias) return;

    // Fetch QR entry data
    const fetchQRData = async () => {
      try {
        const response = await fetch(`/api/qr/${alias}`);
        const data = await response.json();

        if (data.success) {
          setResult(data.data);

          // Track QR page view
          track('qr_page_view', {
            alias,
            resolvedPackId: data.data.pack?.id,
            hasInstalled: data.data.pack?.isInstalled || false,
            found: data.data.found,
            fallbackReason: data.data.fallback?.reason,
          });
        } else {
          setError(data.error?.message || 'Failed to load QR data');
        }
      } catch (err) {
        console.error('[QR Page] Error:', err);
        setError('Network error. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchQRData();
  }, [alias]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">載入失敗</h2>
          <p className="text-gray-600 mb-4">{error || '無法載入 QR 碼資料'}</p>
          <button
            onClick={() => router.push('/store')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            前往商店
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <QrResultCard result={result} alias={alias} />
      </div>
    </div>
  );
}
