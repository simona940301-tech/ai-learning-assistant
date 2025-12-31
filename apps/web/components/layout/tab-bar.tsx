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
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[#D8C7B3]/30 pb-[env(safe-area-inset-bottom)]"
      style={{
        backgroundColor: 'rgba(247, 242, 236, 0.92)', // System beige/cream
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div className="mx-auto flex h-[49px] sm:h-[50px] w-full items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = pathname?.startsWith(tab.href)
          const Icon = tab.icon

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "group relative flex min-w-[48px] flex-1 flex-col items-center justify-center gap-[3px] pt-1 transition-all duration-200 active:scale-95",
                isActive
                  ? "text-[#8B5E3C]" // System brown - active state
                  : "text-[#B8A693]" // Muted brown - inactive state
              )}
              aria-label={tab.name}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  "h-[26px] w-[26px] transition-transform duration-200",
                  isActive ? "translate-y-[-1px]" : ""
                )}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />
              <span className={cn(
                "text-[10px] font-medium leading-none tracking-tight",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
