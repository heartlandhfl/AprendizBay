/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not set output: "standalone" here. Hostinger's Next.js preset wraps
  // this file and injects standalone itself. Setting it in-repo produces
  // .next/standalone/server.js, which their Express detector treats as the
  // app entry and then fails because this is not an Express project.
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
