import type { NextConfig } from "next";
import path from "path";

/**
 * Turbopack's dev filesystem cache (`.next/dev/cache/turbopack`) survives a
 * dev-server restart — it is restored from disk. When its route tree goes
 * stale, dynamic routes 404 even though the source is fine; the
 * `/dashboard/aiagents/[chatbotId]/*` subtree was the last victim.
 *
 * Run `npm run clean` to reset it. To disable the cache entirely, set
 * `experimental.turbopackFileSystemCacheForDev: false` — at the cost of a
 * noticeably slower dev-server startup.
 *
 * Never run `next build` while `next dev` is running: the production build
 * writes into the same `.next` directory and muddies the dev cache.
 */
const nextConfig: NextConfig = {
  // Required for Coolify/Docker deployment — generates a self-contained
  // .next/standalone directory that includes only what's needed to run.
  output: "standalone",

  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  turbopack: {
    root: path.resolve("."),
  },
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },

  // Allow images from Cloudinary and other external sources
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

