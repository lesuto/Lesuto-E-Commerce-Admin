/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 1. MUST be inside 'experimental' object
    cacheComponents: true,
  },

  // 2. MUST list exact domains (Wildcards like *.local do NOT work here)
  allowedDevOrigins: [
    'shop.lesuto.local:3000',
    'shop.lesuto.local:3001',
    'hpm.shop.lesuto.local:3000',
    'hpm.shop.lesuto.local:3001',
    'bhd.shop.lesuto.local:3000',
    'bhd.shop.lesuto.local:3001',
  ],

  images: {
    // 3. Disables security check for localhost images
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
    ],
  },
};

module.exports = nextConfig;