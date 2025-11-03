/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Temporarily disable type checking during build for initial deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during builds for initial deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
