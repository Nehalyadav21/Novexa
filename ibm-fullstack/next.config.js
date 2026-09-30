/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com', 'avatars.githubusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  eslint: {
    // This will reduce build failures from warnings
    ignoreDuringBuilds: false,
  },
  // Environment variables for client-side access
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    // Automatically disable Socket.IO on Vercel deployments
    NEXT_PUBLIC_DISABLE_SOCKETIO: process.env.VERCEL ? 'true' : process.env.NEXT_PUBLIC_DISABLE_SOCKETIO,
  },
  // Optimize for Vercel deployment
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Handle large bundles
  webpack: (config, { isServer }) => {
    // Increase the limit for warnings about large bundles
    config.performance = {
      ...config.performance,
      maxAssetSize: 1000000, // 1MB
      maxEntrypointSize: 1000000, // 1MB
    };
    
    // Optimize for server and client builds
    if (!isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          maxSize: 500000, // 500KB
        },
      };
    }

    return config;
  },
};

module.exports = nextConfig;
