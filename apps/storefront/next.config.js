/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Fix the warning: Move cacheComponents to the root
  cacheComponents: true, 

  // 2. Allow your custom domain for multi-tenant dev
  allowedDevOrigins: ['*.lesuto.local'], 

  images: {
    // 3. CRITICAL FIX: Disable optimization in development
    // This bypasses the "private ip" security check that blocks localhost images
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