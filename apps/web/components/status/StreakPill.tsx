'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'

export function StreakPill() {
    const [streak, setStreak] = useState<number>(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStreak() {
            try {
                const res = await fetch('/api/profile', { credentials: 'include' })
                if (res.ok) {
                    const data = await res.json()
                    const profile = data?.profile ?? data?.data
                    if (data.success && profile) {
                        setStreak(profile.streak ?? 0)
                    }
                }
            } catch (error) {
                console.error('[StreakPill] Failed to fetch streak:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStreak()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 animate-pulse">
                <div className="h-4 w-4 rounded-full bg-muted" />
                <div className="h-3 w-6 rounded bg-muted" />
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-100">
            <Zap className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
            <span className="text-xs font-medium text-orange-700">{streak}</span>
        </div>
    )
}
