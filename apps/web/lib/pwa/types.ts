/**
 * PWA Type Definitions
 * 
 * Comprehensive TypeScript types for Progressive Web App features
 */

// ============================================================================
// Service Worker Types
// ============================================================================

export interface ServiceWorkerConfig {
    scope: string
    updateViaCache: 'all' | 'imports' | 'none'
}

export interface CacheStrategy {
    cacheName: string
    maxEntries?: number
    maxAgeSeconds?: number
}

export interface RuntimeCacheRule {
    urlPattern: RegExp | string
    handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly'
    options?: CacheStrategy
}

// ============================================================================
// Install Prompt Types
// ============================================================================

export interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
    }>
    prompt(): Promise<void>
}

export interface InstallPromptState {
    canInstall: boolean
    isInstalled: boolean
    platform: 'ios' | 'android' | 'desktop' | 'unknown'
    promptEvent: BeforeInstallPromptEvent | null
}

export interface InstallPromptConfig {
    deferredPromptDelay: number // ms to wait before showing prompt
    maxDismissCount: number // max times user can dismiss
    dismissCooldown: number // ms to wait after dismiss
}

// ============================================================================
// Network Status Types
// ============================================================================

export interface NetworkStatus {
    isOnline: boolean
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
    downlink: number // Mbps
    rtt: number // ms
    saveData: boolean
}

export interface OnlineStatusHook {
    isOnline: boolean
    wasOffline: boolean
    networkStatus: NetworkStatus | null
}

// ============================================================================
// Push Notification Types
// ============================================================================

export interface PushNotificationPayload {
    title: string
    body: string
    icon?: string
    badge?: string
    image?: string
    tag?: string
    data?: Record<string, unknown>
    actions?: NotificationAction[]
}

export interface NotificationAction {
    action: string
    title: string
    icon?: string
}

export interface PushSubscriptionState {
    isSupported: boolean
    isSubscribed: boolean
    subscription: PushSubscription | null
    permission: NotificationPermission
}

// ============================================================================
// Cache Management Types
// ============================================================================

export interface CacheInfo {
    name: string
    size: number // bytes
    entries: number
    lastModified: Date
}

export interface StorageEstimate {
    usage: number // bytes
    quota: number // bytes
    usagePercent: number
}

export interface CacheManagerConfig {
    maxCacheSize: number // bytes
    maxCacheAge: number // ms
    criticalCaches: string[] // never auto-delete
}

// ============================================================================
// Sync Manager Types
// ============================================================================

export interface SyncTask {
    id: string
    type: 'api-call' | 'file-upload' | 'data-sync'
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    body?: unknown
    headers?: Record<string, string>
    retryCount: number
    maxRetries: number
    createdAt: Date
    lastAttempt?: Date
}

export interface SyncQueueState {
    pending: SyncTask[]
    failed: SyncTask[]
    completed: SyncTask[]
}

// ============================================================================
// Update Manager Types
// ============================================================================

export interface AppUpdateInfo {
    hasUpdate: boolean
    currentVersion: string
    newVersion: string
    updateType: 'major' | 'minor' | 'patch'
    isCritical: boolean
    changelog?: string
}

export interface UpdatePromptConfig {
    autoUpdateDelay: number // ms to wait before auto-update
    showChangelog: boolean
    allowSkip: boolean
}

// ============================================================================
// PWA Analytics Types
// ============================================================================

export interface PWAAnalyticsEvent {
    event: 'pwa_install' | 'pwa_update' | 'offline_fallback' | 'cache_hit' | 'cache_miss' | 'sync_complete' | 'sync_failed'
    timestamp: Date
    metadata?: Record<string, unknown>
}

// ============================================================================
// Feature Detection Types
// ============================================================================

export interface PWAFeatureSupport {
    serviceWorker: boolean
    pushNotifications: boolean
    backgroundSync: boolean
    periodicBackgroundSync: boolean
    badging: boolean
    fileSystemAccess: boolean
    webShare: boolean
    installPrompt: boolean
}

// ============================================================================
// Global Window Extensions
// ============================================================================

declare global {
    interface Window {
        workbox?: {
            register: () => Promise<ServiceWorkerRegistration>
            messageSW: (message: unknown) => Promise<unknown>
        }
    }

    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent
        appinstalled: Event
    }

    interface Navigator {
        standalone?: boolean // iOS Safari
        connection?: {
            effectiveType: '4g' | '3g' | '2g' | 'slow-2g'
            downlink: number
            rtt: number
            saveData: boolean
        }
    }
}

export { }
