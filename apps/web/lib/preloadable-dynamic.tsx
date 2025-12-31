/**
 * 🚀 SOTA Mobile-First Dynamic Import Utility
 * 
 * PreloadableDynamic - 頂尖的動態導入組件，支持智能預取
 * 
 * 特性：
 * 1. Interaction Prefetching - 在 touchstart/mouseenter 時預加載
 * 2. Viewport Prefetching - 組件進入視口時預加載
 * 3. Idle Prefetching - 瀏覽器空閒時預加載
 * 4. 智能緩存 - 避免重複加載
 */

import dynamic, { DynamicOptions, Loader } from 'next/dynamic'
import { ComponentType, useEffect, useRef, useState } from 'react'

type PrefetchStrategy = 'interaction' | 'viewport' | 'idle' | 'manual'

interface PreloadableOptions<P = any> extends DynamicOptions<P> {
    /**
     * 預取策略
     * - interaction: 在 touchstart/mouseenter 時預加載（推薦用於模態框、下拉菜單）
     * - viewport: 組件進入視口時預加載（推薦用於折疊內容）
     * - idle: 瀏覽器空閒時預加載（推薦用於低優先級組件）
     * - manual: 手動控制預加載
     */
    prefetch?: PrefetchStrategy

    /**
     * 視口預取的閾值（0-1），默認 0.1 表示組件 10% 進入視口時開始預取
     */
    viewportThreshold?: number
}

// 全局預加載緩存，避免重複加載
const preloadCache = new Map<string, Promise<any>>()

/**
 * 創建可預加載的動態組件
 * 
 * @example
 * ```tsx
 * // 交互預取（觸摸/懸停時預加載）
 * const Modal = createPreloadableDynamic(
 *   () => import('./Modal'),
 *   { prefetch: 'interaction' }
 * )
 * 
 * // 使用
 * <Modal.Trigger>
 *   <Button>打開模態框</Button>
 * </Modal.Trigger>
 * <Modal show={isOpen} />
 * ```
 */
export function createPreloadableDynamic<P = any>(
    loader: Loader<P>,
    options: PreloadableOptions<P> = {}
) {
    const {
        prefetch = 'manual',
        viewportThreshold = 0.1,
        ssr = false, // 模態框等組件通常不需要 SSR
        ...dynamicOptions
    } = options

    // 創建動態組件
    const DynamicComponent = dynamic(loader, {
        ssr,
        ...dynamicOptions,
    })

    // 預加載函數
    const preloadFn = () => {
        const cacheKey = loader.toString()

        if (!preloadCache.has(cacheKey)) {
            const promise = (loader as any)()
            preloadCache.set(cacheKey, promise)
            return promise
        }

        return preloadCache.get(cacheKey)!
    }

    // 交互觸發器組件（用於 interaction 策略）
    const Trigger = ({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) => {
        const hasPreloaded = useRef(false)

        const handlePreload = () => {
            if (!hasPreloaded.current && !disabled) {
                hasPreloaded.current = true
                preloadFn()
            }
        }

        return (
            <div
                onMouseEnter={handlePreload}
                onTouchStart={handlePreload}
                style={{ display: 'contents' }} // 不影響佈局
            >
                {children}
            </div>
        )
    }

    // 視口觸發器組件（用於 viewport 策略）
    const ViewportTrigger = ({ children }: { children: React.ReactNode }) => {
        const ref = useRef<HTMLDivElement>(null)
        const hasPreloaded = useRef(false)

        useEffect(() => {
            if (typeof window === 'undefined' || !ref.current) return

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting && !hasPreloaded.current) {
                            hasPreloaded.current = true
                            preloadFn()
                        }
                    })
                },
                { threshold: viewportThreshold }
            )

            observer.observe(ref.current)

            return () => observer.disconnect()
        }, [])

        return (
            <div ref={ref} style={{ display: 'contents' }}>
                {children}
            </div>
        )
    }

    // 空閒預加載
    if (prefetch === 'idle' && typeof window !== 'undefined') {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => preloadFn(), { timeout: 2000 })
        } else {
            // Fallback for Safari
            setTimeout(() => preloadFn(), 1000)
        }
    }

    // 返回增強的組件
    return Object.assign(DynamicComponent, {
        preload: preloadFn,
        Trigger: prefetch === 'interaction' ? Trigger : undefined,
        ViewportTrigger: prefetch === 'viewport' ? ViewportTrigger : undefined,
    })
}

/**
 * 簡化版：快速創建交互預取組件（最常用）
 * 
 * @example
 * ```tsx
 * const Modal = preloadOnInteraction(() => import('./Modal'))
 * 
 * <Modal.Trigger>
 *   <Button>打開</Button>
 * </Modal.Trigger>
 * ```
 */
export function preloadOnInteraction<P = any>(
    loader: Loader<P>,
    options?: Omit<PreloadableOptions<P>, 'prefetch'>
) {
    return createPreloadableDynamic(loader, { ...options, prefetch: 'interaction' })
}

/**
 * 簡化版：快速創建視口預取組件
 */
export function preloadOnViewport<P = any>(
    loader: Loader<P>,
    options?: Omit<PreloadableOptions<P>, 'prefetch'>
) {
    return createPreloadableDynamic(loader, { ...options, prefetch: 'viewport' })
}

/**
 * 簡化版：快速創建空閒預取組件
 */
export function preloadOnIdle<P = any>(
    loader: Loader<P>,
    options?: Omit<PreloadableOptions<P>, 'prefetch'>
) {
    return createPreloadableDynamic(loader, { ...options, prefetch: 'idle' })
}
