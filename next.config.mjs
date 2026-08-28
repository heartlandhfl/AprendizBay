/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hostinger's runtime copy drops gitignored `.next`. Output goes here;
  // attach-next.js runs `next build` on first start if the folder is missing.
  distDir: "hostinger-next",
  eslint: {
    ignoreDuringBuilds: true,
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
