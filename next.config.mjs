/** @type {import('next').NextConfig} */
const nextConfig = {
  // Default ".next" for Vercel and local dev. Hostinger static deploys use
  // `npm run build:hostinger` to output committed `hostinger-next/`.
  distDir: process.env.HOSTINGER_BUILD ? "hostinger-next" : ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
