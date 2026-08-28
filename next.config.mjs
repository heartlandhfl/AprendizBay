/** @type {import('next').NextConfig} */
const nextConfig = {
  // Must not be gitignored: Hostinger copies hbuilds using gitignore, so
  // `.next` never reaches the runtime folder. `npm run build` writes here.
  distDir: "hostinger-next",
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
