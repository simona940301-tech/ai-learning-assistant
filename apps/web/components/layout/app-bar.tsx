'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Home, HelpCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LevelBar } from '@/components/status/LevelBar'
import { EnergyPill } from '@/components/status/EnergyPill'
import { usePlay } from '@/lib/play-context'

interface AppBarProps {
  title: string
  user?: {
    name: string
    avatar?: string
  }
  rightAction?: React.ReactNode
  maxWidthClass?: string
  /**
   * 🎯 Phase A: 統一 CTA 設計
   * 'help' | 'settings' | 'custom' | null
   */
  rightCTA?: 'help' | 'settings' | 'custom' | null
}

export function AppBar({
  title,
  user,
  rightAction,
  maxWidthClass = 'max-w-lg',
  rightCTA = null,
}: AppBarProps) {
  const pathname = usePathname()
  const isHomePage = pathname === '/home'
  const isPlayPage = pathname === '/play'

  // ✅ Fix: Always call hooks at the top level
  const { userStatus } = usePlay()

  // 🎯 Phase A: Play 頁面 - 極簡 HUD（Level + Gold + Energy）
  if (isPlayPage) {
    return (
      <header
        className="flex items-center justify-between border-b border-border/30 bg-[#F7F2EC] px-4 pb-2 pt-2 shadow-sm"
        style={{
          paddingTop: 'env(safe-area-inset-top, 8px)',
        }}
      >
        <div className={`mx-auto flex h-14 w-full items-center justify-between gap-3 ${maxWidthClass}`}>
          {/* 左：Level Bar */}
          <div className="flex-1 min-w-0 max-w-[280px]">
            <LevelBar />
          </div>

          {/* 中：Gold Coins - Minimalist Badge */}
          <div className="flex items-center gap-1.5 bg-gradient-to-br from-[#FFF9EB] to-[#F5E6CC] px-3 py-1.5 rounded-full border border-[#E6D0A0]/40 shadow-sm flex-shrink-0">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-sm">
              <span className="text-[9px] font-bold text-white">$</span>
            </div>
            <span className="text-[13px] font-bold text-[#5D3A1A] tabular-nums leading-none">
              {userStatus?.walletBalance?.toLocaleString() || 0}
            </span>
          </div>

          {/* 右：Energy Pill */}
          <div className="flex items-center flex-shrink-0 justify-end">
            <EnergyPill />
          </div>
        </div>
      </header>
    )
  }

  // 🎯 Phase A: 其他頁面 - 左標題 / 中空 / 右單一 CTA
  const renderRightCTA = () => {
    if (rightAction) return rightAction

    if (rightCTA === 'help') {
      return (
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
          <HelpCircle className="h-5 w-5" />
        </Button>
      )
    }

    if (rightCTA === 'settings') {
      return (
        <Link href="/profile/settings">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      )
    }

    // Default: User avatar (if exists)
    if (user) {
      return (
        <Link href="/home">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
        </Link>
      )
    }

    return null
  }

  return (
    <header
      className="flex items-center justify-between border-b border-border/30 bg-[#F7F2EC]/95 px-4 pb-2 pt-2 shadow-sm backdrop-blur-xl"
      style={{
        paddingTop: 'env(safe-area-inset-top, 8px)',
      }}
    >
      <div className={`mx-auto flex h-14 w-full items-center justify-between ${maxWidthClass}`}>
        {/* 左：Home Button + Title */}
        <div className="flex items-center gap-2">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        {/* 右：單一 CTA（簡化設計） */}
        <div className="flex items-center">
          {renderRightCTA()}
        </div>
      </div>
    </header>
  )
}
