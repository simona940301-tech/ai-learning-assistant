'use client'

import { useEffect, useRef, useState } from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'

interface LottieAnimationProps {
    /**
     * Path to the Lottie JSON file (relative to public folder)
     * Example: '/assets/success.json'
     */
    animationPath: string

    /**
     * Whether to loop the animation
     * @default false
     */
    loop?: boolean

    /**
     * Whether to autoplay the animation
     * @default true
     */
    autoplay?: boolean

    /**
     * Additional CSS classes
     */
    className?: string

    /**
     * Callback when animation completes
     */
    onComplete?: () => void

    /**
     * Animation speed multiplier
     * @default 1
     */
    speed?: number
}

export function LottieAnimation({
    animationPath,
    loop = false,
    autoplay = true,
    className = '',
    onComplete,
    speed = 1,
}: LottieAnimationProps) {
    const lottieRef = useRef<LottieRefCurrentProps>(null)
    const [animationData, setAnimationData] = useState<any>(null)

    // Load animation data
    useEffect(() => {
        fetch(animationPath)
            .then(res => res.json())
            .then(data => {
                setAnimationData(data)
            })
            .catch(err => {
                console.error('[LottieAnimation] Failed to load animation:', err)
            })
    }, [animationPath])

    // Set animation speed
    useEffect(() => {
        if (lottieRef.current) {
            lottieRef.current.setSpeed(speed)
        }
    }, [speed])

    if (!animationData) {
        return null
    }

    return (
        <div className={className}>
            <Lottie
                lottieRef={lottieRef}
                animationData={animationData}
                loop={loop}
                autoplay={autoplay}
                onComplete={onComplete}
            />
        </div>
    )
}
