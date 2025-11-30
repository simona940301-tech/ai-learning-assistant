'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'card' | 'text' | 'avatar' | 'list'
}

export function Skeleton({ className, variant = 'text', ...props }: SkeletonProps) {
    // Warm color scheme with shimmer effect
    const baseClasses = 'relative overflow-hidden bg-stone-100 rounded before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent'

    const variantClasses = {
        card: 'h-32 w-full',
        text: 'h-4 w-full',
        avatar: 'h-12 w-12 rounded-full',
        list: 'h-16 w-full',
    }

    return (
        <div
            className={cn(baseClasses, variantClasses[variant], className)}
            {...props}
        />
    )
}

// Preset skeleton layouts for common use cases
export function SkeletonCard() {
    return (
        <div className="space-y-3 p-4 border border-stone-200 rounded-lg bg-white">
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
            <Skeleton variant="text" className="w-full" />
        </div>
    )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 p-3 border border-stone-200 rounded-lg bg-white animate-fade-in"
                    style={{ animationDelay: `${i * 75}ms` }}
                >
                    <Skeleton variant="avatar" />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" className="w-3/4" />
                        <Skeleton variant="text" className="w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function SkeletonProfile() {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: '0ms' }}>
                <Skeleton variant="avatar" className="h-20 w-20" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="w-1/3" />
                    <Skeleton variant="text" className="w-1/2" />
                </div>
            </div>
            <Skeleton variant="card" className="animate-fade-in" style={{ animationDelay: '100ms' }} />
            <Skeleton variant="card" className="animate-fade-in" style={{ animationDelay: '200ms' }} />
        </div>
    )
}
