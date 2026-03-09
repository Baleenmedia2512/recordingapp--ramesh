/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  // Capacitor compatibility
  trailingSlash: true,
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  // Expose environment variables to the client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_LMS_URL: process.env.NEXT_PUBLIC_LMS_URL,
    NEXT_PUBLIC_LMS_API_KEY: process.env.NEXT_PUBLIC_LMS_API_KEY,
    NEXT_PUBLIC_LMS_ENABLED: process.env.NEXT_PUBLIC_LMS_ENABLED,
  },
}

module.exports = nextConfig
