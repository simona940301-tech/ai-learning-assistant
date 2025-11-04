'use client';

import { useEffect } from 'react';
import { AppBar } from '@/components/layout/app-bar';
import { MicroMissionCard } from '@/components/micro/MicroMissionCard';
import { setupBeforeUnloadFlush } from '@plms/shared/analytics';

export default function HomePage() {
  // Setup analytics flush on page unload (once per app)
  useEffect(() => {
    setupBeforeUnloadFlush();
  }, []);

  return (
    <>
      <AppBar title="首頁" user={{ name: 'User', avatar: '' }} />

      <main className="mx-auto max-w-lg p-4 space-y-4">
        {/* Micro-Mission Card - Main feature */}
        <MicroMissionCard />

        {/* Other cards can be added here */}
        <div className="text-center text-gray-500 text-sm mt-8">
          每日堅持練習，進步看得見
        </div>
      </main>
    </>
  );
}
