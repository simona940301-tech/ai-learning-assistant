'use client'

import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState'
import { CommunityEmptyState } from '@/components/community/CommunityEmptyState'

/**
 * Empty State Manager Component
 *
 * Centralized management of empty states across the application.
 * Provides a clean, modular architecture that prevents side effects
 * in main page components.
 *
 * Architecture Benefits:
 * - Single source of truth for empty state logic
 * - Easy to extend with new empty states
 * - Clean separation of concerns
 * - Consistent empty state behavior
 */

export type EmptyStateType = 'profile' | 'community'

interface EmptyStateManagerProps {
  type: EmptyStateType
  condition: boolean
  children: React.ReactNode
  userName?: string
}

/**
 * Empty State Manager
 *
 * Conditionally renders empty states based on type and condition.
 * When condition is true, shows the appropriate empty state.
 * When condition is false, renders the children (normal content).
 */
export function EmptyStateManager({
  type,
  condition,
  children,
  userName
}: EmptyStateManagerProps) {
  // If condition is false (has content), render normal children
  if (!condition) {
    return <>{children}</>
  }

  // If condition is true (empty), render appropriate empty state
  switch (type) {
    case 'profile':
      return <ProfileEmptyState userName={userName} />

    case 'community':
      return <CommunityEmptyState />

    default:
      // Fallback for unknown types
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground">內容即將推出</p>
          </div>
        </div>
      )
  }
}

/**
 * Hook for determining empty state conditions
 *
 * Centralizes the logic for when to show empty states.
 * Makes it easy to modify conditions without touching page components.
 */
export function useEmptyStateConditions() {
  return {
    /**
     * Profile empty state condition
     * Shows when user has no meaningful profile data
     */
    isProfileEmpty: (user: any) => {
      // Consider profile empty if user has minimal activity
      // This could be extended with more sophisticated logic
      return !user ||
             (user.xp === 0 &&
              user.coins === 0 &&
              user.streak === 0 &&
              user.posts === 0 &&
              user.materials === 0)
    },

    /**
     * Community empty state condition
     * Shows when there are no posts in the community
     */
    isCommunityEmpty: (posts: any[]) => {
      return !posts || posts.length === 0
    }
  }
}


















