/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hostinger wraps Next apps with standalone output; set it here so a
  // standalone server is produced even if that wrap is skipped.
  output: "standalone",
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
