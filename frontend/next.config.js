/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // API configuration for backend connection
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*', // Backend API URL
      },
    ];
  },

  // Environment variables for client side
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
    APP_NAME: 'ParkarLabs',
    APP_VERSION: '1.0.0',
  },

  // Image optimization
  images: {
    domains: ['localhost'],
  },

  // Build configuration
  output: 'standalone',
};

module.exports = nextConfig;
