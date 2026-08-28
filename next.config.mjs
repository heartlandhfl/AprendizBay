/** @type {import('next').NextConfig} */
const nextConfig = {
  // Custom Express server (`server.js`) is the process Hostinger starts.
  // Do not use `output: "standalone"` — that emits a second server.js and
  // conflicts with the Express entry file.
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
