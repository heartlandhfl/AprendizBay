import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Default ".next" for Vercel and local dev. Hostinger static deploys use
  // `npm run build:hostinger` to output committed `hostinger-next/`.
  distDir: process.env.HOSTINGER_BUILD ? "hostinger-next" : ".next",
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
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
  webpack: (config, { dev }) => {
    if (!dev) {
      // Production builds must not emit fictional tutor fixtures, even as
      // unused async chunks. Tests and `next dev` keep the real modules.
      const emptyMocks = path.join(rootDir, "lib/tutors/empty-mock-stub.ts");
      const emptyProfiles = path.join(rootDir, "lib/tutors/empty-profile-stub.ts");
      config.resolve.alias = {
        ...config.resolve.alias,
        [path.join(rootDir, "lib/mock-tutors.ts")]: emptyMocks,
        [path.join(rootDir, "lib/mock-tutors")]: emptyMocks,
        "@/lib/mock-tutors": emptyMocks,
        [path.join(rootDir, "lib/tutor-profiles.ts")]: emptyProfiles,
        [path.join(rootDir, "lib/tutor-profiles")]: emptyProfiles,
        "@/lib/tutor-profiles": emptyProfiles,
      };
    }
    return config;
  },
};

export default nextConfig;
