'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Mood = 'happy' | 'idle' | 'sleep' | 'eating'

interface CompanionContextType {
    mood: Mood
    setMood: (mood: Mood) => void
    interact: () => void
}

const CompanionContext = createContext<CompanionContextType | undefined>(undefined)

export function CompanionProvider({ children }: { children: React.ReactNode }) {
    const [mood, setMood] = useState<Mood>('idle')
    const [lastInteraction, setLastInteraction] = useState(Date.now())

    // Reset to idle after a while if happy/eating
    useEffect(() => {
        if (mood === 'happy' || mood === 'eating') {
            const timer = setTimeout(() => {
                setMood('idle')
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [mood])

    // Go to sleep if inactive for a long time (mock implementation)
    useEffect(() => {
        const checkActivity = setInterval(() => {
            if (Date.now() - lastInteraction > 60000 * 5) { // 5 mins
                setMood('sleep')
            }
        }, 10000)
        return () => clearInterval(checkActivity)
    }, [lastInteraction])

    const interact = () => {
        setLastInteraction(Date.now())
        if (mood === 'sleep') {
            setMood('idle')
        } else {
            setMood('happy')
        }
    }

    return (
        <CompanionContext.Provider value={{ mood, setMood, interact }}>
            {children}
        </CompanionContext.Provider>
    )
}

export function useCompanion() {
    const context = useContext(CompanionContext)
    if (context === undefined) {
        throw new Error('useCompanion must be used within a CompanionProvider')
    }
    return context
}
