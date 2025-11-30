/**
 * PWA Configuration
 * 
 * Centralized configuration for all PWA features
 */

import type { RuntimeCacheRule, CacheManagerConfig, InstallPromptConfig, UpdatePromptConfig } from './types'

// ============================================================================
// Version Management
// ============================================================================

export const PWA_VERSION = '1.0.0'
export const CACHE_VERSION = 'v1'

// ============================================================================
// Cache Names
// ============================================================================

export const CACHE_NAMES = {
    STATIC: `plms-static-${CACHE_VERSION}`,
    IMAGES: `plms-images-${CACHE_VERSION}`,
    API: `plms-api-${CACHE_VERSION}`,
    PAGES: `plms-pages-${CACHE_VERSION}`,
    FONTS: `plms-fonts-${CACHE_VERSION}`,
} as const

// ============================================================================
// Precache Assets
// ============================================================================

export const PRECACHE_ASSETS = [
    '/',
    '/offline',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/apple-touch-icon.png',
] as const

// ============================================================================
// Runtime Caching Rules
// ============================================================================

export const RUNTIME_CACHE_RULES: RuntimeCacheRule[] = [
    // Static Assets - Cache First
    {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
        handler: 'CacheFirst',
        options: {
            cacheName: CACHE_NAMES.IMAGES,
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
    },

    // Fonts - Cache First
    {
        urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
        handler: 'CacheFirst',
        options: {
            cacheName: CACHE_NAMES.FONTS,
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
    },

    // API Calls - Network First with Cache Fallback
    {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
        handler: 'NetworkFirst',
        options: {
            cacheName: CACHE_NAMES.API,
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 minutes
        },
    },

    // Supabase Storage - Cache First
    {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
        handler: 'CacheFirst',
        options: {
            cacheName: CACHE_NAMES.IMAGES,
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
    },

    // Google Fonts - Cache First
    {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
            cacheName: CACHE_NAMES.FONTS,
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
    },

    // Google Fonts CSS - Stale While Revalidate
    {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
            cacheName: CACHE_NAMES.FONTS,
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
    },

    // HTML Pages - Network First
    {
        urlPattern: /^https?:\/\/.*\/(home|play|ask|backpack|profile|community|store).*/i,
        handler: 'NetworkFirst',
        options: {
            cacheName: CACHE_NAMES.PAGES,
            maxEntries: 30,
            maxAgeSeconds: 60 * 60, // 1 hour
        },
    },

    // Static JS/CSS - Stale While Revalidate
    {
        urlPattern: /\.(?:js|css)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
            cacheName: CACHE_NAMES.STATIC,
            maxEntries: 60,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
    },
]

// ============================================================================
// Cache Manager Configuration
// ============================================================================

export const CACHE_MANAGER_CONFIG: CacheManagerConfig = {
    maxCacheSize: 100 * 1024 * 1024, // 100 MB
    maxCacheAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    criticalCaches: [CACHE_NAMES.STATIC, CACHE_NAMES.PAGES],
}

// ============================================================================
// Install Prompt Configuration
// ============================================================================

export const INSTALL_PROMPT_CONFIG: InstallPromptConfig = {
    deferredPromptDelay: 3000, // 3 seconds after page load
    maxDismissCount: 3, // Show prompt max 3 times
    dismissCooldown: 7 * 24 * 60 * 60 * 1000, // 7 days
}

// ============================================================================
// Update Prompt Configuration
// ============================================================================

export const UPDATE_PROMPT_CONFIG: UpdatePromptConfig = {
    autoUpdateDelay: 5000, // 5 seconds
    showChangelog: true,
    allowSkip: true,
}

// ============================================================================
// Offline Configuration
// ============================================================================

export const OFFLINE_CONFIG = {
    fallbackPage: '/offline',
    offlineBannerDelay: 1000, // 1 second
    reconnectCheckInterval: 5000, // 5 seconds
}

// ============================================================================
// Sync Configuration
// ============================================================================

export const SYNC_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    retryMultiplier: 2, // Exponential backoff
    syncInterval: 30000, // 30 seconds
}

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURE_FLAGS = {
    enablePushNotifications: true,
    enableBackgroundSync: true,
    enablePeriodicSync: false, // Not widely supported yet
    enableBadging: true,
    enableWebShare: true,
    enableInstallPrompt: true,
    enableOfflineMode: true,
    enableCacheAnalytics: true,
} as const

// ============================================================================
// Development Configuration
// ============================================================================

export const DEV_CONFIG = {
    disableInDev: process.env.NODE_ENV === 'development',
    enableDebugLogs: process.env.NODE_ENV === 'development',
    skipWaiting: true,
    clientsClaim: true,
}

// ============================================================================
// URLs Configuration
// ============================================================================

export const PWA_URLS = {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://plms-learning.vercel.app',
    manifestUrl: '/manifest.json',
    offlineUrl: '/offline',
    swUrl: '/sw.js',
} as const

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
    INSTALL_PROMPT_DISMISSED: 'pwa:install-dismissed',
    INSTALL_PROMPT_COUNT: 'pwa:install-count',
    LAST_UPDATE_CHECK: 'pwa:last-update-check',
    SYNC_QUEUE: 'pwa:sync-queue',
    OFFLINE_QUEUE: 'pwa:offline-queue',
    USER_PREFERENCES: 'pwa:preferences',
} as const

// ============================================================================
// Analytics Events
// ============================================================================

export const ANALYTICS_EVENTS = {
    PWA_INSTALLED: 'pwa_installed',
    PWA_UPDATED: 'pwa_updated',
    OFFLINE_FALLBACK: 'offline_fallback',
    CACHE_HIT: 'cache_hit',
    CACHE_MISS: 'cache_miss',
    SYNC_COMPLETE: 'sync_complete',
    SYNC_FAILED: 'sync_failed',
    INSTALL_PROMPT_SHOWN: 'install_prompt_shown',
    INSTALL_PROMPT_ACCEPTED: 'install_prompt_accepted',
    INSTALL_PROMPT_DISMISSED: 'install_prompt_dismissed',
} as const
