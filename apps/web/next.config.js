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
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // 將 Node.js 專用包標記為外部包，避免被打包到客戶端
  serverComponentsExternalPackages: ['redis'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 客戶端構建時，將 redis 標記為外部包
      config.resolve.fallback = {
        ...config.resolve.fallback,
        redis: false,
      }
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
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
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
    // HTML Pages - Network First
    {
      urlPattern: /^https?:\/\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'plms-pages-v1',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60, // 1 hour
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

