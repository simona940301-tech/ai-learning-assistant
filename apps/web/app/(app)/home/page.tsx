'use client';

import { useEffect } from 'react';
import { AppBar } from '@/components/layout/app-bar';
import { NextActionCard } from '@/components/home/NextActionCard';
import { StorePromoCard } from '@/components/home/StorePromoCard';
import { VirtualItemBanner } from '@/components/home/VirtualItemBanner';
import { DailySnapshot } from '@/components/home/DailySnapshot';
import { CommunitySnippet } from '@/components/home/CommunitySnippet';
import { setupBeforeUnloadFlush } from '@plms/shared/analytics';

export default function HomePage() {
  // Setup analytics flush on page unload (once per app)
  useEffect(() => {
    setupBeforeUnloadFlush();
  }, []);

  return (
    <>
      <AppBar title="首頁" user={{ name: 'User', avatar: '' }} />

      <main className="mx-auto max-w-lg p-4 space-y-6 pb-24">
        {/* 1. Daily Snapshot (Welcome & Social Proof) */}
        <DailySnapshot />

        {/* 2. Next Action Card (Primary CTA - Loss Aversion) */}
        <NextActionCard />

        {/* 3. Store Promo Card (Monetization - Scarcity) */}
        <StorePromoCard />

        {/* 4. Virtual Item Banner (Retention - Endowment Effect) */}
        <VirtualItemBanner />

        {/* 5. Community Snippet (Social Proof) */}
        <CommunitySnippet />

        <div className="text-center text-xs text-muted-foreground mt-8 pb-4">
          每日堅持練習，進步看得見
        </div>
      </main>
    </>
  );
}
