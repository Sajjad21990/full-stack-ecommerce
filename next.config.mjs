/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Disable static generation for dynamic pages during build on Railway
    isrMemoryCacheSize: 0,
  },
  // Skip type checking during Railway build if needed
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default nextConfig