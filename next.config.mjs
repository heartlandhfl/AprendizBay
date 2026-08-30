/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hostinger copies git-tracked files into hbuilds. Keep this folder
  // committed (except cache/) so BUILD_ID exists at runtime.
  // Vercel expects the default ".next" output directory.
  distDir: process.env.VERCEL ? ".next" : "hostinger-next",
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
