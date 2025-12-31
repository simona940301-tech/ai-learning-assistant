'use client'

import { Settings, LogOut, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ToolsSection() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabaseBrowserClient.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }}
      className="space-y-2"
    >
      {/* Settings */}
      <Link href="/profile/settings">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 hover:bg-white transition-colors">
          <div className="p-2 rounded-xl bg-[#FAF6E9]">
            <Settings className="h-5 w-5 text-[#7A6A57]" />
          </div>
          <span className="flex-1 text-sm text-[#4A3728]">設定</span>
          <ChevronRight className="h-4 w-4 text-[#A1968A]" />
        </div>
      </Link>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/80 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <div className="p-2 rounded-xl bg-red-50">
          <LogOut className="h-5 w-5 text-red-500" />
        </div>
        <span className="flex-1 text-left text-sm text-red-600">
          {isLoggingOut ? '登出中...' : '登出'}
        </span>
      </button>
    </motion.div>
  )
}

