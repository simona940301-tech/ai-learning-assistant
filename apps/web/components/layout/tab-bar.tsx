'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Play, MessageCircleQuestion, Backpack, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { name: 'Community', href: '/community', icon: Home },
  { name: 'Play', href: '/play', icon: Play },
  { name: 'Ask', href: '/ask', icon: MessageCircleQuestion },
  { name: 'Backpack', href: '/backpack', icon: Backpack },
  { name: 'Profile', href: '/profile', icon: User },
]

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="flex-shrink-0 border-t border-border bg-background/98 backdrop-blur-xl"
      style={{
        // 🎯 頂尖修復：使用 calc 確保 TabBar 緊貼底部
        // safe-area-inset-bottom 僅在有 Home Indicator 的設備上生效
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* 🎯 內部容器：固定高度，確保在所有設備上一致 */}
      <div className="mx-auto flex h-14 w-full items-center justify-around px-4 sm:h-16 sm:max-w-2xl lg:max-w-3xl">
        {tabs.map((tab) => {
          const isActive = pathname?.startsWith(tab.href)
          const Icon = tab.icon

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 px-3 transition-all duration-150 active:scale-95",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={tab.name}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className="h-5 w-5 sm:h-6 sm:w-6"
                strokeWidth={isActive ? 2 : 1.75}
                aria-hidden="true"
              />
              <span className="text-xs font-medium leading-none sm:text-sm">
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
