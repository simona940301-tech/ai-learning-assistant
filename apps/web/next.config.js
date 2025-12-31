import fs from 'fs'
import path from 'path'
import withPWA from 'next-pwa'

// Load shared env from repository root
const repoRoot = path.resolve(process.cwd(), '..', '..')
const sharedEnvFiles = ['.env.local', '.env']
const hydrateEnvFromFile = (fullPath) => {
  if (!fs.existsSync(fullPath)) return
  const content = fs.readFileSync(fullPath, 'utf-8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq === -1) return
    const key = trimmed.slice(0, eq).trim()
    if (!key || process.env[key]) return
    const rawValue = trimmed.slice(eq + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    process.env[key] = value
  })
}

sharedEnvFiles.forEach((file) => {
  const fullPath = path.join(repoRoot, file)
  hydrateEnvFromFile(fullPath)
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 🚀 SOTA: Compiler Optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 🚀 SOTA: Modular Imports (減少 bundle 大小)
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  experimental: {
    // Increase body size limit for Server Actions (default is 1MB)
    // Note: This does NOT affect API Routes (App Router) which are limited by the platform (Vercel: 4.5MB)
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Ensure native deps stay external so Vercel can use prebuilt binaries
    serverComponentsExternalPackages: ['sharp'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side: exclude server-only packages
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        redis: false,
      }
    } else {
      // Server-side: externalize canvas to avoid bundling native module
      // This allows pdfjs-dist to optionally require canvas at runtime without breaking build
      if (!config.externals) {
        config.externals = []
      }

      // Add canvas as an external module for server builds
      if (Array.isArray(config.externals)) {
        config.externals.push('canvas')
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals
        config.externals = async (context, request, callback) => {
          if (request === 'canvas') {
            return callback(null, `commonjs canvas`)
          }
          return originalExternals(context, request, callback)
        }
      }

      // ✅ 修復：確保 pdf-parse 內部的 pdfjs-dist 不會被 Webpack 錯誤解析
      // pdf-parse@1.1.1 內部包含舊版 pdfjs-dist，需要確保它使用自己的版本
      // 設置 resolve.alias 確保 pdf-parse 內部的 pdfjs-dist 不會被解析到外部存根
      if (!config.resolve.alias) {
        config.resolve.alias = {}
      }
      // 不設置 pdfjs-dist 的 alias，讓 pdf-parse 使用自己內部的版本
      // 這確保 pdf-parse/lib/pdf.js/v1.9.426/build/pdf.js 不會被解析到外部存根
    }

    return config
  },
  images: {
    domains: [
      'api.dicebear.com',
      'umzqjgxsetsmwzhniemw.supabase.co', // Supabase storage
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // 🚀 SOTA: 優化頁面緩存（提升開發體驗和性能）
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 60 秒（從 25 秒提升）
    pagesBufferLength: 5, // 緩存 5 個頁面（從 2 個提升）
  },
  // 🚀 SOTA: CORS Headers - REMOVED
  // Global CORS headers have been removed to avoid conflicts with route-level cors.ts
  // 
  // WHY: Browser spec FORBIDS `Access-Control-Allow-Origin: *` with `Credentials: true`
  // Our cors.ts implements dynamic origin reflection which is spec-compliant
  // Global headers here would override route-level configuration
  // 
  // CORS is now handled by:
  // - apps/web/lib/api/cors.ts (dynamic origin reflection)
  // - Individual API routes using corsJsonResponse()
  async headers() {
    return []
  },
}

// PWA Configuration
const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Images - Cache First
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'plms-images-v1',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // Fonts - Cache First
    {
      urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'plms-fonts-v1',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    // Supabase API - Network First
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'plms-api-v1',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
    // Supabase Storage - Cache First
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'plms-storage-v1',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    // Google Fonts - Cache First
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'plms-google-fonts-v1',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    // Static JS/CSS - Stale While Revalidate
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'plms-static-v1',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    // 🚀 SOTA: HTML Pages - Stale While Revalidate (二次訪問 0ms)
    {
      urlPattern: /^https?:\/\/.*/i,
      handler: 'StaleWhileRevalidate', // 從 NetworkFirst 升級
      options: {
        cacheName: 'plms-pages-v2', // 版本升級
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // 只緩存成功的響應
              return response.status === 200 ? response : null
            },
          },
        ],
        expiration: {
          maxEntries: 50, // 增加緩存數量
          maxAgeSeconds: 24 * 60 * 60, // 24 小時
        },
      },
    },
  ],
  fallbacks: {
    document: '/offline',
  },
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
})

export default pwaConfig(nextConfig)
