import type { Metadata, Viewport } from 'next'

/**
 * SEO & Metadata Configuration
 *
 * Centralized metadata configuration for the entire application.
 * This ensures consistent SEO across all pages and proper App Store optimization.
 */

// ============================================================================
// App Information
// ============================================================================

const APP_NAME = 'PLMS'
const APP_TITLE = 'PLMS - AI 智慧學習輔助系統'
const APP_DESCRIPTION = '運用 AI 技術打造的個人化學習管理系統，提供智能題目解析、錯題本管理、戰鬥模式練習等功能，讓學習變得更有效率、更有趣'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://plms.app'
const APP_KEYWORDS = [
  'AI學習',
  '智能家教',
  '題目解析',
  '錯題本',
  '學習輔助',
  '個人化學習',
  '戰鬥模式',
  'PLMS',
  '知識點練習',
  '學習管理系統',
]

// ============================================================================
// Default Metadata
// ============================================================================

export const defaultMetadata: Metadata = {
  metadataBase: new URL(APP_URL),

  // Basic metadata
  title: {
    default: APP_TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,

  // Application info
  applicationName: APP_NAME,
  authors: [{ name: 'PLMS Team' }],
  generator: 'Next.js',
  keywords: APP_KEYWORDS,
  referrer: 'origin-when-cross-origin',
  creator: 'PLMS Team',
  publisher: 'PLMS',

  // Format detection
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: APP_URL,
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: APP_TITLE,
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
    creator: '@plms_app',
  },

  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  // Manifest
  manifest: '/manifest.json',

  // Other metadata
  category: 'education',
  classification: 'Education',
}

// ============================================================================
// Viewport Configuration
// ============================================================================

export const defaultViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF6E9' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
}

// ============================================================================
// Apple Web App Configuration
// ============================================================================

export const appleWebAppMetadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
  },
}

// ============================================================================
// Page-specific Metadata Generators
// ============================================================================

/**
 * Generate metadata for specific pages
 */
export const pageMetadata = {
  home: {
    title: '首頁',
    description: '歡迎來到 PLMS，開始您的智慧學習之旅',
  },
  play: {
    title: '練習模式',
    description: '透過戰鬥模式和知識點練習，提升學習效率',
  },
  ask: {
    title: '提問解析',
    description: 'AI 智能題目解析，立即獲得詳細解答',
  },
  backpack: {
    title: '背包',
    description: '管理您的學習資料和錯題本',
  },
  profile: {
    title: '個人檔案',
    description: '查看學習進度和成就',
  },
  community: {
    title: '社群',
    description: '與其他學習者交流互動',
  },
  store: {
    title: '商店',
    description: '探索更多學習資源和題目包',
  },
} as const

/**
 * Merge page-specific metadata with defaults
 */
export function createPageMetadata(
  page: keyof typeof pageMetadata
): Metadata {
  const pageData = pageMetadata[page]
  return {
    title: pageData.title,
    description: pageData.description,
    openGraph: {
      title: `${pageData.title} | ${APP_NAME}`,
      description: pageData.description,
    },
    twitter: {
      title: `${pageData.title} | ${APP_NAME}`,
      description: pageData.description,
    },
  }
}

// ============================================================================
// Robots Configuration
// ============================================================================

export const robotsConfig: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
}

// ============================================================================
// Verification
// ============================================================================

export const verificationConfig: Metadata['verification'] = {
  // Add your verification tokens here when you have them
  // google: 'your-google-verification-token',
  // yandex: 'your-yandex-verification-token',
  // bing: 'your-bing-verification-token',
}
