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
  { name: 'Profile', href: '/home', icon: User }, // 🎯 Fixed: Point to /home (profile merged into home)
]

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-background/98 backdrop-blur-xl border-t border-border"
      style={{
        backgroundColor: 'hsl(var(--background))', // 🎯 SOTA: Prevent white flash
      }}
    >
      {/* 🎯 SOTA Mobile Fix: Two-Layer Structure */}
      {/* Outer layer: Background extends into safe area */}
      {/* Inner layer: Content respects safe area (pushed up above home indicator) */}
      <div className="pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-14 sm:h-16 w-full items-center justify-around px-4">
          {tabs.map((tab) => {
            const isActive = pathname?.startsWith(tab.href)
            const Icon = tab.icon

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "relative flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 py-1 px-1 transition-all duration-300",
                  isActive
                    ? "text-[#6A4A3C]" // Active Color (Brownish)
                    : "text-muted-foreground hover:text-foreground/80"
                )}
                aria-label={tab.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive ? "scale-110" : "scale-100 opacity-70"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8} // Thicker icon when active
                  aria-hidden="true"
                />
                <span className={cn(
                  "text-[10px] font-medium leading-none transition-all duration-300",
                  isActive ? "font-bold" : "font-medium"
                )}>
                  {tab.name}
                </span>

                {/* 🎯 Minimalist Active Indicator (2px line) */}
                {isActive && (
                  <span className="absolute -bottom-1 h-[3px] w-5 rounded-full bg-[#6A4A3C]" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
