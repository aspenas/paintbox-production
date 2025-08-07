/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Production deployment configuration
  output: 'standalone',
  trailingSlash: false,
  // Environment variables for production
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://paintbox-api.railway.app',
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // Server externals
  serverExternalPackages: [
    'ioredis',
    '@aws-sdk/client-secrets-manager',
    'jsonwebtoken',
    'bcryptjs'
  ],
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        crypto: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
