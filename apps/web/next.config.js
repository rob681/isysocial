const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@isysocial/api", "@isysocial/db", "@isysocial/shared"],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
    outputFileTracingIncludes: {
      "/**": ["apps/web/generated/prisma/*.node"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
    ],
    // Generate WebP/AVIF formats automatically — faster loading
    formats: ["image/avif", "image/webp"],
    // Aggressive caching for external images (24h browser + CDN)
    minimumCacheTTL: 86400,
  },
  async headers() {
    // Isysocial needs broader img-src and connect-src for social network APIs
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Social network CDNs for media previews
      "img-src 'self' data: blob: https://*.supabase.co https://*.cdninstagram.com https://*.fbcdn.net https://media.giphy.com https://media0.giphy.com https://media1.giphy.com https://media2.giphy.com https://media3.giphy.com https://media4.giphy.com https://lh3.googleusercontent.com",
      // Social network APIs + Giphy
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.giphy.com https://graph.facebook.com https://graph.instagram.com https://api.twitter.com https://api.x.com https://api.linkedin.com https://www.googleapis.com https://vitals.vercel-insights.com",
      // Stripe payment iframe
      "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com",
      // Allow media from Supabase and blob for video editor
      "media-src 'self' blob: https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      // Security headers on all routes
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
      // Long-term caching for Next.js static assets (JS/CSS bundles with hashed names)
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache optimized images for 7 days
      {
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
