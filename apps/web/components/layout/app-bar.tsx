'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AppBarProps {
  title: string
  user?: {
    name: string
    avatar?: string
  }
  rightAction?: React.ReactNode
}

export function AppBar({ title, user, rightAction }: AppBarProps) {
  const pathname = usePathname()
  const isProfilePage = pathname === '/store'

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {rightAction ? (
            rightAction
          ) : user ? (
            <Link href={isProfilePage ? '/home' : '/store'}>
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
