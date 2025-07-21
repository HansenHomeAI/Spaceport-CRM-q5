/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Commented out for development
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  // distDir: 'out', // Commented out for development
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true
  },
  experimental: {
    esmExternals: false
  }
}

export default nextConfig
