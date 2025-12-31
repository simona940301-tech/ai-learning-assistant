import { toast } from 'sonner' // Using Sonner for modern toast notifications

/**
 * SOTA Mobile Notification Helper
 * 
 * Replaces alert() with mobile-friendly toast notifications.
 * Compatible with existing codebase - drop-in replacement.
 */

export const notify = {
    /**
     * Success notification
     */
    success: (msg: string, duration = 3000) => {
        toast.success(msg, { duration })
    },

    /**
     * Error notification
     */
    error: (msg: string, duration = 4000) => {
        toast.error(msg, { duration })
    },

    /**
     * Info notification
     */
    info: (msg: string, duration = 3000) => {
        toast.info(msg, { duration })
    },

    /**
     * Warning notification
     */
    warning: (msg: string, duration = 3500) => {
        toast.warning(msg, { duration })
    },

    /**
     * Compatibility layer for legacy alert() calls
     * 
     * Usage: Replace `alert(msg)` with `notify.alert(msg)`
     */
    alert: (msg: string) => {
        // Use error variant for alert replacement
        toast.error(msg, {
            duration: 4000,
            // Make it more prominent like alert
            style: {
                fontSize: '16px',
                fontWeight: '500'
            }
        })
    },

    /**
     * Loading notification with promise
     */
    promise: <T,>(
        promise: Promise<T>,
        {
            loading,
            success,
            error,
        }: {
            loading: string
            success: string | ((data: T) => string)
            error: string | ((err: any) => string)
        }
    ) => {
        return toast.promise(promise, {
            loading,
            success,
            error,
        })
    },
}

/**
 * Backward compatibility: export as default for easy migration
 */
export default notify
