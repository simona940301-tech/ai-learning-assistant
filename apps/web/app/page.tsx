'use client'

import { PremiumLoader } from '@/components/ui/premium-loader'
import { useOnboardingRouting } from '@/hooks/useOnboardingRouting'

/**
 * Home Page Component
 * 
 * This component serves as the entry point for the application.
 * It delegates all routing logic to the useOnboardingRouting hook
 * and focuses solely on rendering the loading state.
 */
export default function Home() {
  const { isLoading } = useOnboardingRouting()

  return <PremiumLoader message="正在載入..." className="bg-background" />
}
