/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    cacheComponents: true,
  },

  // This is correct for Next.js 14+ (it moved from 'experimental' to root)
  allowedDevOrigins: [
    'shop.lesuto.local:3000',
    'shop.lesuto.local:3001',
    'hpm.shop.lesuto.local:3000',
    'hpm.shop.lesuto.local:3001',
    'bhd.shop.lesuto.local:3000',
    'bhd.shop.lesuto.local:3001',
  ],

  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/assets/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/assets/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com', // Wildcard for all your S3 buckets
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;