/**
 * 🚀 SOTA CSS Performance Utilities
 * 
 * CSS 層級的性能優化工具
 * 
 * 特性：
 * 1. content-visibility - 跳過不可見元素的渲染
 * 2. contain - 隔離渲染範圍
 * 3. will-change - 提示瀏覽器優化動畫
 */

/**
 * CSS content-visibility 類名
 * 
 * 用於隱藏的模態框、折疊內容等，讓瀏覽器完全跳過渲染計算
 * 
 * @example
 * ```tsx
 * <div className={cn(contentVisibilityAuto, "modal")}>
 *   {/* 當 modal 不可見時，瀏覽器不會渲染內部內容 *\/}
 * </div>
 * ```
 */
export const contentVisibilityAuto = 'content-visibility-auto'

/**
 * CSS contain 類名
 * 
 * 隔離組件的渲染範圍，防止影響外部佈局
 * 
 * @example
 * ```tsx
 * <div className={cn(containLayout, "complex-component")}>
 *   {/* 內部的佈局變化不會影響外部 *\/}
 * </div>
 * ```
 */
export const containLayout = 'contain-layout'
export const containPaint = 'contain-paint'
export const containStrict = 'contain-strict'

/**
 * 為大型列表項添加性能優化
 */
export const listItemOptimization = 'contain-layout contain-paint'

/**
 * 為模態框添加性能優化
 */
export const modalOptimization = 'content-visibility-auto contain-layout'

/**
 * 生成 CSS 優化樣式表
 * 
 * 在 app/globals.css 中引入這些樣式
 */
export const cssOptimizationStyles = `
/* 🚀 SOTA CSS Performance Optimizations */

/* Content Visibility - 跳過不可見元素的渲染 */
.content-visibility-auto {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* 預估高度，避免滾動條跳動 */
}

/* Contain - 隔離渲染範圍 */
.contain-layout {
  contain: layout;
}

.contain-paint {
  contain: paint;
}

.contain-strict {
  contain: strict;
}

/* 列表項優化 */
.list-item-optimized {
  contain: layout paint;
  content-visibility: auto;
  contain-intrinsic-size: auto 100px;
}

/* 模態框優化 */
.modal-optimized {
  content-visibility: auto;
  contain: layout style paint;
}

/* 圖片解碼優化 */
img[decoding="async"] {
  /* 瀏覽器會在背景線程解碼圖片 */
}

/* GPU 加速動畫 */
.gpu-accelerated {
  will-change: transform;
  transform: translateZ(0);
}

/* 禁用 GPU 加速（動畫結束後） */
.gpu-accelerated-off {
  will-change: auto;
}
`

/**
 * 動態添加/移除 will-change
 * 
 * 只在動畫期間使用 will-change，避免過度使用導致內存問題
 * 
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null)
 * 
 * const handleAnimate = () => {
 *   optimizeAnimation(ref.current, 'transform', () => {
 *     // 執行動畫
 *     ref.current.style.transform = 'translateX(100px)'
 *   })
 * }
 * ```
 */
export function optimizeAnimation(
    element: HTMLElement | null,
    property: string,
    animationFn: () => void
) {
    if (!element) return

    // 動畫前：添加 will-change
    element.style.willChange = property

    // 執行動畫
    animationFn()

    // 動畫後：移除 will-change（避免內存浪費）
    const cleanup = () => {
        element.style.willChange = 'auto'
    }

    // 監聽 transitionend 或使用 setTimeout
    if ('ontransitionend' in element) {
        element.addEventListener('transitionend', cleanup, { once: true })
    } else {
        setTimeout(cleanup, 1000) // Fallback
    }
}

/**
 * React Hook：自動管理 will-change
 * 
 * @example
 * ```tsx
 * const ref = useWillChange<HTMLDivElement>('transform', isAnimating)
 * 
 * return <div ref={ref} className={isAnimating ? 'animate' : ''} />
 * ```
 */
export function useWillChange<T extends HTMLElement>(
    property: string,
    isActive: boolean
) {
    const ref = useRef<T>(null)

    useEffect(() => {
        if (!ref.current) return

        if (isActive) {
            ref.current.style.willChange = property
        } else {
            ref.current.style.willChange = 'auto'
        }
    }, [isActive, property])

    return ref
}

// 為了讓 TypeScript 不報錯
import { useEffect, useRef } from 'react'
