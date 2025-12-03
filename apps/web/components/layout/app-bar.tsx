'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EnergyBar } from '@/components/status/EnergyBar'
import { LevelBar } from '@/components/status/LevelBar'
import { EnergyPill } from '@/components/status/EnergyPill'

interface AppBarProps {
  title: string
  user?: {
    name: string
    avatar?: string
  }
  rightAction?: React.ReactNode
  showEnergy?: boolean
  maxWidthClass?: string
}

export function AppBar({
  title,
  user,
  rightAction,
  showEnergy = true,
  maxWidthClass = 'max-w-lg',
}: AppBarProps) {
  const pathname = usePathname()
  const isProfilePage = pathname === '/profile'
  const isPlayPage = pathname === '/play'

  // 極簡模式：play 頁面專用
  if (isPlayPage) {
    return (
      <header className="sticky top-0 z-40 border-b border-[#E2D4C7] bg-[#F7F2EC]">
        <div className={`mx-auto flex items-center justify-between px-4 ${maxWidthClass}`} style={{ paddingTop: '12px', paddingBottom: '14px' }}>
          {/* 左：等級組（Level Unit）- 給予足夠寬度讓 XP bar 顯示 */}
          <div className="flex-1 min-w-0 max-w-[320px]">
            <LevelBar />
          </div>

          {/* 右：Candy Crush 風格能量膠囊 */}
          <div className="flex items-center flex-shrink-0 justify-end min-w-[200px]">
            <EnergyPill />
          </div>
        </div>
      </header>
    )
  }

  // 一般模式：其他頁面
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className={`mx-auto flex h-14 items-center justify-between px-4 ${maxWidthClass}`}>
        <div className="flex items-center gap-2">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {showEnergy && <EnergyBar />}

          {rightAction ? (
            rightAction
          ) : user ? (
            <Link href={isProfilePage ? '/home' : '/profile'}>
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}
