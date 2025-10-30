/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // 🚀 Ensure all /auth routes run purely client-side
  async headers() {
    return [
      {
        source: "/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },

  // Disable static optimization for /auth pages (force dynamic render)
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },

  // Optional: ensure standalone build for Vercel Edge compatibility
  output: "standalone",
};

export default nextConfig;
