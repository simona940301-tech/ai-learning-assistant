'use client'

import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'

export function GoldPill() {
    const [coins, setCoins] = useState<number>(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchCoins() {
            try {
                const res = await fetch('/api/profile', { credentials: 'include' })
                if (res.ok) {
                    const data = await res.json()
                    const profile = data?.profile ?? data?.data
                    if (data.success && profile) {
                        setCoins(profile.coins ?? 0)
                    }
                }
            } catch (error) {
                console.error('[GoldPill] Failed to fetch coins:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchCoins()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 animate-pulse">
                <div className="h-4 w-4 rounded-full bg-muted" />
                <div className="h-3 w-8 rounded bg-muted" />
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100">
            <Coins className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">{coins.toLocaleString()}</span>
        </div>
    )
}
