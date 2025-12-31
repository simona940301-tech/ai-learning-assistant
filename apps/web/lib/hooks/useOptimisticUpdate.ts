/**
 * 🚀 SOTA Optimistic UI Hook
 * 
 * 實現「0 延遲」用戶體驗的樂觀更新
 * 
 * 特性：
 * 1. 立即更新 UI（不等待 API）
 * 2. 背景同步到服務器
 * 3. 失敗時自動回滾
 * 4. 支持重試機制
 */

import { useState, useCallback, useRef } from 'react'

interface OptimisticUpdateOptions<T> {
    /**
     * 執行實際的 API 調用
     */
    mutationFn: (optimisticData: T) => Promise<T>

    /**
     * 成功回調
     */
    onSuccess?: (data: T) => void

    /**
     * 失敗回調
     */
    onError?: (error: Error, rollbackData: T) => void

    /**
     * 失敗時是否自動重試
     */
    retry?: boolean

    /**
     * 最大重試次數
     */
    maxRetries?: number

    /**
     * 重試延遲（毫秒）
     */
    retryDelay?: number
}

export function useOptimisticUpdate<T>(
    initialData: T,
    options: OptimisticUpdateOptions<T>
) {
    const {
        mutationFn,
        onSuccess,
        onError,
        retry = true,
        maxRetries = 3,
        retryDelay = 1000,
    } = options

    const [data, setData] = useState<T>(initialData)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const previousDataRef = useRef<T>(initialData)
    const retryCountRef = useRef(0)

    const executeWithRetry = useCallback(
        async (optimisticData: T): Promise<void> => {
            try {
                const result = await mutationFn(optimisticData)

                // 成功：更新為服務器返回的數據
                setData(result)
                setError(null)
                retryCountRef.current = 0
                onSuccess?.(result)
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Unknown error')

                // 判斷是否需要重試
                if (retry && retryCountRef.current < maxRetries) {
                    retryCountRef.current++

                    // 延遲後重試
                    setTimeout(() => {
                        executeWithRetry(optimisticData)
                    }, retryDelay * retryCountRef.current) // 指數退避
                } else {
                    // 重試失敗或不重試：回滾到之前的數據
                    setData(previousDataRef.current)
                    setError(error)
                    onError?.(error, previousDataRef.current)
                }
            } finally {
                setIsLoading(false)
            }
        },
        [mutationFn, onSuccess, onError, retry, maxRetries, retryDelay]
    )

    const mutate = useCallback(
        (optimisticData: T) => {
            // 保存當前數據（用於回滾）
            previousDataRef.current = data

            // 立即更新 UI（樂觀更新）
            setData(optimisticData)
            setIsLoading(true)
            setError(null)

            // 背景執行實際的 API 調用
            executeWithRetry(optimisticData)
        },
        [data, executeWithRetry]
    )

    const reset = useCallback(() => {
        setData(initialData)
        setError(null)
        setIsLoading(false)
        retryCountRef.current = 0
    }, [initialData])

    return {
        data,
        mutate,
        reset,
        isLoading,
        error,
        isRetrying: retryCountRef.current > 0,
        retryCount: retryCountRef.current,
    }
}

/**
 * 簡化版：用於列表項的樂觀更新
 * 
 * @example
 * ```tsx
 * const { items, addItem, removeItem, updateItem } = useOptimisticList(
 *   initialItems,
 *   {
 *     addFn: async (item) => api.createItem(item),
 *     removeFn: async (id) => api.deleteItem(id),
 *     updateFn: async (item) => api.updateItem(item),
 *   }
 * )
 * 
 * // 用戶點擊「刪除」，UI 立即響應
 * <Button onClick={() => removeItem(item.id)}>刪除</Button>
 * ```
 */
export function useOptimisticList<T extends { id: string | number }>(
    initialItems: T[],
    options: {
        addFn?: (item: T) => Promise<T>
        removeFn?: (id: T['id']) => Promise<void>
        updateFn?: (item: T) => Promise<T>
        onError?: (error: Error) => void
    }
) {
    const [items, setItems] = useState<T[]>(initialItems)
    const previousItemsRef = useRef<T[]>(initialItems)

    const addItem = useCallback(
        async (newItem: T) => {
            if (!options.addFn) return

            // 樂觀更新
            previousItemsRef.current = items
            setItems((prev) => [...prev, newItem])

            try {
                const result = await options.addFn(newItem)
                // 更新為服務器返回的數據
                setItems((prev) =>
                    prev.map((item) => (item.id === newItem.id ? result : item))
                )
            } catch (error) {
                // 回滾
                setItems(previousItemsRef.current)
                options.onError?.(error instanceof Error ? error : new Error('Add failed'))
            }
        },
        [items, options]
    )

    const removeItem = useCallback(
        async (id: T['id']) => {
            if (!options.removeFn) return

            // 樂觀更新
            previousItemsRef.current = items
            setItems((prev) => prev.filter((item) => item.id !== id))

            try {
                await options.removeFn(id)
            } catch (error) {
                // 回滾
                setItems(previousItemsRef.current)
                options.onError?.(error instanceof Error ? error : new Error('Remove failed'))
            }
        },
        [items, options]
    )

    const updateItem = useCallback(
        async (updatedItem: T) => {
            if (!options.updateFn) return

            // 樂觀更新
            previousItemsRef.current = items
            setItems((prev) =>
                prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
            )

            try {
                const result = await options.updateFn(updatedItem)
                // 更新為服務器返回的數據
                setItems((prev) =>
                    prev.map((item) => (item.id === updatedItem.id ? result : item))
                )
            } catch (error) {
                // 回滾
                setItems(previousItemsRef.current)
                options.onError?.(error instanceof Error ? error : new Error('Update failed'))
            }
        },
        [items, options]
    )

    return {
        items,
        addItem,
        removeItem,
        updateItem,
        setItems,
    }
}
