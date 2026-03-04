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
  distDir: 'out',
  // Ensure environment variables are embedded at build time
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wkwrrdcjknvupwsfdjtd.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrd3JyZGNqa252dXB3c2ZkanRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDI2OTIsImV4cCI6MjA4MzQxODY5Mn0.nMYFs8RtopRXN5MzDHfsMIiFoTbwTloACdgpIWk3UgA',
    NEXT_PUBLIC_LMS_URL: process.env.NEXT_PUBLIC_LMS_URL || '',
    NEXT_PUBLIC_LMS_API_KEY: process.env.NEXT_PUBLIC_LMS_API_KEY || '',
    NEXT_PUBLIC_LMS_ENABLED: process.env.NEXT_PUBLIC_LMS_ENABLED || 'false',
    NEXT_PUBLIC_LEAD_MANAGEMENT_ENABLED: process.env.NEXT_PUBLIC_LEAD_MANAGEMENT_ENABLED || 'true',
  },
  // Webpack configuration for mobile build optimization
  webpack: (config, { isServer }) => {
    // Exclude server-only modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
