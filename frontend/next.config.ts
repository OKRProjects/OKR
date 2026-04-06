import type { NextConfig } from "next";

/** Proxy /api to Flask so the browser calls same-origin /api (session cookie works). Docker: BACKEND_URL=http://backend:5001 */
const backend = process.env.BACKEND_URL || "http://127.0.0.1:5001";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backend.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's.gravatar.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.gravatar.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.auth0.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
